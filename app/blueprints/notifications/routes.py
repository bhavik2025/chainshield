from flask import Blueprint, jsonify
from flask_login import login_required

notifications_bp = Blueprint("notifications", __name__)


@notifications_bp.route("/")
@login_required
def index():
    # TODO: in-app notification feed (Flask-SocketIO push, next phase)
    return jsonify({"module": "notifications", "status": "scaffolded"})
