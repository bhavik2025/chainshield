"""Aggregates used by the dashboard KPI cards and Chart.js panels."""
from datetime import datetime, timedelta

from app.models import Shipment, Disruption

RISK_ORDER = ["LOW", "AT-RISK", "MEDIUM", "HIGH"]
MODES = ["Road", "Rail", "Sea", "Air"]
FACTORS = ["Weather", "Congestion", "Cargo", "History"]


def chart_data(shipments=None):
    shipments = shipments if shipments is not None else Shipment.query.all()
    active = [s for s in shipments if s.status != "Delivered"]
    ids = {s.id for s in shipments}

    risk_counts = {lvl: 0 for lvl in RISK_ORDER}
    for s in active:
        risk_counts[s.risk_level if s.risk_level in risk_counts else "LOW"] += 1

    mode_counts = {m: 0 for m in MODES}
    for s in shipments:
        if s.transport_mode in mode_counts:
            mode_counts[s.transport_mode] += 1

    disruptions = [d for d in Disruption.query.all() if d.shipment_id in ids]
    factor_counts = {f: 0 for f in FACTORS}
    for d in disruptions:
        if d.type in factor_counts:
            factor_counts[d.type] += 1

    today = datetime.utcnow().date()
    days = [today - timedelta(days=i) for i in range(6, -1, -1)]
    detected = {d: 0 for d in days}
    resolved = {d: 0 for d in days}
    for d in disruptions:
        if d.detected_at and d.detected_at.date() in detected:
            detected[d.detected_at.date()] += 1
        if d.resolved_at and d.resolved_at.date() in resolved:
            resolved[d.resolved_at.date()] += 1

    return {
        "risk": {"labels": list(risk_counts), "values": list(risk_counts.values())},
        "modes": {"labels": list(mode_counts), "values": list(mode_counts.values())},
        "factors": {"labels": list(factor_counts), "values": list(factor_counts.values())},
        "trend": {
            "labels": [d.strftime("%d %b") for d in days],
            "detected": [detected[d] for d in days],
            "resolved": [resolved[d] for d in days],
        },
        "kpis": {
            "active": len(active),
            "at_risk": sum(1 for s in active if s.risk_level in ("AT-RISK", "MEDIUM", "HIGH")),
            "open_disruptions": sum(1 for d in disruptions if d.status == "Open"),
            "delivered": sum(1 for s in shipments if s.status == "Delivered"),
        },
    }
