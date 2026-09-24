"""Centralised Flask extension instances — imported by app/__init__.py and models.py."""
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_socketio import SocketIO
from flask_wtf import CSRFProtect
from apscheduler.schedulers.background import BackgroundScheduler

db = SQLAlchemy()
login_manager = LoginManager()
socketio = SocketIO()
csrf = CSRFProtect()
# UTC explicitly: all timestamps are stored as UTC, and tzlocal crashes on some
# machine timezone names (e.g. "Asia/Calcutta") if left to auto-detect.
scheduler = BackgroundScheduler(timezone="UTC")
