"""
Route Solver — generates ranked alternatives for a disruption.

Candidate strategies:
  * Hold at the nearest hub until conditions clear
  * Continue on the current route (baseline — accept the risk)
  * Reroute via the best intermediate hubs (smallest detour, computed from
    great-circle distances between the shipment, each hub and the destination)
  * Switch transport mode for the remaining leg (e.g. Road -> Rail)

Every candidate gets extra time, extra cost and residual risk. They are then
ranked by a weighted optimisation score (lower is better):

    score = 0.60 * residual_risk + 0.25 * time_norm + 0.15 * cost_norm

where time_norm / cost_norm are scaled 0-100 against the worst candidate.
option_no = 1 is therefore always the recommended option. Nothing is
auto-applied — a manager/admin picks one on the Disruptions page.
"""
import math
import random

from app.extensions import db
from app.models import Hub, RouteSolution

SPEED_KMPH = {"Road": 50, "Rail": 60, "Sea": 30, "Air": 600}
COST_PER_KM = {"Road": 45, "Rail": 25, "Sea": 15, "Air": 180}  # ₹ per km
MODE_SWITCH = {"Road": "Rail", "Rail": "Road", "Sea": "Rail"}
HOLD_COST_PER_HOUR = 800
W_RISK, W_TIME, W_COST = 0.60, 0.25, 0.15


def haversine_km(a, b):
    """Great-circle distance in km between two (lat, lng) points."""
    lat1, lng1, lat2, lng2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lng2 - lng1) / 2) ** 2
    return 2 * 6371 * math.asin(math.sqrt(h))


def _rank(candidates):
    max_t = max(c["extra_time_hours"] for c in candidates) or 1
    max_c = max(c["extra_cost"] for c in candidates) or 1
    for c in candidates:
        c["score"] = (
            W_RISK * c["risk_score"]
            + W_TIME * (c["extra_time_hours"] / max_t * 100)
            + W_COST * (c["extra_cost"] / max_c * 100)
        )
    return sorted(candidates, key=lambda c: c["score"])


def build_candidates(disruption):
    """Pure computation (no DB writes) — returns ranked candidate dicts."""
    from app.services.risk_engine import hub_for_city

    shipment = disruption.shipment
    mode = shipment.transport_mode or "Road"
    base_risk = disruption.risk_score or 0
    severity_factor = {"AT-RISK": 1.0, "MEDIUM": 1.5, "HIGH": 2.0}.get(disruption.severity, 1.0)
    speed = SPEED_KMPH.get(mode, 50)

    here = (shipment.current_lat, shipment.current_lng) if shipment.current_lat is not None else None
    origin_hub = hub_for_city(shipment.origin)
    dest_hub = hub_for_city(shipment.destination)
    dest = (dest_hub.lat, dest_hub.lng) if dest_hub and dest_hub.lat is not None else None

    hold_h = round(4 * severity_factor + random.uniform(0, 2), 1)
    candidates = [
        {
            "description": "Hold at nearest hub until conditions clear",
            "extra_time_hours": hold_h,
            "extra_cost": round(hold_h * HOLD_COST_PER_HOUR, 2),
            "risk_score": round(base_risk * 0.15, 2),
        },
        {
            "description": "Continue on current route, accept the risk",
            "extra_time_hours": 0.0,
            "extra_cost": 0.0,
            "risk_score": round(base_risk, 2),
        },
    ]

    if here and dest:
        direct_km = haversine_km(here, dest)
        exclude = {h.id for h in (origin_hub, dest_hub) if h}
        detours = []
        for hub in Hub.query.all():
            if hub.id in exclude or hub.lat is None:
                continue
            via_km = haversine_km(here, (hub.lat, hub.lng)) + haversine_km((hub.lat, hub.lng), dest)
            detour_km = via_km - direct_km
            if detour_km < direct_km * 1.5 + 150:  # ignore absurd detours
                detours.append((detour_km, hub))
        detours.sort(key=lambda x: x[0])
        for rank, (detour_km, hub) in enumerate(detours[:2]):
            hours = round(max(0.5, detour_km / speed) + 1.0, 1)  # +1h hub handling
            candidates.append({
                "description": f"Reroute via {hub.name} (+{detour_km:,.0f} km detour, avoids affected corridor)",
                "extra_time_hours": hours,
                "extra_cost": round(max(0, detour_km) * COST_PER_KM.get(mode, 45) + 1500, 2),
                "risk_score": round(base_risk * (0.30 + 0.08 * rank), 2),
            })

        new_mode = MODE_SWITCH.get(mode)
        if new_mode:
            new_speed = SPEED_KMPH[new_mode]
            delta_h = direct_km / new_speed - direct_km / speed
            hours = round(max(0.0, delta_h) + 3.0, 1)  # +3h transshipment
            cost = max(0, direct_km * (COST_PER_KM[new_mode] - COST_PER_KM.get(mode, 45))) + 3000
            candidates.append({
                "description": f"Switch remaining {direct_km:,.0f} km leg from {mode} to {new_mode}",
                "extra_time_hours": hours,
                "extra_cost": round(cost, 2),
                "risk_score": round(base_risk * 0.45, 2),
            })

    return _rank(candidates)


def generate_route_solutions(disruption):
    """
    Create and persist ranked RouteSolution rows for `disruption` (already
    flushed, so disruption.id exists). Does not commit — the caller commits.
    """
    solutions = []
    for i, cand in enumerate(build_candidates(disruption), start=1):
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
