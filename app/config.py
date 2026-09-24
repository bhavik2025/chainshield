import os
from datetime import timedelta

basedir = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))


class BaseConfig:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-change-me")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    PERMANENT_SESSION_LIFETIME = timedelta(hours=8)

    # Risk engine
    RISK_SCAN_INTERVAL_SECONDS = int(os.environ.get("RISK_SCAN_INTERVAL_SECONDS", 60))
    RISK_WEIGHT_WEATHER = 0.40
    RISK_WEIGHT_CONGESTION = 0.25
    RISK_WEIGHT_CARGO = 0.20
    RISK_WEIGHT_HISTORY = 0.15

    # External APIs (optional — services fall back to simulated data if unset)
    OPENWEATHER_API_KEY = os.environ.get("OPENWEATHER_API_KEY", "")
    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
    GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

    # Live simulation: each risk scan nudges in-transit shipments toward their
    # destination hub, so the live map actually moves during a demo.
    SIMULATE_MOVEMENT = os.environ.get("SIMULATE_MOVEMENT", "true").lower() == "true"
    MOVEMENT_STEP_DEG = float(os.environ.get("MOVEMENT_STEP_DEG", 0.15))

    # Socket.IO concurrency model. "threading" works with `flask run` /
    # `python wsgi.py` on any OS; production (Gunicorn + eventlet) overrides it.
    SOCKETIO_ASYNC_MODE = os.environ.get("SOCKETIO_ASYNC_MODE", "threading")


class DevelopmentConfig(BaseConfig):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", f"sqlite:///{os.path.join(basedir, 'instance', 'chainshield.db')}"
    )


class TestingConfig(BaseConfig):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    WTF_CSRF_ENABLED = False
    SIMULATE_MOVEMENT = False


class ProductionConfig(BaseConfig):
    DEBUG = False
    SOCKETIO_ASYNC_MODE = os.environ.get("SOCKETIO_ASYNC_MODE", "eventlet")
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", f"sqlite:///{os.path.join(basedir, 'instance', 'chainshield.db')}"
    )


config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}
