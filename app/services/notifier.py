"""
Notification service — stores a Notification row per recipient and pushes it
to that user's personal Socket.IO room ("user_<id>") in real time.
"""
from app.extensions import db, socketio
from app.models import Notification, User


def user_room(user_id: int) -> str:
    return f"user_{user_id}"


def notify_users(user_ids, message: str, commit: bool = True):
    """Create one notification per user id and push it live. Returns the rows."""
    rows = []
    for uid in sorted(set(u for u in user_ids if u)):
        n = Notification(user_id=uid, message=message[:255])
        db.session.add(n)
        rows.append(n)
    if commit:
        db.session.commit()
    else:
        db.session.flush()

    for n in rows:
        socketio.emit(
            "notification",
            {"id": n.id, "message": n.message, "created_at": n.created_at.strftime("%d/%m %H:%M") if n.created_at else ""},
            to=user_room(n.user_id),
        )
    return rows


def notify_roles(roles, message: str, extra_user_ids=(), commit: bool = True):
    """Notify every user holding one of `roles`, plus any extra user ids."""
    ids = [u.id for u in User.query.filter(User.role.in_(roles)).all()]
    ids.extend(extra_user_ids)
    return notify_users(ids, message, commit=commit)
