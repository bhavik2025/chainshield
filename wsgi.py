"""
Entry point used by `flask run`, `python wsgi.py`, Docker, and Gunicorn (`gunicorn wsgi:app`).
"""
import os

from dotenv import load_dotenv

load_dotenv()  # read .env before config.py reads os.environ (flask run does this itself)

from app import create_app  # noqa: E402
from app.extensions import socketio  # noqa: E402

app = create_app(os.environ.get("FLASK_CONFIG", "development"))

if __name__ == "__main__":
    # `python wsgi.py` — runs the Socket.IO-aware dev server (websockets via simple-websocket).
    socketio.run(
        app,
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
        debug=app.config.get("DEBUG", False),
        allow_unsafe_werkzeug=True,
    )
