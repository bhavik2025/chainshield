from flask import Blueprint, render_template, jsonify, request, current_app
from flask_login import login_required, current_user

from app.services.assistant import ask

assistant_bp = Blueprint("assistant", __name__)


@assistant_bp.route("/")
@login_required
def index():
    return render_template("assistant/index.html", gemini_enabled=bool(current_app.config.get("GEMINI_API_KEY")))


@assistant_bp.route("/ask", methods=["POST"])
@login_required
def ask_question():
    data = request.get_json(silent=True) or {}
    question = (data.get("question") or "").strip()[:1000]
    if not question:
        return jsonify({"error": "Please type a question."}), 400
    history = data.get("history") if isinstance(data.get("history"), list) else []
    return jsonify(ask(current_user, question, history))
