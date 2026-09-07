"""
SQLAlchemy models for ChainShield Transportation System.

Mirrors the Data Dictionary in the MCA Sem 3 documentation
(MCA_Sem3_Documentation/ChainShield_MCA_Sem3_Documentation.docx, Section 3.2).
"""
from datetime import datetime

from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

from app.extensions import db


class User(db.Model, UserMixin):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="manager")
    # roles: admin | manager | captain | pilot | driver | loco_pilot
    phone = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, raw_password):
        self.password_hash = generate_password_hash(raw_password)

    def check_password(self, raw_password):
        return check_password_hash(self.password_hash, raw_password)

    def __repr__(self):
        return f"<User {self.email} ({self.role})>"


class Hub(db.Model):
    __tablename__ = "hubs"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    location = db.Column(db.String(150))
    lat = db.Column(db.Float)
    lng = db.Column(db.Float)


class CargoType(db.Model):
    __tablename__ = "cargo_types"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False, unique=True)
    sensitivity_weight = db.Column(db.Float, default=0.5)  # 0.0 (low) - 1.0 (high)


class Shipment(db.Model):
    __tablename__ = "shipments"

    id = db.Column(db.Integer, primary_key=True)
    tracking_no = db.Column(db.String(30), unique=True, nullable=False)
    origin = db.Column(db.String(100))
    destination = db.Column(db.String(100))
    cargo_type_id = db.Column(db.Integer, db.ForeignKey("cargo_types.id"))
    transport_mode = db.Column(db.String(20))  # Road / Rail / Sea / Air
    status = db.Column(db.String(20), default="In-transit")
    current_lat = db.Column(db.Float)
    current_lng = db.Column(db.Float)
    risk_score = db.Column(db.Float, default=0.0)
    risk_level = db.Column(db.String(15), default="LOW")
    cargo_value = db.Column(db.Float, default=0.0)  # demo monetary value, for admin dashboard stats
    assigned_operator_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    hub_id = db.Column(db.Integer, db.ForeignKey("hubs.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    cargo_type = db.relationship("CargoType")
    assigned_operator = db.relationship("User")
    hub = db.relationship("Hub")


class Disruption(db.Model):
    __tablename__ = "disruptions"

    id = db.Column(db.Integer, primary_key=True)
    shipment_id = db.Column(db.Integer, db.ForeignKey("shipments.id"), nullable=False)
    type = db.Column(db.String(30))  # Weather / Congestion / Cargo / Historic
    severity = db.Column(db.String(15))  # AT-RISK / MEDIUM / HIGH / CRITICAL
    risk_score = db.Column(db.Float)
    status = db.Column(db.String(15), default="Open")  # Open / Resolved
    detected_at = db.Column(db.DateTime, default=datetime.utcnow)
    resolved_at = db.Column(db.DateTime)
    resolved_by = db.Column(db.Integer, db.ForeignKey("users.id"))

    shipment = db.relationship("Shipment")
    solutions = db.relationship("RouteSolution", backref="disruption", cascade="all, delete-orphan")


class RouteSolution(db.Model):
    __tablename__ = "route_solutions"

    id = db.Column(db.Integer, primary_key=True)
    disruption_id = db.Column(db.Integer, db.ForeignKey("disruptions.id"), nullable=False)
    option_no = db.Column(db.Integer, nullable=False)
    description = db.Column(db.Text)
    extra_time_hours = db.Column(db.Float)
    extra_cost = db.Column(db.Float)
    risk_score = db.Column(db.Float)
    selected = db.Column(db.Boolean, default=False)


class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    message = db.Column(db.String(255), nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Message(db.Model):
    __tablename__ = "messages"

    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    chat_id = db.Column(db.String(10))
    content = db.Column(db.Text, nullable=False)
    sent_at = db.Column(db.DateTime, default=datetime.utcnow)


class ActivityLog(db.Model):
    __tablename__ = "activity_log"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    action = db.Column(db.String(255), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User")
