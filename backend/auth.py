"""
ChainShield - Authentication middleware
Supports BOTH Firebase ID tokens (primary) and legacy JWT (dev fallback).

Token resolution order:
  1. Try Firebase Admin SDK -> verify_firebase_token()
  2. If Firebase not configured or token is not a Firebase token -> try legacy JWT
  3. If neither works -> 401

This means seeded dev accounts (using legacy JWT) keep working even after
Firebase Auth is wired up on the frontend.
"""

import os, uuid, random
import bcrypt
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from database import get_db
import models

load_dotenv()

SECRET_KEY     = os.getenv("JWT_SECRET", "chainshield-dev-secret")
ALGORITHM      = os.getenv("JWT_ALGORITHM", "HS256")
EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))  # 24 hours

# Use HTTPBearer so we can inspect the raw token ourselves
_bearer = HTTPBearer(auto_error=False)


# -- Password helpers (direct bcrypt) ----------------------------------------
def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


# -- Legacy JWT helpers -------------------------------------------------------
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def _decode_jwt(token: str):
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


# -- Firebase token -> DB user lookup -----------------------------------------
def _gen_chat_number(db) -> str:
    for _ in range(200):
        num = str(random.randint(10000, 99999))
        if not db.query(models.User).filter(models.User.chat_number == num).first():
            return num
    raise RuntimeError("Could not generate unique chat number")


def _user_from_firebase(decoded: dict, db: Session):
    """
    Given a verified Firebase token, find or auto-create the DB user.
    Looks up by email; auto-provisions on first login.
    """
    email = decoded.get("email", "").lower()
    if not email:
        return None

    user = db.query(models.User).filter(models.User.email == email).first()
    if user:
        return user

    # Auto-provision: first-time Firebase user - create ChainShield account
    # Role defaults to 'operator'; admin can promote later
    chat_num = _gen_chat_number(db)
    user = models.User(
        id="USR-" + uuid.uuid4().hex[:8].upper(),
        name=decoded.get("name") or decoded.get("display_name") or email.split("@")[0],
        email=email,
        password_hash=hash_password(uuid.uuid4().hex),  # random unusable password
        role="operator",
        active=True,
        chat_number=chat_num,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# -- Core dependency: resolve token -> User -----------------------------------
def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: Session = Depends(get_db),
) -> models.User:
    if not creds or not creds.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = creds.credentials

    # Path 1: Firebase ID token
    try:
        from firebase_admin_init import verify_firebase_token
        decoded = verify_firebase_token(token)
        if decoded:
            user = _user_from_firebase(decoded, db)
            if user:
                if not user.active:
                    raise HTTPException(403, "Account deactivated. Contact your admin.")
                return user
    except ImportError:
        pass

    # Path 2: Legacy JWT
    payload = _decode_jwt(token)
    if payload:
        user_id = payload.get("sub")
        user = db.query(models.User).filter(models.User.id == user_id).first() if user_id else None
        if user:
            if not user.active:
                raise HTTPException(403, "Account deactivated. Contact your admin.")
            return user

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )


# -- Role guards --------------------------------------------------------------
def require_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    if current_user.role != "admin":
        raise HTTPException(403, "Admin access required")
    return current_user

def require_manager(current_user: models.User = Depends(get_current_user)) -> models.User:
    if current_user.role not in ("admin", "manager"):
        raise HTTPException(403, "Manager access required")
    return current_user

def require_any(current_user: models.User = Depends(get_current_user)) -> models.User:
    return current_user
