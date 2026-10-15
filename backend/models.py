import json
from sqlalchemy import Column, String, Integer, Float, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


def now():
    return datetime.utcnow()


class User(Base):
    __tablename__ = "users"

    id            = Column(String, primary_key=True, index=True)
    name          = Column(String, nullable=False)
    email         = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role          = Column(String, nullable=False)          # admin | manager | operator
    operator_type = Column(String, nullable=True)           # Captain | Pilot | Driver | Loco Pilot
    phone         = Column(String, nullable=True)
    license_id    = Column(String, nullable=True)
    company       = Column(String, nullable=True)
    shipment_id   = Column(String, nullable=True)           # active shipment (operators)
    active        = Column(Boolean, default=True)
    chat_number   = Column(String, unique=True, nullable=True, index=True)  # 5-digit chat ID
    created_at    = Column(DateTime, default=now)

    notifications  = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    sent_messages  = relationship("Message", foreign_keys="Message.sender_id",   back_populates="sender",   cascade="all, delete-orphan")
    recv_messages  = relationship("Message", foreign_keys="Message.receiver_id", back_populates="receiver", cascade="all, delete-orphan")


class Shipment(Base):
    __tablename__ = "shipments"

    id             = Column(String, primary_key=True, index=True)
    name           = Column(String, nullable=False)
    cargo          = Column(String, nullable=False)
    mode           = Column(String, nullable=False)        # sea | air | road | rail
    status         = Column(String, default="on_time")     # on_time | at_risk | disrupted | delivered
    # Origin
    origin_city    = Column(String)
    origin_country = Column(String)
    origin_lat     = Column(Float)
    origin_lng     = Column(Float)
    # Destination
    dest_city      = Column(String)
    dest_country   = Column(String)
    dest_lat       = Column(Float)
    dest_lng       = Column(Float)
    # Current position (updated by risk engine)
    current_lat    = Column(Float, nullable=True)
    current_lng    = Column(Float, nullable=True)
    # Journey
    progress       = Column(Integer, default=0)
    eta            = Column(String, nullable=True)
    departure_date = Column(String, nullable=True)
    carrier        = Column(String, nullable=True)
    weight         = Column(String, nullable=True)
    value          = Column(Float, default=0)
    description    = Column(Text, nullable=True)
    # Relations
    operator_id    = Column(String, ForeignKey("users.id"), nullable=True)
    created_by     = Column(String, ForeignKey("users.id"), nullable=True)
    disruption_id  = Column(String, nullable=True)
    risk_score     = Column(Integer, default=0)       # 0-100 composite risk
    # JSON fields (stored as text)
    _waypoints        = Column("waypoints", Text, default="[]")
    _applied_solution = Column("applied_solution", Text, nullable=True)
    created_at        = Column(DateTime, default=now)

    @property
    def waypoints(self):
        return json.loads(self._waypoints or "[]")

    @waypoints.setter
    def waypoints(self, val):
        self._waypoints = json.dumps(val)

    @property
    def applied_solution(self):
        return json.loads(self._applied_solution) if self._applied_solution else None

    @applied_solution.setter
    def applied_solution(self, val):
        self._applied_solution = json.dumps(val) if val else None


class Disruption(Base):
    __tablename__ = "disruptions"

    id                    = Column(String, primary_key=True, index=True)
    type                  = Column(String)                 # weather | congestion | strike | customs | political | fuel | mechanical
    title                 = Column(String)
    description           = Column(Text)
    severity              = Column(String, default="medium")  # low | medium | high | critical
    location_lat          = Column(Float, nullable=True)
    location_lng          = Column(Float, nullable=True)
    estimated_delay_hours = Column(Integer, default=0)
    detected_at           = Column(DateTime, default=now)
    # JSON fields
    _solutions          = Column("solutions", Text, default="[]")
    _affected_shipments = Column("affected_shipments", Text, default="[]")

    @property
    def solutions(self):
        return json.loads(self._solutions or "[]")

    @solutions.setter
    def solutions(self, val):
        self._solutions = json.dumps(val)

    @property
    def affected_shipments(self):
        return json.loads(self._affected_shipments or "[]")

    @affected_shipments.setter
    def affected_shipments(self, val):
        self._affected_shipments = json.dumps(val)


class Notification(Base):
    __tablename__ = "notifications"

    id               = Column(String, primary_key=True, index=True)
    user_id          = Column(String, ForeignKey("users.id"), nullable=False)
    type             = Column(String, default="info")
    title            = Column(String)
    message          = Column(Text)
    disruption_title = Column(String, nullable=True)
    shipment_id      = Column(String, nullable=True)
    read             = Column(Boolean, default=False)
    created_at       = Column(DateTime, default=now)
    _solution        = Column("solution", Text, nullable=True)

    user = relationship("User", back_populates="notifications")

    @property
    def solution(self):
        return json.loads(self._solution) if self._solution else None

    @solution.setter
    def solution(self, val):
        self._solution = json.dumps(val) if val else None


class Message(Base):
    """Direct messages between users, identified by their 5-digit chat numbers."""
    __tablename__ = "messages"

    id                 = Column(String, primary_key=True, index=True)
    sender_id          = Column(String, ForeignKey("users.id"), nullable=False)
    receiver_id        = Column(String, ForeignKey("users.id"), nullable=False)
    sender_name        = Column(String, nullable=True)
    sender_chat_number = Column(String, nullable=True)
    content            = Column(Text, nullable=False)
    read               = Column(Boolean, default=False)
    created_at         = Column(DateTime, default=now)

    sender   = relationship("User", foreign_keys=[sender_id],   back_populates="sent_messages")
    receiver = relationship("User", foreign_keys=[receiver_id], back_populates="recv_messages")


class BaseCity(Base):
    __tablename__ = "base_cities"

    id       = Column(Integer, primary_key=True, autoincrement=True)
    city     = Column(String, unique=True, nullable=False)
    country  = Column(String)
    lat      = Column(Float)
    lng      = Column(Float)
    added_at = Column(DateTime, default=now)


class CargoType(Base):
    __tablename__ = "cargo_types"

    id   = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, unique=True, nullable=False)


class ActivityLog(Base):
    __tablename__ = "activity_log"

    id        = Column(String, primary_key=True, index=True)
    user_id   = Column(String, nullable=True)
    user_name = Column(String, nullable=True)
    role      = Column(String, nullable=True)
    action    = Column(String)
    entity    = Column(String, nullable=True)
    entity_id = Column(String, nullable=True)
    details   = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=now)
