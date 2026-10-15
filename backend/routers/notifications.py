from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models
from auth import require_any

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


def _notif_to_dict(n: models.Notification) -> dict:
    return {
        "id": n.id, "userId": n.user_id, "type": n.type,
        "title": n.title, "message": n.message,
        "disruptionTitle": n.disruption_title,
        "shipmentId": n.shipment_id,
        "solution": n.solution,
        "read": n.read,
        "createdAt": n.created_at.isoformat() if n.created_at else None,
    }


@router.get("/mine", response_model=List[dict])
def my_notifications(
    current_user: models.User = Depends(require_any),
    db: Session = Depends(get_db),
):
    notifs = db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id
    ).order_by(models.Notification.created_at.desc()).all()
    return [_notif_to_dict(n) for n in notifs]


@router.patch("/{notif_id}/read")
def mark_read(
    notif_id: str,
    current_user: models.User = Depends(require_any),
    db: Session = Depends(get_db),
):
    notif = db.query(models.Notification).filter(
        models.Notification.id == notif_id,
        models.Notification.user_id == current_user.id,
    ).first()
    if notif:
        notif.read = True
        db.commit()
    return {"ok": True}
