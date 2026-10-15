import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from database import get_db
import models, schemas
from auth import require_manager, require_any, get_current_user

try:
    from firebase_admin_init import write_disruption_to_firestore
except ImportError:
    def write_disruption_to_firestore(_): pass

router = APIRouter(prefix="/api/disruptions", tags=["disruptions"])


def _dis_to_dict(d: models.Disruption) -> dict:
    return {
        "id": d.id, "type": d.type, "title": d.title, "description": d.description,
        "severity": d.severity,
        "location": {"lat": d.location_lat, "lng": d.location_lng} if d.location_lat else None,
        "estimatedDelayHours": d.estimated_delay_hours,
        "detectedAt": d.detected_at.isoformat() if d.detected_at else None,
        "solutions": d.solutions,
        "affectedShipments": d.affected_shipments,
    }


def _log(db, user, action, entity_id, details):
    db.add(models.ActivityLog(
        id="LOG-" + uuid.uuid4().hex[:8].upper(),
        user_id=user.id, user_name=user.name, role=user.role,
        action=action, entity="Disruption", entity_id=entity_id, details=details,
    ))


@router.get("", response_model=List[dict])
def list_disruptions(
    current_user: models.User = Depends(require_any),
    db: Session = Depends(get_db),
):
    return [_dis_to_dict(d) for d in db.query(models.Disruption).all()]


@router.post("/{dis_id}/resolve")
def resolve_disruption(
    dis_id: str,
    body: schemas.ResolveRequest,
    current_user: models.User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    dis = db.query(models.Disruption).filter(models.Disruption.id == dis_id).first()
    if not dis:
        raise HTTPException(404, "Disruption not found")

    solution = next((s for s in dis.solutions if s["id"] == body.solution_id), None)
    if not solution:
        raise HTTPException(404, "Solution not found")

    # Update each affected shipment
    for ship_id in dis.affected_shipments:
        ship = db.query(models.Shipment).filter(models.Shipment.id == ship_id).first()
        if ship:
            ship.status        = "at_risk"
            ship.disruption_id = None
            ship.applied_solution = solution

            # Notify the operator
            if ship.operator_id:
                db.add(models.Notification(
                    id="NOTIF-" + uuid.uuid4().hex[:8].upper(),
                    user_id=ship.operator_id,
                    type="solution_selected",
                    title="Your Manager Has Selected a Solution",
                    message='For disruption: "' + dis.title + '"',
                    disruption_title=dis.title,
                    shipment_id=ship.id,
                    read=False,
                    _solution=None,
                ))
                notif = db.query(models.Notification).order_by(
                    models.Notification.created_at.desc()).first()
                if notif:
                    notif.solution = solution

    _log(db, current_user, "RESOLVE_DISRUPTION", dis_id,
         'Resolved "' + dis.title + '" with solution "' + solution["title"] + '"')

    db.delete(dis)
    db.commit()
    return {"ok": True, "message": "Solution applied. Operators notified."}


@router.post("/trigger-demo")
def trigger_demo(
    current_user: models.User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    if db.query(models.Disruption).filter(models.Disruption.id == "DIS-DEMO").first():
        raise HTTPException(409, "Demo disruption already active.")

    target = db.query(models.Shipment).filter(
        models.Shipment.status == "on_time"
    ).first()
    if not target:
        raise HTTPException(404, "No on-time shipment available for demo.")

    demo = models.Disruption(
        id="DIS-DEMO", type="strike",
        title="Port Strike - Rotterdam",
        description=(
            "Dock workers at Port of Rotterdam have initiated a 48-hour strike. "
            "All vessel entries suspended. " + target.id + " route affected."
        ),
        severity="high", location_lat=51.9244, location_lng=4.4777,
        estimated_delay_hours=48, detected_at=datetime.utcnow(),
    )
    demo.solutions = [
        {
            "id": "SOL-DEMO-A", "title": "Divert to Port of Antwerp",
            "description": "Redirect to Antwerp (50 km away). Fully operational, berths available.",
            "pros": ["Port fully operational", "Only 50 km detour", "Minimal delay"],
            "cons": ["Ground transport to Rotterdam needed"],
            "extraTimeHours": 12, "extraCostUSD": 8500, "riskScore": 10, "recommended": True,
        },
        {
            "id": "SOL-DEMO-B", "title": "Wait for Strike Resolution",
            "description": "Anchor offshore and wait for union negotiations.",
            "pros": ["No rerouting cost"],
            "cons": ["48h+ uncertain delay", "Berth holding fees"],
            "extraTimeHours": 48, "extraCostUSD": 3200, "riskScore": 55, "recommended": False,
        },
    ]
    demo.affected_shipments = [target.id]

    target.status        = "disrupted"
    target.disruption_id = "DIS-DEMO"

    db.add(demo)
    db.add(models.ActivityLog(
        id="LOG-" + uuid.uuid4().hex[:8].upper(),
        user_id=current_user.id, user_name=current_user.name, role=current_user.role,
        action="DISRUPTION_DETECTED", entity="Disruption", entity_id="DIS-DEMO",
        details="Demo disruption triggered: Port Strike - Rotterdam (High severity)",
    ))
    db.commit()

    # Sync to Firestore for real-time frontend updates
    write_disruption_to_firestore(_dis_to_dict(demo))

    return {"ok": True, "disruption": _dis_to_dict(demo)}
