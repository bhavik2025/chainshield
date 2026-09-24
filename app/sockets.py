"""
Socket.IO event handlers.

Every logged-in browser tab joins a personal room ("user_<id>") on connect,
which is how notifications and chat messages are delivered to the right
person. Broadcast events ("shipments_updated", "disruption_new") go to all
connected clients so the live map and dashboards refresh themselves.
"""
from flask_login import current_user
from flask_socketio import join_room

from app.extensions import socketio
from app.services.notifier import user_room


@socketio.on("connect")
def handle_connect(auth=None):
    if not current_user.is_authenticated:
        return False  # reject anonymous socket connections
    join_room(user_room(current_user.id))
    return True
