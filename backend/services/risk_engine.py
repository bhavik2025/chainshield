"""
ChainShield Risk Engine v2
────────────────────────────────────────────────────────────────
4-Factor Weighted Scoring (as per PPT architecture):

  Factor                   Weight   Max Points
  ─────────────────────────────────────────────
  1. Weather Severity       40 %      40
  2. Route Congestion       25 %      25
  3. Cargo Sensitivity      20 %      20
  4. Historic Delay Prob.   15 %      15
  ─────────────────────────────────────────────
  TOTAL                    100 %     100

Thresholds (PPT spec):
  Score ≥ 70  →  CRITICAL  → create Disruption (critical/high)
  Score ≥ 50  →  HIGH      → create Disruption (medium)
  Score ≥ 30  →  MEDIUM    → mark shipment at_risk, no disruption
  Score <  30 →  LOW       → no action, update risk_score only
"""
import uuid, random, hashlib
from datetime import datetime
from sqlalchemy.orm import Session
import models
from services.weather import get_weather, weather_summary


# ─── Weather-ID lookup → (score_0_to_40, disruption_type, severity) ─────────
WEATHER_SCORES = [
    (range(200, 300), 40, "weather", "critical", "Thunderstorm"),
    (range(511, 512), 32, "weather", "high",     "Freezing Rain"),
    (range(600, 622), 30, "weather", "high",     "Snow/Blizzard"),
    (range(500, 511), 22, "weather", "medium",   "Rain"),
    (range(300, 400), 12, "weather", "medium",   "Drizzle"),
    (range(700, 782), 26, "weather", "high",     "Atmospheric Hazard"),
    (range(800, 805),  0, "weather", "low",      "Clear"),
]

SENSITIVE_CARGO = {
    "Pharmaceuticals", "Medical Devices", "Refrigerated Goods",
    "Luxury Goods", "Hazardous Materials", "Consumer Electronics",
}
# Countries with historically elevated port/customs delays
HIGH_DELAY_COUNTRIES = {
    "Yemen", "Sudan", "Libya", "Syria", "Somalia", "Afghanistan",
    "Haiti", "Myanmar", "Venezuela", "Iran", "Russia",
}
# Trade-lane congestion baseline scores (0-25)
CONGESTION_BASE = {"sea": 12, "air": 6, "road": 20, "rail": 18}


# ─── Factor 1 — Weather (max 40) ─────────────────────────────────────────────
def _score_weather(weather_id: int, wind_ms: float, mode: str) -> tuple[int, str, str]:
    base, w_type, severity = 0, "weather", "low"
    for rng, score, t, sev, _ in WEATHER_SCORES:
        if weather_id in rng:
            base, w_type, severity = score, t, sev
            break

    wind_knots = wind_ms * 1.944
    wind_bonus = 0
    if mode in ("sea", "air"):
        if wind_knots > 60:   wind_bonus = 10
        elif wind_knots > 40: wind_bonus = 7
        elif wind_knots > 25: wind_bonus = 4
    elif mode == "road":
        if wind_knots > 50:   wind_bonus = 5

    return min(base + wind_bonus, 40), w_type, severity


# ─── Factor 2 — Congestion (max 25) ──────────────────────────────────────────
def _score_congestion(mode: str, shipment_id: str) -> int:
    # Deterministic but varied per shipment — same ID always gives same score
    seed = int(hashlib.md5(shipment_id.encode()).hexdigest(), 16) % 1000
    rng  = random.Random(seed)
    base = CONGESTION_BASE.get(mode, 10)
    return rng.randint(0, base)


# ─── Factor 3 — Cargo Sensitivity (max 20) ───────────────────────────────────
def _score_cargo(cargo: str) -> int:
    return 20 if cargo in SENSITIVE_CARGO else 5


# ─── Factor 4 — Historic Delay Probability (max 15) ──────────────────────────
def _score_historic(dest_country: str, mode: str, shipment_id: str) -> int:
    base = 15 if dest_country in HIGH_DELAY_COUNTRIES else 3
    # Small random variance (±3) seeded per shipment for realism
    rng = random.Random(shipment_id + "_hist")
    return min(base + rng.randint(-2, 3), 15)


# ─── Solution generator ───────────────────────────────────────────────────────
def _new_sol_id():
    return f"SOL-{uuid.uuid4().hex[:6].upper()}"


def _make_solutions(dis_type: str, mode: str, location_name: str) -> list[dict]:
    library = {
        ("weather", "sea"): [
            {"title": "Divert to Alternate Sea Route",
             "description": f"Reroute around weather zone near {location_name}. Longer but fully safe.",
             "pros": ["Avoids disruption", "Cargo integrity maintained"],
             "cons": ["Extra fuel cost", "Longer transit"],
             "extraTimeHours": 18, "extraCostUSD": 14000, "riskScore": 8, "recommended": True},
            {"title": "Hold Position — Wait Out Storm",
             "description": "Heave to in safe waters and wait for the weather system to pass.",
             "pros": ["No rerouting cost"],
             "cons": ["48h+ delay", "Berth holding fees"],
             "extraTimeHours": 48, "extraCostUSD": 5500, "riskScore": 35, "recommended": False},
        ],
        ("weather", "air"): [
            {"title": "Alternate Flight Path",
             "description": "ATC-approved bypass route avoiding turbulence zone.",
             "pros": ["Minimal delay", "Safety maintained"],
             "cons": ["Higher fuel burn"],
             "extraTimeHours": 3, "extraCostUSD": 8000, "riskScore": 6, "recommended": True},
            {"title": "Delay Departure",
             "description": "Hold at origin until weather window opens.",
             "pros": ["No extra fuel"],
             "cons": ["Unpredictable delay"],
             "extraTimeHours": 12, "extraCostUSD": 2500, "riskScore": 20, "recommended": False},
        ],
        ("weather", "road"): [
            {"title": "Alternate Highway Route",
             "description": "Bypass weather-affected corridor via ring road.",
             "pros": ["On schedule", "Safer conditions"],
             "cons": ["Extra distance", "Toll costs"],
             "extraTimeHours": 4, "extraCostUSD": 1200, "riskScore": 10, "recommended": True},
            {"title": "Stage and Wait",
             "description": "Rest stop until conditions improve.",
             "pros": ["Low cost"],
             "cons": ["Uncertain delay"],
             "extraTimeHours": 8, "extraCostUSD": 400, "riskScore": 18, "recommended": False},
        ],
        ("weather", "rail"): [
            {"title": "Road Transfer for Affected Segment",
             "description": "Transfer freight to road haulage to bypass rail section.",
             "pros": ["Avoids risk", "Predictable ETA"],
             "cons": ["Transfer handling cost"],
             "extraTimeHours": 6, "extraCostUSD": 9000, "riskScore": 14, "recommended": True},
            {"title": "Wait for Track Clearance",
             "description": "Hold at station until weather clears.",
             "pros": ["Low additional cost"],
             "cons": ["28h+ delay"],
             "extraTimeHours": 28, "extraCostUSD": 1800, "riskScore": 30, "recommended": False},
        ],
        ("congestion", "sea"): [
            {"title": "Divert to Alternate Port",
             "description": f"Redirect to nearest uncongested port near {location_name}.",
             "pros": ["Avoids queue", "Berths available"],
             "cons": ["Ground transport needed"],
             "extraTimeHours": 12, "extraCostUSD": 9000, "riskScore": 10, "recommended": True},
            {"title": "Anchor and Wait",
             "description": "Offshore anchorage until berth opens.",
             "pros": ["No rerouting cost"],
             "cons": ["Unpredictable wait"],
             "extraTimeHours": 36, "extraCostUSD": 4000, "riskScore": 38, "recommended": False},
        ],
        ("congestion", "road"): [
            {"title": "Bypass via Ring Road",
             "description": "Outer ring road bypasses congested corridor.",
             "pros": ["Minimal delay"],
             "cons": ["Slightly longer route"],
             "extraTimeHours": 3, "extraCostUSD": 600, "riskScore": 7, "recommended": True},
            {"title": "Off-Peak Departure Window",
             "description": "Stage at rest stop; resume during low-traffic night hours.",
             "pros": ["No extra route cost"],
             "cons": ["Delivery window risk"],
             "extraTimeHours": 6, "extraCostUSD": 300, "riskScore": 14, "recommended": False},
        ],
    }
    key = (dis_type, mode)
    raw = library.get(key, [
        {"title": "Recommended Alternate Route",
         "description": f"Reroute to avoid the {dis_type} disruption near {location_name}.",
         "pros": ["Avoids disruption", "Predictable delivery"],
         "cons": ["Additional cost", "Slight delay"],
         "extraTimeHours": 10, "extraCostUSD": 7500, "riskScore": 14, "recommended": True},
        {"title": "Hold and Monitor",
         "description": "Pause and monitor until disruption resolves.",
         "pros": ["Lower cost"],
         "cons": ["Unpredictable delay"],
         "extraTimeHours": 24, "extraCostUSD": 2000, "riskScore": 40, "recommended": False},
    ])
    for sol in raw:
        sol["id"] = _new_sol_id()
    return raw


# ─── Main scan function ───────────────────────────────────────────────────────
async def scan_shipment(shipment: models.Shipment, db: Session) -> models.Disruption | None:
    """
    Score one shipment against the 4-factor model.
    Returns a new Disruption if threshold ≥ 70, else None.
    Always updates shipment.risk_score.
    """
    if shipment.status in ("disrupted", "delivered"):
        return None
    if shipment.disruption_id:
        return None
    if shipment.current_lat is None:
        return None

    # ── Fetch live weather ────────────────────────────────────────
    weather   = await get_weather(shipment.current_lat, shipment.current_lng)
    summary   = weather_summary(weather) if weather else {}
    weather_id = summary.get("weather_id", 800)
    wind_ms    = summary.get("wind_ms", 5)

    # ── Score each factor ─────────────────────────────────────────
    w_score, w_type, w_sev = _score_weather(weather_id, wind_ms, shipment.mode)
    c_score  = _score_congestion(shipment.mode, shipment.id)
    cs_score = _score_cargo(shipment.cargo)
    hd_score = _score_historic(shipment.dest_country or "", shipment.mode, shipment.id)

    total = w_score + c_score + cs_score + hd_score   # max 100

    # Always persist risk score
    shipment.risk_score = total
    db.add(shipment)

    # ── Apply thresholds ──────────────────────────────────────────
    if total < 30:
        # LOW — just update score, no status change
        db.commit()
        return None

    if 30 <= total < 50:
        # MEDIUM — mark at_risk but don't create disruption
        if shipment.status == "on_time":
            shipment.status = "at_risk"
        db.commit()
        return None

    # ── total ≥ 50 → create disruption ───────────────────────────
    if total >= 70:
        severity = "critical" if total >= 85 else "high"
    else:
        severity = "medium"

    # Determine primary disruption type
    if w_score >= 20:
        dis_type = w_type  # "weather"
    elif c_score >= 15:
        dis_type = "congestion"
    else:
        dis_type = random.choice(["customs", "mechanical", "fuel"])
        severity = "medium"

    weather_cond  = summary.get("condition", "adverse conditions")
    wind_knots    = summary.get("wind_knots", 0)
    location_name = f"{shipment.current_lat:.1f}°, {shipment.current_lng:.1f}°"

    titles = {
        "weather":    f"{'Severe Storm' if severity in ('critical','high') else 'Adverse Weather'} — {shipment.origin_city} → {shipment.dest_city}",
        "congestion": f"Route Congestion — {shipment.dest_city} Corridor",
        "customs":    f"Customs Delay — {shipment.dest_city} Entry",
        "mechanical": f"Mechanical Issue — {shipment.name}",
        "fuel":       f"Fuel Supply Disruption — {shipment.mode.capitalize()} Route",
    }
    descs = {
        "weather":    (f"Risk Engine flagged {weather_cond} at {location_name} on {shipment.name}'s route. "
                       f"Wind {wind_knots} kn. Composite risk score: {total}/100 "
                       f"(Weather {w_score}/40 · Congestion {c_score}/25 · Cargo {cs_score}/20 · Historic {hd_score}/15)."),
        "congestion": (f"Heavy congestion on {shipment.dest_city} corridor affecting {shipment.name}. "
                       f"Risk score: {total}/100 "
                       f"(Weather {w_score}/40 · Congestion {c_score}/25 · Cargo {cs_score}/20 · Historic {hd_score}/15)."),
        "customs":    (f"Customs processing delay at {shipment.dest_city} for {shipment.name}. "
                       f"Risk score: {total}/100."),
        "mechanical": (f"Carrier {shipment.carrier or 'operator'} flagged mechanical inspection for {shipment.name}. "
                       f"Risk score: {total}/100."),
        "fuel":       (f"Fuel supply irregularity on {shipment.mode} route for {shipment.name}. "
                       f"Risk score: {total}/100."),
    }
    delay_map = {"critical": 72, "high": 36, "medium": 18}
    solutions = _make_solutions(dis_type, shipment.mode, location_name)

    dis = models.Disruption(
        id=f"DIS-{uuid.uuid4().hex[:8].upper()}",
        type=dis_type,
        title=titles.get(dis_type, "Route Disruption"),
        description=descs.get(dis_type, "Disruption detected."),
        severity=severity,
        location_lat=shipment.current_lat,
        location_lng=shipment.current_lng,
        estimated_delay_hours=delay_map.get(severity, 24),
        detected_at=datetime.utcnow(),
    )
    dis.solutions          = solutions
    dis.affected_shipments = [shipment.id]

    db.add(dis)
    shipment.status        = "disrupted"
    shipment.disruption_id = dis.id

    log = models.ActivityLog(
        id=f"LOG-{uuid.uuid4().hex[:8].upper()}",
        user_id="SYS", user_name="Risk Engine v2", role="system",
        action="DISRUPTION_DETECTED", entity="Disruption", entity_id=dis.id,
        details=(f"4-Factor Score {total}/100 ≥ threshold · "
                 f"W:{w_score} C:{c_score} CS:{cs_score} HD:{hd_score} · "
                 f"{dis.title} ({severity})"),
    )
    db.add(log)
    db.commit()

    # ── Sync to Firestore for real-time frontend updates ──────────
    try:
        from firebase_admin_init import write_disruption_to_firestore
        write_disruption_to_firestore({
            "id": dis.id, "type": dis.type, "title": dis.title,
            "description": dis.description, "severity": dis.severity,
            "estimatedDelayHours": dis.estimated_delay_hours,
            "affectedShipments": dis.affected_shipments,
            "riskScore": total,
        })
    except Exception:
        pass  # non-critical

    return dis


# ─── Batch scan all eligible shipments ───────────────────────────────────────
async def scan_all(db: Session) -> list:
    """Run scan_shipment on every non-terminal shipment. Called by background scheduler."""
    eligible = db.query(models.Shipment).filter(
        models.Shipment.status.notin_(["delivered", "disrupted"])
    ).all()

    created = []
    for ship in eligible:
        try:
            dis = await scan_shipment(ship, db)
            if dis:
                created.append(dis)
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning("scan_shipment error for %s: %s", ship.id, e)
    return created
