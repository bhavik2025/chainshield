import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, schemas
from auth import require_admin, require_any

router = APIRouter(prefix="/api/admin", tags=["admin"])

_PROTECTED_EMAIL = "bhavik@gmail.com"


def _log(db, user, action, entity, entity_id, details):
    db.add(models.ActivityLog(
        id=f"LOG-{uuid.uuid4().hex[:8].upper()}",
        user_id=user.id, user_name=user.name, role=user.role,
        action=action, entity=entity, entity_id=entity_id, details=details,
    ))


# ── Users ──────────────────────────────────────────────────────
@router.get("/users", response_model=List[schemas.UserOut])
def list_users(
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return db.query(models.User).all()


@router.get("/operators", response_model=List[schemas.UserOut])
def list_operators(
    current_user: models.User = Depends(require_any),
    db: Session = Depends(get_db),
):
    """Returns all active operator accounts. Accessible to any authenticated user."""
    return db.query(models.User).filter(
        models.User.role == "operator",
        models.User.active == True,
    ).all()


@router.patch("/users/{user_id}", response_model=schemas.UserOut)
def update_user(
    user_id: str,
    body: schemas.UserUpdate,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    if user_id == current_user.id:
        raise HTTPException(400, "Cannot modify your own admin account.")
    if user.email == _PROTECTED_EMAIL:
        raise HTTPException(403, "The system admin account cannot be modified.")

    if body.active      is not None: user.active      = body.active
    if body.shipment_id is not None: user.shipment_id = body.shipment_id
    if body.role        is not None: user.role        = body.role

    if body.role is not None:
        action  = "ROLE_UPDATED"
        details = f"Role changed to {body.role}: {user.name} ({user.email})"
    elif body.active is True:
        action  = "ACTIVATE_USER"
        details = f"Activated account: {user.name} ({user.email})"
    else:
        action  = "DEACTIVATE_USER"
        details = f"Suspended account: {user.name} ({user.email})"

    _log(db, current_user, action, "User", user_id, details)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    if user_id == current_user.id:
        raise HTTPException(400, "Cannot delete your own account.")
    if user.email == _PROTECTED_EMAIL:
        raise HTTPException(403, "The system admin account cannot be deleted.")

    # Log before deleting (so we still have the user object)
    _log(db, current_user, "DELETE_USER", "User", user_id,
         f"Deleted account: {user.name} ({user.email}, {user.role})")

    # Remove all linked records first to avoid FK constraint errors
    db.query(models.Notification).filter(models.Notification.user_id == user_id).delete()
    db.query(models.ActivityLog).filter(models.ActivityLog.user_id == user_id).delete()
    db.query(models.Message).filter(
        (models.Message.sender_id == user_id) | (models.Message.receiver_id == user_id)
    ).delete(synchronize_session=False)

    # Un-assign any shipments so they don't become orphaned
    for ship in db.query(models.Shipment).filter(models.Shipment.operator_id == user_id).all():
        ship.operator_id = None

    db.delete(user)
    db.commit()
    return {"ok": True}


# ── Base cities ────────────────────────────────────────────────
@router.get("/base-cities", response_model=List[schemas.BaseCityOut])
def list_base_cities(db: Session = Depends(get_db)):
    return db.query(models.BaseCity).all()


@router.post("/base-cities", response_model=schemas.BaseCityOut)
def add_base_city(
    body: schemas.BaseCityCreate,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if db.query(models.BaseCity).filter(models.BaseCity.city == body.city).first():
        raise HTTPException(409, f"{body.city} is already an active hub.")
    city = models.BaseCity(city=body.city, country=body.country, lat=body.lat, lng=body.lng)
    db.add(city)
    _log(db, current_user, "ADD_BASE_CITY", "BaseCity", body.city,
         f"Added logistics hub: {body.city}, {body.country}")
    db.commit()
    db.refresh(city)
    return city


@router.delete("/base-cities/{city_name}")
def remove_base_city(
    city_name: str,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    city = db.query(models.BaseCity).filter(models.BaseCity.city == city_name).first()
    if not city:
        raise HTTPException(404, "Hub not found")
    _log(db, current_user, "REMOVE_BASE_CITY", "BaseCity", city_name,
         f"Removed logistics hub: {city_name}")
    db.delete(city)
    db.commit()
    return {"ok": True}


# ── Cargo types ────────────────────────────────────────────────
@router.get("/cargo-types", response_model=List[schemas.CargoTypeOut])
def list_cargo_types(db: Session = Depends(get_db)):
    return db.query(models.CargoType).all()


@router.post("/cargo-types", response_model=schemas.CargoTypeOut)
def add_cargo_type(
    body: dict,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    name = (body.get("name") or "").strip()
    if not name:
        raise HTTPException(400, "Name is required.")
    if db.query(models.CargoType).filter(models.CargoType.name == name).first():
        raise HTTPException(409, f"{name} already exists.")
    ct = models.CargoType(name=name)
    db.add(ct)
    _log(db, current_user, "ADD_CARGO_TYPE", "CargoType", name, f"Added cargo type: {name}")
    db.commit()
    db.refresh(ct)
    return ct


@router.delete("/cargo-types/{name}")
def remove_cargo_type(
    name: str,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    ct = db.query(models.CargoType).filter(models.CargoType.name == name).first()
    if not ct:
        raise HTTPException(404, "Cargo type not found")
    _log(db, current_user, "REMOVE_CARGO_TYPE", "CargoType", name, f"Removed cargo type: {name}")
    db.delete(ct)
    db.commit()
    return {"ok": True}


# ── Activity log ───────────────────────────────────────────────
@router.get("/activity-log", response_model=List[schemas.ActivityLogOut])
def get_activity_log(
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return db.query(models.ActivityLog).order_by(
        models.ActivityLog.timestamp.desc()
    ).limit(500).all()
