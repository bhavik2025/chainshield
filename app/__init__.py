"""
ChainShield Transportation System — Flask application factory.

MCA Semester 3 rebuild. This is a brand-new codebase, independent of the
original FastAPI/React ChainShield prototype (kept untouched elsewhere).
"""
import os
from flask import Flask

from app.config import config_by_name
from app.extensions import db, login_manager, socketio, scheduler, csrf


def create_app(config_name=None):
    config_name = config_name or os.environ.get("FLASK_CONFIG", "development")

    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(config_by_name[config_name])

    os.makedirs(app.instance_path, exist_ok=True)

    register_extensions(app)
    register_blueprints(app)
    register_cli(app)

    @app.get("/health")
    def health_check():
        return {"status": "ok", "service": "chainshield-mca"}, 200

    return app


def register_extensions(app):
    db.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = "auth.login"
    login_manager.login_message_category = "warning"
    csrf.init_app(app)

    # async_mode comes from config: "eventlet" in production (matches the
    # Gunicorn eventlet worker in the Dockerfile, so real websockets are used),
    # "threading" in development so `flask run` / `python wsgi.py` work on
    # Windows, Linux and macOS alike.
    socketio.init_app(app, cors_allowed_origins="*", async_mode=app.config["SOCKETIO_ASYNC_MODE"])

    from app import sockets  # noqa: F401  (registers Socket.IO event handlers)

    from app.models import User

    @login_manager.user_loader
    def load_user(user_id):
        return db.session.get(User, int(user_id))

    @app.context_processor
    def inject_globals():
        from flask_login import current_user
        from app.models import Notification

        unread = 0
        if current_user.is_authenticated:
            unread = Notification.query.filter_by(user_id=current_user.id, is_read=False).count()
        return {"unread_notifications": unread, "can_manage": _can_manage}

    _start_scheduler(app)


def _can_manage(user):
    """Admins and managers can create/edit/delete shipments."""
    return getattr(user, "role", None) in ("admin", "manager")


def _start_scheduler(app):
    """Start the background risk-scan job, once, for the real running app."""
    if app.config.get("TESTING"):
        return
    # Flask's debug reloader runs two processes; only the child
    # (WERKZEUG_RUN_MAIN=true) should own the scheduler, so `flask run --debug`
    # doesn't end up running two scan loops in parallel.
    if app.debug and os.environ.get("WERKZEUG_RUN_MAIN") != "true":
        return
    if scheduler.running:
        return

    interval = app.config.get("RISK_SCAN_INTERVAL_SECONDS", 60)

    def _job():
        with app.app_context():
            from app.services.risk_engine import scan_all_shipments

            result = scan_all_shipments()
            app.logger.info("Risk scan: %s", result)

    scheduler.add_job(_job, "interval", seconds=interval, id="risk_scan", replace_existing=True)
    scheduler.start()


def register_blueprints(app):
    from app.blueprints.main.routes import main_bp
    from app.blueprints.auth.routes import auth_bp
    from app.blueprints.shipments.routes import shipments_bp
    from app.blueprints.disruptions.routes import disruptions_bp
    from app.blueprints.notifications.routes import notifications_bp
    from app.blueprints.chat.routes import chat_bp
    from app.blueprints.assistant.routes import assistant_bp

    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(shipments_bp, url_prefix="/shipments")
    app.register_blueprint(disruptions_bp, url_prefix="/disruptions")
    app.register_blueprint(notifications_bp, url_prefix="/notifications")
    app.register_blueprint(chat_bp, url_prefix="/chat")
    app.register_blueprint(assistant_bp, url_prefix="/assistant")


def _apply_schema_patches():
    """
    Small additive/non-destructive patches for columns added after the table
    was first created, so an existing instance/chainshield.db from an earlier
    `flask init-db` doesn't need to be dropped and recreated.
    """
    from sqlalchemy import text

    existing_cols = [row[1] for row in db.session.execute(text("PRAGMA table_info(shipments)")).fetchall()]
    if existing_cols and "cargo_value" not in existing_cols:
        db.session.execute(text("ALTER TABLE shipments ADD COLUMN cargo_value FLOAT DEFAULT 0.0"))
        db.session.commit()
        print("Schema patch applied: shipments.cargo_value")


def register_cli(app):
    @app.cli.command("init-db")
    def init_db():
        """Create all database tables and apply any additive schema patches (flask init-db)."""
        with app.app_context():
            db.create_all()
            _apply_schema_patches()
        print("Database tables created.")

    @app.cli.command("seed-db")
    def seed_db():
        """Seed demo users, hubs, cargo types, and sample shipments (flask seed-db)."""
        from app.models import User, Hub, CargoType, Shipment

        with app.app_context():
            if not User.query.filter_by(email="admin@chainshield.com").first():
                admin = User(name="Admin", email="admin@chainshield.com", role="admin")
                admin.set_password("demo1234")
                db.session.add(admin)
                db.session.commit()
                print("Seeded demo admin: admin@chainshield.com / demo1234")
            else:
                print("Demo admin already exists.")

            demo_operators = [
                ("Manisha Patel", "manisha@chainshield.com", "manager"),
                ("Karan Shah", "karan@chainshield.com", "captain"),
                ("Rohit Mehta", "rohit@chainshield.com", "pilot"),
                ("Suresh Yadav", "suresh@chainshield.com", "driver"),
                ("Ajay Kumar", "ajay@chainshield.com", "loco_pilot"),
            ]
            for name, email, role in demo_operators:
                if not User.query.filter_by(email=email).first():
                    u = User(name=name, email=email, role=role)
                    u.set_password("demo1234")
                    db.session.add(u)
            db.session.commit()

            wanted_hubs = [
                ("Ahmedabad Hub", "Ahmedabad, Gujarat", 23.0225, 72.5714),
                ("Mumbai Hub", "Mumbai, Maharashtra", 19.0760, 72.8777),
                ("Delhi Hub", "Delhi, NCR", 28.6139, 77.2090),
                ("Bengaluru Hub", "Bengaluru, Karnataka", 12.9716, 77.5946),
                ("Chennai Hub", "Chennai, Tamil Nadu", 13.0827, 80.2707),
                ("Kolkata Hub", "Kolkata, West Bengal", 22.5726, 88.3639),
                ("Pune Hub", "Pune, Maharashtra", 18.5204, 73.8567),
                ("Hyderabad Hub", "Hyderabad, Telangana", 17.3850, 78.4867),
                ("Surat Hub", "Surat, Gujarat", 21.1702, 72.8311),
                ("Jaipur Hub", "Jaipur, Rajasthan", 26.9124, 75.7873),
            ]
            added_hubs = 0
            for name, location, lat, lng in wanted_hubs:
                if not Hub.query.filter_by(name=name).first():
                    db.session.add(Hub(name=name, location=location, lat=lat, lng=lng))
                    added_hubs += 1
            if added_hubs:
                db.session.commit()
                print(f"Seeded {added_hubs} new hub(s) (existing ones left untouched).")

            wanted_cargo_types = [
                ("General", 0.3),
                ("Perishable", 0.7),
                ("Hazardous", 0.9),
                ("Electronics", 0.6),
            ]
            added_cargo_types = 0
            for name, weight in wanted_cargo_types:
                if not CargoType.query.filter_by(name=name).first():
                    db.session.add(CargoType(name=name, sensitivity_weight=weight))
                    added_cargo_types += 1
            if added_cargo_types:
                db.session.commit()
                print(f"Seeded {added_cargo_types} new cargo type(s) (existing ones left untouched).")

            if True:  # per-tracking_no check below makes this safe to re-run
                ahmedabad = Hub.query.filter_by(name="Ahmedabad Hub").first()
                mumbai = Hub.query.filter_by(name="Mumbai Hub").first()
                delhi = Hub.query.filter_by(name="Delhi Hub").first()
                bengaluru = Hub.query.filter_by(name="Bengaluru Hub").first()
                surat = Hub.query.filter_by(name="Surat Hub").first()
                jaipur = Hub.query.filter_by(name="Jaipur Hub").first()
                perishable = CargoType.query.filter_by(name="Perishable").first()
                general = CargoType.query.filter_by(name="General").first()
                hazardous = CargoType.query.filter_by(name="Hazardous").first()
                electronics = CargoType.query.filter_by(name="Electronics").first()

                wanted_shipments = [
                    dict(tracking_no="CS-1001", origin="Ahmedabad", destination="Mumbai",
                         cargo_type_id=perishable.id, transport_mode="Road", cargo_value=42000,
                         current_lat=22.30, current_lng=72.62, hub_id=ahmedabad.id),
                    dict(tracking_no="CS-1002", origin="Mumbai", destination="Delhi",
                         cargo_type_id=general.id, transport_mode="Rail", cargo_value=68000,
                         current_lat=21.15, current_lng=75.85, hub_id=mumbai.id),
                    dict(tracking_no="CS-1003", origin="Delhi", destination="Ahmedabad",
                         cargo_type_id=hazardous.id, transport_mode="Road", cargo_value=95000,
                         current_lat=26.92, current_lng=75.79, hub_id=delhi.id),
                    dict(tracking_no="CS-1004", origin="Bengaluru", destination="Chennai",
                         cargo_type_id=electronics.id, transport_mode="Air", cargo_value=150000,
                         current_lat=12.97, current_lng=78.20, hub_id=bengaluru.id),
                    dict(tracking_no="CS-1005", origin="Surat", destination="Kolkata",
                         cargo_type_id=general.id, transport_mode="Sea", cargo_value=210000,
                         current_lat=21.5, current_lng=75.0, hub_id=surat.id),
                    dict(tracking_no="CS-1006", origin="Jaipur", destination="Ahmedabad",
                         cargo_type_id=perishable.id, transport_mode="Road", cargo_value=31000,
                         current_lat=25.5, current_lng=74.5, hub_id=jaipur.id),
                ]
                added_shipments = 0
                for kwargs in wanted_shipments:
                    if not Shipment.query.filter_by(tracking_no=kwargs["tracking_no"]).first():
                        db.session.add(Shipment(**kwargs))
                        added_shipments += 1
                if added_shipments:
                    db.session.commit()
                    print(f"Seeded {added_shipments} new demo shipment(s) (existing ones left untouched).")

                # Give each unassigned demo shipment the field operator matching its mode,
                # so logging in as a driver/pilot/captain/loco pilot shows real data.
                operator_for_mode = {
                    "Road": "suresh@chainshield.com", "Rail": "ajay@chainshield.com",
                    "Air": "rohit@chainshield.com", "Sea": "karan@chainshield.com",
                }
                assigned = 0
                for s in Shipment.query.filter(Shipment.tracking_no.in_([k["tracking_no"] for k in wanted_shipments]),
                                               Shipment.assigned_operator_id.is_(None)).all():
                    op = User.query.filter_by(email=operator_for_mode.get(s.transport_mode, "")).first()
                    if op:
                        s.assigned_operator_id = op.id
                        assigned += 1
                if assigned:
                    db.session.commit()
                    print(f"Assigned field operators to {assigned} demo shipment(s).")

    @app.cli.command("reset-demo")
    def reset_demo():
        """Put the demo shipments back at their origin hubs and clear disruptions (flask reset-demo)."""
        from app.models import Shipment, Disruption, Notification
        from app.services.risk_engine import hub_for_city

        with app.app_context():
            for d in Disruption.query.all():
                db.session.delete(d)
            Notification.query.delete()
            n = 0
            for s in Shipment.query.filter(Shipment.tracking_no.like("CS-10%")).all():
                hub = hub_for_city(s.origin)
                if hub:
                    s.current_lat, s.current_lng = hub.lat, hub.lng
                s.status, s.risk_level, s.risk_score = "In-transit", "LOW", 0.0
                n += 1
            db.session.commit()
            print(f"Reset {n} shipment(s) to their origin hubs; disruptions and notifications cleared.")

    @app.cli.command("scan-risk")
    def scan_risk():
        """Run one risk-engine scan pass immediately (flask scan-risk)."""
        from app.services.risk_engine import scan_all_shipments

        with app.app_context():
            result = scan_all_shipments()
            print(
                f"Scanned {result['scanned']} shipment(s), "
                f"opened {result['disruptions_created']} new disruption(s)."
            )
