import uuid
import random
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
from auth import hash_password, verify_password, create_access_token, require_any
from services.route import build_waypoints

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _log(db, user_id, user_name, role, action, details):
    db.add(models.ActivityLog(
        id=f"LOG-{uuid.uuid4().hex[:8].upper()}",
        user_id=user_id, user_name=user_name, role=role,
        action=action, entity="User", entity_id=user_id, details=details,
    ))


def _gen_chat_number(db) -> str:
    """Generate a unique 5-digit chat number not already taken."""
    for _ in range(200):
        num = str(random.randint(10000, 99999))
        if not db.query(models.User).filter(models.User.chat_number == num).first():
            return num
    raise RuntimeError("Could not generate a unique chat number — DB might be full.")


@router.post("/register", response_model=schemas.TokenResponse)
def register(body: schemas.RegisterRequest, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == body.email.lower()).first():
        raise HTTPException(400, "An account with this email already exists.")

    # Prevent registering as admin via the public form
    role = body.role if body.role in ("manager", "operator") else "operator"

    user = models.User(
        id=f"USR-{uuid.uuid4().hex[:8].upper()}",
        name=body.name.strip(),
        email=body.email.strip().lower(),
        password_hash=hash_password(body.password),
        role=role,
        operator_type=body.operator_type,
        phone=body.phone,
        license_id=body.license_id,
        company=body.company,
        active=True,
        chat_number=_gen_chat_number(db),
    )
    db.add(user)
    _log(db, user.id, user.name, user.role, "REGISTER",
         f"New account: {user.name} ({user.role}{' · ' + user.operator_type if user.operator_type else ''})")
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id})
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.post("/login", response_model=schemas.TokenResponse)
def login(body: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == body.email.strip().lower()).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Invalid email or password.")
    if not user.active:
        raise HTTPException(403, "Account deactivated. Contact your admin.")

    _log(db, user.id, user.name, user.role, "LOGIN", f"{user.name} ({user.role}) logged in")
    db.commit()

    token = create_access_token({"sub": user.id})
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(require_any)):
    return current_user
