import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, schemas
from auth import get_current_user, require_manager, require_any
from services.route import build_waypoints, interpolate_position

router = APIRouter(prefix="/api/shipments", tags=["shipments"])


def _shipment_to_dict(s: models.Shipment) -> dict:
    return {
        "id": s.id, "name": s.name, "cargo": s.cargo, "mode": s.mode,
        "status": s.status,
        "origin":      {"city": s.origin_city,   "country": s.origin_country,   "lat": s.origin_lat,   "lng": s.origin_lng},
        "destination": {"city": s.dest_city,      "country": s.dest_country,     "lat": s.dest_lat,     "lng": s.dest_lng},
        "currentPos":  {"lat": s.current_lat, "lng": s.current_lng} if s.current_lat else None,
        "progress": s.progress, "eta": s.eta, "departureDate": s.departure_date,
        "carrier": s.carrier, "weight": s.weight, "value": s.value,
        "description": s.description,
        "operatorId": s.operator_id, "createdBy": s.created_by,
        "disruptionId": s.disruption_id,
        "waypoints": s.waypoints,
        "appliedSolution": s.applied_solution,
        "riskScore": s.risk_score or 0,
        "createdAt": s.created_at.isoformat() if s.created_at else None,
    }


def _log(db, user, action, entity_id, details):
    db.add(models.ActivityLog(
        id=f"LOG-{uuid.uuid4().hex[:8].upper()}",
        user_id=user.id, user_name=user.name, role=user.role,
        action=action, entity="Shipment", entity_id=entity_id, details=details,
    ))


@router.get("", response_model=List[dict])
def list_shipments(
    current_user: models.User = Depends(require_any),
    db: Session = Depends(get_db),
):
    # Operators only see their own shipment
    if current_user.role == "operator":
        ships = db.query(models.Shipment).filter(models.Shipment.operator_id == current_user.id).all()
    else:
        ships = db.query(models.Shipment).all()
    return [_shipment_to_dict(s) for s in ships]


@router.post("", response_model=dict)
def create_shipment(
    body: schemas.ShipmentCreate,
    current_user: models.User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    ship_id = f"SHP-{uuid.uuid4().hex[:8].upper()}"

    # Build waypoints
    wps = body.waypoints or build_waypoints(
        {"lat": body.origin.lat, "lng": body.origin.lng},
        {"lat": body.destination.lat, "lng": body.destination.lng},
        body.mode,
    )

    ship = models.Shipment(
        id=ship_id, name=body.name, cargo=body.cargo, mode=body.mode,
        status="on_time",
        origin_city=body.origin.city,    origin_country=body.origin.country,
        origin_lat=body.origin.lat,      origin_lng=body.origin.lng,
        dest_city=body.destination.city, dest_country=body.destination.country,
        dest_lat=body.destination.lat,   dest_lng=body.destination.lng,
        current_lat=body.origin.lat, current_lng=body.origin.lng,
        progress=0, eta=body.eta, departure_date=body.departure_date,
        carrier=body.carrier, operator_id=body.operator_id,
        created_by=current_user.id,
        weight=body.weight, value=body.value or 0,
        description=body.description,
    )
    ship.waypoints = wps
    db.add(ship)

    # Assign shipment to operator
    if body.operator_id:
        op = db.query(models.User).filter(models.User.id == body.operator_id).first()
        if op:
            op.shipment_id = ship_id

    _log(db, current_user, "CREATE_SHIPMENT", ship_id,
         f'Created "{body.name}" ({body.mode.upper()} · {body.origin.city} → {body.destination.city})')
    db.commit()
    db.refresh(ship)
    return _shipment_to_dict(ship)


@router.get("/{ship_id}", response_model=dict)
def get_shipment(
    ship_id: str,
    current_user: models.User = Depends(require_any),
    db: Session = Depends(get_db),
):
    ship = db.query(models.Shipment).filter(models.Shipment.id == ship_id).first()
    if not ship:
        raise HTTPException(404, "Shipment not found")
    if current_user.role == "operator" and ship.operator_id != current_user.id:
        raise HTTPException(403, "Access denied")
    return _shipment_to_dict(ship)


@router.patch("/{ship_id}", response_model=dict)
def update_shipment(
    ship_id: str,
    body: schemas.ShipmentUpdate,
    current_user: models.User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    ship = db.query(models.Shipment).filter(models.Shipment.id == ship_id).first()
    if not ship:
        raise HTTPException(404, "Shipment not found")
    if body.status       is not None: ship.status        = body.status
    if body.progress     is not None: ship.progress      = body.progress
    if body.disruption_id is not None: ship.disruption_id = body.disruption_id
    if body.current_lat  is not None: ship.current_lat   = body.current_lat
    if body.current_lng  is not None: ship.current_lng   = body.current_lng
    db.commit()
    db.refresh(ship)
    return _shipment_to_dict(ship)


# ── Operator: update own shipment status ──────────────────────────────────────
OPERATOR_ALLOWED_STATUSES = {"on_time", "at_risk", "delayed", "delivered"}
LOCKED_STATUSES           = {"disrupted"}   # manager must resolve first

@router.patch("/{ship_id}/operator-status", response_model=dict)
def operator_update_status(
    ship_id: str,
    body: schemas.OperatorStatusUpdate,
    current_user: models.User = Depends(require_any),
    db: Session = Depends(get_db),
):
    """Operators (and managers/admins) can push a status update on a shipment."""
    ship = db.query(models.Shipment).filter(models.Shipment.id == ship_id).first()
    if not ship:
        raise HTTPException(404, "Shipment not found")

    # Operators can only touch their own shipment
    if current_user.role == "operator" and ship.operator_id != current_user.id:
        raise HTTPException(403, "You are not assigned to this shipment")

    # Cannot change status while disrupted — manager must resolve first
    if ship.status in LOCKED_STATUSES:
        raise HTTPException(409, "Shipment is currently disrupted. Your manager must resolve it before you can update the status.")

    # Validate the requested status
    if body.status not in OPERATOR_ALLOWED_STATUSES:
        raise HTTPException(422, f"Invalid status '{body.status}'. Allowed: {sorted(OPERATOR_ALLOWED_STATUSES)}")

    # Already delivered — terminal
    if ship.status == "delivered":
        raise HTTPException(409, "Shipment is already marked as delivered.")

    prev_status = ship.status
    ship.status = body.status

    if body.status == "delivered":
        ship.progress      = 100
        ship.disruption_id = None   # clear any lingering reference

    note_part = f" Note: {body.note}" if body.note else ""
    _log(db, current_user, "STATUS_UPDATED", ship_id,
         f'Status changed {prev_status} → {body.status} by {current_user.name}{note_part}')

    # When delivered: notify all managers so they see it on their dashboard
    if body.status == "delivered":
        managers = db.query(models.User).filter(
            models.User.role.in_(["manager", "admin"]),
            models.User.active == True,
        ).all()
        for mgr in managers:
            db.add(models.Notification(
                id=f"NOTIF-{uuid.uuid4().hex[:8].upper()}",
                user_id=mgr.id,
                type="delivery_confirmed",
                title=f"✅ Delivery Confirmed — {ship.name}",
                message=f"{current_user.name} has marked shipment {ship.id} as delivered.{note_part}",
                disruption_title=None,
                shipment_id=ship.id,
                read=False,
                _solution=None,
            ))

    db.commit()
    db.refresh(ship)
    return _shipment_to_dict(ship)
