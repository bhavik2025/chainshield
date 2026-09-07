"""
Route Solver — generates ranked reroute/hold alternatives for a disruption.

Ranking is by ascending residual risk_score, so option_no=1 is always the
recommended option. Nothing is auto-selected — a manager/admin picks one
from the dashboard in a later phase.
"""
import random

from app.extensions import db
from app.models import Hub, RouteSolution


def generate_route_solutions(disruption):
    """
    Create and persist RouteSolution rows for `disruption` (already flushed,
    so disruption.id exists). Does not commit — the caller
    (risk_engine.scan_all_shipments) commits as part of its scan transaction.
    """
    shipment = disruption.shipment
    base_risk = disruption.risk_score
    severity_factor = {"AT-RISK": 1.0, "MEDIUM": 1.5, "HIGH": 2.0}.get(disruption.severity, 1.0)

    candidates = [
        {
            "description": "Hold at current hub until conditions clear",
            "extra_time_hours": round(4 * severity_factor + random.uniform(0, 2), 1),
            "risk_score": round(base_risk * 0.15, 2),
        },
        {
            "description": "Continue on current route, accept the risk",
            "extra_time_hours": 0.0,
            "risk_score": base_risk,
        },
    ]
    candidates[0]["extra_cost"] = round(candidates[0]["extra_time_hours"] * 150, 2)
    candidates[1]["extra_cost"] = 0.0

    alt_hub_query = Hub.query
    if shipment.hub_id:
        alt_hub_query = alt_hub_query.filter(Hub.id != shipment.hub_id)
    alt_hub = alt_hub_query.first()
    if alt_hub:
        reroute_hours = round(2 * severity_factor + random.uniform(0, 3), 1)
        candidates.append(
            {
                "description": f"Reroute via {alt_hub.name}",
                "extra_time_hours": reroute_hours,
                "extra_cost": round(reroute_hours * 220, 2),
                "risk_score": round(base_risk * 0.35, 2),
            }
        )

    candidates.sort(key=lambda c: c["risk_score"])

    solutions = []
    for i, cand in enumerate(candidates, start=1):
        solution = RouteSolution(
            disruption_id=disruption.id,
            option_no=i,
            description=cand["description"],
            extra_time_hours=cand["extra_time_hours"],
            extra_cost=cand["extra_cost"],
            risk_score=cand["risk_score"],
        )
        db.session.add(solution)
        solutions.append(solution)

    return solutions
