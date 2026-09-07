from flask import Blueprint, jsonify
from flask_login import login_required

chat_bp = Blueprint("chat", __name__)


@chat_bp.route("/")
@login_required
def index():
    # TODO: direct messaging between users (next development phase)
    return jsonify({"module": "chat", "status": "scaffolded"})
