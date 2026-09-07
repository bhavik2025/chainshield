"""
Risk Engine — 4-factor weighted disruption risk scoring + scan loop.

Composite score = 0.40*weather + 0.25*congestion + 0.20*cargo + 0.15*history
Thresholds: >=70 HIGH, >=50 MEDIUM, >=30 AT-RISK, <30 LOW
(see MCA Sem 3 documentation, Section 1.3 / 3.2).
"""
import random
from datetime import datetime, timedelta

from flask import current_app

from app.extensions import db
from app.models import Shipment, Disruption
from app.services.weather import get_weather_severity


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
    Simulated route-history score (0-100): scales up with how many
    disruptions were logged on the same origin -> destination lane in the
    last 90 days. A lane with no history gets a low baseline, not zero,
    since an unproven lane isn't automatically risk-free.
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


def scan_all_shipments():
    """
    Score every in-transit shipment and persist risk_score/risk_level. Opens
    a new Disruption (with generated route solutions) for any shipment that
    crosses into AT-RISK or above and doesn't already have one open. Safe to
    call repeatedly — never opens a duplicate Disruption for a shipment that
    already has one open.
    """
    from app.services.route_solver import generate_route_solutions

    shipments = Shipment.query.filter(Shipment.status == "In-transit").all()
    scanned = 0
    disruptions_created = 0

    for shipment in shipments:
        weather = get_weather_severity(shipment.current_lat or 0.0, shipment.current_lng or 0.0)
        congestion = _get_congestion_level(shipment.transport_mode)
        cargo = (shipment.cargo_type.sensitivity_weight * 100) if shipment.cargo_type else 50.0
        history = _get_history_score(shipment)

        score = compute_risk_score(weather, congestion, cargo, history)
        level = classify_risk(score)

        shipment.risk_score = score
        shipment.risk_level = level
        scanned += 1

        if level in ("AT-RISK", "MEDIUM", "HIGH"):
            already_open = Disruption.query.filter_by(shipment_id=shipment.id, status="Open").first()
            if not already_open:
                dominant = max(
                    [("Weather", weather), ("Congestion", congestion), ("Cargo", cargo), ("History", history)],
                    key=lambda pair: pair[1],
                )[0]
                disruption = Disruption(
                    shipment_id=shipment.id,
                    type=dominant,
                    severity=level,
                    risk_score=score,
                )
                db.session.add(disruption)
                db.session.flush()  # assigns disruption.id so route solutions can reference it
                generate_route_solutions(disruption)
                disruptions_created += 1

    db.session.commit()
    return {"scanned": scanned, "disruptions_created": disruptions_created}
