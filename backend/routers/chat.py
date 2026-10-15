"""
Chat router — direct messaging between users via 5-digit chat numbers.

Endpoints:
  POST   /api/chat/send          — send a message to a chat number
  GET    /api/chat/inbox         — get all messages I received (+ sent)
  GET    /api/chat/search?q=     — find a user by chat number (exact) or name (fuzzy)
  PATCH  /api/chat/read/{msg_id} — mark a single message as read
  PATCH  /api/chat/read-all      — mark all my received messages as read
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, schemas
from auth import require_any

router = APIRouter(prefix="/api/chat", tags=["chat"])


# ── Send ──────────────────────────────────────────────────────
@router.post("/send", response_model=schemas.MessageOut)
def send_message(
    body: schemas.SendMessageRequest,
    current_user: models.User = Depends(require_any),
    db: Session = Depends(get_db),
):
    receiver = db.query(models.User).filter(
        models.User.chat_number == body.receiver_chat_number
    ).first()
    if not receiver:
        raise HTTPException(404, f"No user found with chat number {body.receiver_chat_number}.")
    if receiver.id == current_user.id:
        raise HTTPException(400, "You cannot send a message to yourself.")

    msg = models.Message(
        id=f"MSG-{uuid.uuid4().hex[:10].upper()}",
        sender_id=current_user.id,
        receiver_id=receiver.id,
        sender_name=current_user.name,
        sender_chat_number=current_user.chat_number,
        content=body.content.strip(),
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


# ── Inbox ─────────────────────────────────────────────────────
@router.get("/inbox", response_model=List[schemas.MessageOut])
def inbox(
    current_user: models.User = Depends(require_any),
    db: Session = Depends(get_db),
):
    """Returns all messages sent to OR by me, newest first."""
    msgs = db.query(models.Message).filter(
        (models.Message.sender_id == current_user.id) |
        (models.Message.receiver_id == current_user.id)
    ).order_by(models.Message.created_at.desc()).all()
    return msgs


# ── Search user by chat number or name ───────────────────────
@router.get("/search", response_model=List[schemas.ChatUserOut])
def search_user(
    q: str = Query(..., min_length=1),
    current_user: models.User = Depends(require_any),
    db: Session = Depends(get_db),
):
    """
    If q is exactly 5 digits — search by chat number.
    Otherwise — case-insensitive name search (first 10 results).
    """
    q = q.strip()
    if q.isdigit() and len(q) == 5:
        users = db.query(models.User).filter(
            models.User.chat_number == q,
            models.User.id != current_user.id,
        ).all()
    else:
        pattern = f"%{q}%"
        users = db.query(models.User).filter(
            models.User.name.ilike(pattern),
            models.User.id != current_user.id,
        ).limit(10).all()
    return users


# ── Mark single message read ──────────────────────────────────
@router.patch("/read/{msg_id}", response_model=schemas.MessageOut)
def mark_read(
    msg_id: str,
    current_user: models.User = Depends(require_any),
    db: Session = Depends(get_db),
):
    msg = db.query(models.Message).filter(models.Message.id == msg_id).first()
    if not msg:
        raise HTTPException(404, "Message not found.")
    if msg.receiver_id != current_user.id:
        raise HTTPException(403, "Not your message.")
    msg.read = True
    db.commit()
    db.refresh(msg)
    return msg


# ── Mark all received messages as read ───────────────────────
@router.patch("/read-all")
def mark_all_read(
    current_user: models.User = Depends(require_any),
    db: Session = Depends(get_db),
):
    db.query(models.Message).filter(
        models.Message.receiver_id == current_user.id,
        models.Message.read == False,
    ).update({"read": True})
    db.commit()
    return {"ok": True}
