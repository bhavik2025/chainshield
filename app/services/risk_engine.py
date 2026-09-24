"""
Risk Engine — 4-factor weighted disruption risk scoring + scan loop.

Composite score = 0.40*weather + 0.25*congestion + 0.20*cargo + 0.15*history
Thresholds: >=70 HIGH, >=50 MEDIUM, >=30 AT-RISK, <30 LOW
(see MCA Sem 3 documentation, Section 1.3 / 3.2).

Each scan pass (run by APScheduler every RISK_SCAN_INTERVAL_SECONDS):
  1. moves every in-transit shipment one step toward its destination hub
     (simulated GPS feed, so the live map moves during a demo),
  2. re-scores it with the four factors,
  3. opens a Disruption + ranked route solutions when it crosses AT-RISK,
  4. notifies admins, managers and the assigned operator in real time,
  5. broadcasts "shipments_updated" so every open map/dashboard refreshes.
"""
import math
import random
from datetime import datetime, timedelta

from flask import current_app

from app.extensions import db, socketio
from app.models import Shipment, Disruption, Hub, ActivityLog
from app.services.weather import get_weather_severity

ALERT_LEVELS = ("AT-RISK", "MEDIUM", "HIGH")
SEVERITY_RANK = {"LOW": 0, "AT-RISK": 1, "MEDIUM": 2, "HIGH": 3}


def compute_risk_score(weather: float, congestion: float, cargo: float, history: float) -> float:
    """Return a composite 0-100 risk score from the four weighted factors."""
    cfg = current_app.config
    score = (
        weather * cfg["RISK_WEIGHT_WEATHER"]
        + congestion * cfg["RISK_WEIGHT_CONGESTION"]
        + cargo * cfg["RISK_WEIGHT_CARGO"]
        + history * cfg["RISK_WEIGHT_HISTORY"]
    )
    return round(score, 2)


def classify_risk(score: float) -> str:
    if score >= 70:
        return "HIGH"
    if score >= 50:
        return "MEDIUM"
    if score >= 30:
        return "AT-RISK"
    return "LOW"


def _get_congestion_level(transport_mode: str) -> float:
    """
    Simulated congestion score (0-100) until a real traffic/AIS/ATC feed is
    wired in. Road/Rail biased higher than Sea/Air, matching the fallback
    pattern already used in weather.py so the whole scan loop stays fully
    demoable without external services.
    """
    bias = {"Road": 55, "Rail": 40, "Sea": 20, "Air": 15}.get(transport_mode, 35)
    return round(min(100, max(0, random.uniform(bias - 20, bias + 30))), 2)


def _get_history_score(shipment) -> float:
    """
    Route-history score (0-100): scales up with how many disruptions were
    logged on the same origin -> destination lane in the last 90 days. A lane
    with no history gets a low baseline, not zero, since an unproven lane
    isn't automatically risk-free.
    """
    cutoff = datetime.utcnow() - timedelta(days=90)
    past_count = (
        Disruption.query.join(Shipment, Disruption.shipment_id == Shipment.id)
        .filter(
            Shipment.origin == shipment.origin,
            Shipment.destination == shipment.destination,
            Disruption.detected_at >= cutoff,
        )
        .count()
    )
    return round(min(100, 15 + past_count * 12), 2)


def hub_for_city(city):
    """Find the hub for a city name ("Mumbai" -> "Mumbai Hub"), if one exists."""
    if not city:
        return None
    return Hub.query.filter(
        db.or_(Hub.name.ilike(f"{city}%"), Hub.location.ilike(f"{city}%"))
    ).first()


def _move_toward_destination(shipment) -> bool:
    """
    Simulated GPS step: move the shipment MOVEMENT_STEP_DEG degrees toward its
    destination hub. Marks it Delivered on arrival. Returns True if delivered.
    """
    dest = hub_for_city(shipment.destination)
    if not dest or dest.lat is None or shipment.current_lat is None:
        return False
    step = current_app.config.get("MOVEMENT_STEP_DEG", 0.15)
    dlat = dest.lat - shipment.current_lat
    dlng = dest.lng - shipment.current_lng
    dist = math.hypot(dlat, dlng)
    if dist <= step:
        shipment.current_lat, shipment.current_lng = dest.lat, dest.lng
        shipment.status = "Delivered"
        shipment.risk_level, shipment.risk_score = "LOW", 0.0
        return True
    shipment.current_lat = round(shipment.current_lat + dlat / dist * step, 5)
    shipment.current_lng = round(shipment.current_lng + dlng / dist * step, 5)
    return False


def scan_shipment(shipment):
    """
    Score one shipment and persist risk_score/risk_level. Opens a Disruption
    (with generated route solutions) when it crosses AT-RISK and doesn't
    already have one open. Does not commit. Returns the new Disruption or None.
    """
    from app.services.route_solver import generate_route_solutions

    weather = get_weather_severity(shipment.current_lat or 0.0, shipment.current_lng or 0.0)
    congestion = _get_congestion_level(shipment.transport_mode)
    cargo = (shipment.cargo_type.sensitivity_weight * 100) if shipment.cargo_type else 50.0
    history = _get_history_score(shipment)

    score = compute_risk_score(weather, congestion, cargo, history)
    level = classify_risk(score)
    shipment.risk_score = score
    shipment.risk_level = level

    if level not in ALERT_LEVELS:
        return None
    existing = Disruption.query.filter_by(shipment_id=shipment.id, status="Open").first()
    if existing:
        # Escalate an open disruption if the shipment's risk has climbed a level,
        # and re-plan its route options against the new, higher risk.
        if SEVERITY_RANK[level] > SEVERITY_RANK.get(existing.severity, 0):
            old = existing.severity
            existing.severity, existing.risk_score = level, score
            existing.solutions.clear()
            db.session.flush()
            generate_route_solutions(existing)
            from app.services.notifier import notify_roles

            notify_roles(
                ["admin", "manager"],
                f"ESCALATED: {shipment.tracking_no} risk rose {old} → {level} ({score}). Route options re-planned.",
                extra_user_ids=[shipment.assigned_operator_id],
                commit=False,
            )
        return None

    dominant = max(
        [("Weather", weather), ("Congestion", congestion), ("Cargo", cargo), ("History", history)],
        key=lambda pair: pair[1],
    )[0]
    disruption = Disruption(shipment_id=shipment.id, type=dominant, severity=level, risk_score=score)
    db.session.add(disruption)
    db.session.flush()  # assigns disruption.id so route solutions can reference it
    generate_route_solutions(disruption)
    return disruption


def _alert(disruption):
    """Notify admins/managers + the assigned operator about a new disruption."""
    from app.services.notifier import notify_roles

    s = disruption.shipment
    msg = (
        f"{disruption.severity} risk on {s.tracking_no} ({s.origin} → {s.destination}) — "
        f"{disruption.type}, score {disruption.risk_score}. Route options ready."
    )
    notify_roles(["admin", "manager"], msg, extra_user_ids=[s.assigned_operator_id], commit=False)
    socketio.emit(
        "disruption_new",
        {"id": disruption.id, "tracking_no": s.tracking_no, "severity": disruption.severity, "message": msg},
    )


def scan_all_shipments():
    """
    One full scan pass over every in-transit shipment. Safe to call repeatedly
    — never opens a duplicate Disruption for a shipment that already has one.
    """
    shipments = Shipment.query.filter(Shipment.status == "In-transit").all()
    scanned = disruptions_created = delivered = 0
    simulate = current_app.config.get("SIMULATE_MOVEMENT", False)

    for shipment in shipments:
        if simulate and _move_toward_destination(shipment):
            delivered += 1
            db.session.add(ActivityLog(action=f"{shipment.tracking_no} delivered at {shipment.destination}"))
            for d in Disruption.query.filter_by(shipment_id=shipment.id, status="Open").all():
                d.status, d.resolved_at = "Resolved", datetime.utcnow()
            continue

        disruption = scan_shipment(shipment)
        scanned += 1
        if disruption:
            disruptions_created += 1
            _alert(disruption)

    db.session.commit()
    socketio.emit("shipments_updated", {"scanned": scanned, "disruptions_created": disruptions_created})
    return {"scanned": scanned, "disruptions_created": disruptions_created, "delivered": delivered}
