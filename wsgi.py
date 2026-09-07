"""
Entry point used by `flask run`, Docker, and Gunicorn (`gunicorn wsgi:app`).
"""
import os

from app import create_app
from app.extensions import socketio

app = create_app(os.environ.get("FLASK_CONFIG", "development"))

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=app.config.get("DEBUG", False))
