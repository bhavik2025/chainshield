from flask import Blueprint, render_template, redirect, url_for, jsonify, request
from flask_login import login_required, current_user

from app.extensions import db
from app.models import Notification

notifications_bp = Blueprint("notifications", __name__)


@notifications_bp.route("/")
@login_required
def index():
    items = (
        Notification.query.filter_by(user_id=current_user.id)
        .order_by(Notification.created_at.desc()).limit(100).all()
    )
    return render_template("notifications/index.html", items=items)


@notifications_bp.route("/<int:notification_id>/read", methods=["POST"])
@login_required
def mark_read(notification_id):
    n = Notification.query.filter_by(id=notification_id, user_id=current_user.id).first_or_404()
    n.is_read = True
    db.session.commit()
    if request.accept_mimetypes.best == "application/json":
        return jsonify({"ok": True})
    return redirect(url_for("notifications.index"))


@notifications_bp.route("/read-all", methods=["POST"])
@login_required
def mark_all_read():
    Notification.query.filter_by(user_id=current_user.id, is_read=False).update({"is_read": True})
    db.session.commit()
    return redirect(url_for("notifications.index"))


@notifications_bp.route("/api/unread")
@login_required
def unread():
    rows = (
        Notification.query.filter_by(user_id=current_user.id, is_read=False)
        .order_by(Notification.created_at.desc()).limit(10).all()
    )
    return jsonify({
        "count": Notification.query.filter_by(user_id=current_user.id, is_read=False).count(),
        "items": [{"id": n.id, "message": n.message, "created_at": n.created_at.strftime("%d/%m %H:%M")} for n in rows],
    })
