from flask import Blueprint, jsonify
from flask_login import login_required

assistant_bp = Blueprint("assistant", __name__)


@assistant_bp.route("/")
@login_required
def index():
    # TODO: Gemini-powered AI assistant panel (next development phase)
    return jsonify({"module": "assistant", "status": "scaffolded"})
