"""
Direct messaging between users (managers <-> field operators, etc.).

Messages are sent with a CSRF-protected POST, stored in the `messages`
table, then pushed over Socket.IO to both participants' personal rooms, so
the conversation updates live in every open tab without polling.
"""
from flask import Blueprint, render_template, jsonify, request, abort
from flask_login import login_required, current_user

from app.extensions import db, socketio
from app.models import Message, User
from app.services.notifier import user_room

chat_bp = Blueprint("chat", __name__)

MAX_LEN = 2000


def chat_id_for(a: int, b: int) -> str:
    lo, hi = sorted((a, b))
    return f"{lo}-{hi}"


def serialize(m: Message) -> dict:
    return {
        "id": m.id,
        "chat_id": m.chat_id,
        "sender_id": m.sender_id,
        "receiver_id": m.receiver_id,
        "content": m.content,
        "sent_at": m.sent_at.strftime("%d/%m %H:%M"),
    }


def _contacts():
    users = User.query.filter(User.id != current_user.id).order_by(User.name).all()
    last = {}
    for m in (Message.query.filter(db.or_(Message.sender_id == current_user.id,
                                          Message.receiver_id == current_user.id))
              .order_by(Message.sent_at.desc()).all()):
        other = m.receiver_id if m.sender_id == current_user.id else m.sender_id
        last.setdefault(other, m)
    # recent conversations first, then everyone else alphabetically
    users.sort(key=lambda u: (u.id not in last, -(last[u.id].id if u.id in last else 0), u.name))
    return users, last


@chat_bp.route("/")
@login_required
def index():
    contacts, last = _contacts()
    return render_template("chat/index.html", contacts=contacts, last=last, peer=None, messages=[])


@chat_bp.route("/<int:user_id>")
@login_required
def conversation(user_id):
    peer = db.session.get(User, user_id)
    if not peer or peer.id == current_user.id:
        abort(404)
    contacts, last = _contacts()
    messages = (Message.query.filter_by(chat_id=chat_id_for(current_user.id, peer.id))
                .order_by(Message.sent_at.asc()).limit(300).all())
    return render_template("chat/index.html", contacts=contacts, last=last, peer=peer, messages=messages)


@chat_bp.route("/<int:user_id>/send", methods=["POST"])
@login_required
def send(user_id):
    peer = db.session.get(User, user_id)
    if not peer or peer.id == current_user.id:
        return jsonify({"error": "Unknown recipient"}), 404
    content = ((request.get_json(silent=True) or {}).get("content") or request.form.get("content") or "").strip()
    if not content:
        return jsonify({"error": "Message is empty"}), 400
    if len(content) > MAX_LEN:
        return jsonify({"error": f"Message is longer than {MAX_LEN} characters"}), 400

    m = Message(sender_id=current_user.id, receiver_id=peer.id,
                chat_id=chat_id_for(current_user.id, peer.id), content=content)
    db.session.add(m)
    db.session.commit()

    payload = serialize(m) | {"sender_name": current_user.name}
    socketio.emit("chat_message", payload, to=user_room(peer.id))
    socketio.emit("chat_message", payload, to=user_room(current_user.id))
    return jsonify(payload), 201
