from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ── Auth ──────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    name:          str
    email:         str
    password:      str
    role:          str          # admin | manager | operator
    operator_type: Optional[str] = None
    phone:         Optional[str] = None
    license_id:    Optional[str] = None
    company:       Optional[str] = None

class LoginRequest(BaseModel):
    email:    str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    user:         "UserOut"

class UserOut(BaseModel):
    id:            str
    name:          str
    email:         str
    role:          str
    operator_type: Optional[str]
    phone:         Optional[str]
    license_id:    Optional[str]
    company:       Optional[str]
    shipment_id:   Optional[str]
    active:        bool
    chat_number:   Optional[str]
    created_at:    datetime

    class Config:
        from_attributes = True

TokenResponse.model_rebuild()


# ── Shipment ──────────────────────────────────────────────────
class CityPoint(BaseModel):
    city:    str
    country: str
    lat:     float
    lng:     float

class ShipmentCreate(BaseModel):
    name:           str
    cargo:          str
    mode:           str
    origin:         CityPoint
    destination:    CityPoint
    departure_date: Optional[str] = None
    eta:            Optional[str] = None
    carrier:        Optional[str] = None
    operator_id:    Optional[str] = None
    weight:         Optional[str] = None
    value:          Optional[float] = 0
    description:    Optional[str] = None
    waypoints:      Optional[List[dict]] = []

class ShipmentOut(BaseModel):
    id:             str
    name:           str
    cargo:          str
    mode:           str
    status:         str
    origin:         dict
    destination:    dict
    current_pos:    Optional[dict]
    progress:       int
    eta:            Optional[str]
    departure_date: Optional[str]
    carrier:        Optional[str]
    weight:         Optional[str]
    value:          float
    description:    Optional[str]
    operator_id:    Optional[str]
    created_by:     Optional[str]
    disruption_id:  Optional[str]
    waypoints:      List[dict]
    applied_solution: Optional[dict]
    created_at:     datetime

    class Config:
        from_attributes = True

class ShipmentUpdate(BaseModel):
    status:        Optional[str]   = None
    progress:      Optional[int]   = None
    disruption_id: Optional[str]   = None
    current_lat:   Optional[float] = None
    current_lng:   Optional[float] = None


class OperatorStatusUpdate(BaseModel):
    status: str                  # on_time | at_risk | delayed | delivered
    note:   Optional[str] = None

# ── Disruption ────────────────────────────────────────────────
class DisruptionOut(BaseModel):
    id:                    str
    type:                  str
    title:                 str
    description:           str
    severity:              str
    location:              Optional[dict]
    estimated_delay_hours: int
    detected_at:           datetime
    solutions:             List[dict]
    affected_shipments:    List[str]

    class Config:
        from_attributes = True

class ResolveRequest(BaseModel):
    solution_id: str


# ── Notification ──────────────────────────────────────────────
class NotificationOut(BaseModel):
    id:               str
    user_id:          str
    type:             str
    title:            str
    message:          Optional[str]
    disruption_title: Optional[str]
    shipment_id:      Optional[str]
    solution:         Optional[dict]
    read:             bool
    created_at:       datetime

    class Config:
        from_attributes = True


# ── Chat ──────────────────────────────────────────────────────
class SendMessageRequest(BaseModel):
    receiver_chat_number: str
    content:              str

class MessageOut(BaseModel):
    id:                 str
    sender_id:          str
    receiver_id:        str
    sender_name:        Optional[str]
    sender_chat_number: Optional[str]
    content:            str
    read:               bool
    created_at:         datetime

    class Config:
        from_attributes = True

class ChatUserOut(BaseModel):
    """Minimal user info returned by /api/chat/search"""
    id:          str
    name:        str
    role:        str
    company:     Optional[str]
    chat_number: Optional[str]

    class Config:
        from_attributes = True


# ── Admin ─────────────────────────────────────────────────────
class BaseCityCreate(BaseModel):
    city:    str
    country: str
    lat:     float
    lng:     float

class BaseCityOut(BaseModel):
    id:       int
    city:     str
    country:  str
    lat:      float
    lng:      float
    added_at: datetime

    class Config:
        from_attributes = True

class CargoTypeOut(BaseModel):
    id:   int
    name: str

    class Config:
        from_attributes = True

class ActivityLogOut(BaseModel):
    id:        str
    user_id:   Optional[str]
    user_name: Optional[str]
    role:      Optional[str]
    action:    str
    entity:    Optional[str]
    entity_id: Optional[str]
    details:   Optional[str]
    timestamp: datetime

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    active:      Optional[bool] = None
    shipment_id: Optional[str]  = None
    role:        Optional[str]  = None
