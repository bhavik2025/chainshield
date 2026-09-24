from datetime import datetime

from flask import Blueprint, render_template, redirect, url_for, flash, request, abort
from flask_login import login_required, current_user

from app.extensions import db, socketio
from app.models import Disruption, ActivityLog, Shipment
from app.services.notifier import notify_users

disruptions_bp = Blueprint("disruptions", __name__)

FIELD_OPERATOR_ROLES = ["captain", "pilot", "driver", "loco_pilot"]


def _scoped(query):
    """Field operators only see disruptions on their own shipments."""
    if current_user.role in FIELD_OPERATOR_ROLES:
        query = query.join(Shipment, Disruption.shipment_id == Shipment.id).filter(
            Shipment.assigned_operator_id == current_user.id
        )
    return query


@disruptions_bp.route("/")
@login_required
def index():
    open_disruptions = (
        _scoped(Disruption.query.filter(Disruption.status == "Open"))
        .order_by(Disruption.risk_score.desc()).all()
    )
    resolved_disruptions = (
        _scoped(Disruption.query.filter(Disruption.status == "Resolved"))
        .order_by(Disruption.resolved_at.desc()).limit(15).all()
    )
    return render_template(
        "disruptions/index.html",
        open_disruptions=open_disruptions,
        resolved_disruptions=resolved_disruptions,
    )


@disruptions_bp.route("/scan", methods=["POST"])
@login_required
def scan_now():
    """Run one risk-engine pass on demand (same code path as the scheduler)."""
    if current_user.role not in ("admin", "manager"):
        abort(403)
    from app.services.risk_engine import scan_all_shipments

    result = scan_all_shipments()
    flash(
        f"Scan complete — {result['scanned']} shipment(s) scored, "
        f"{result['disruptions_created']} new disruption(s), {result['delivered']} delivered.",
        "info",
    )
    return redirect(request.referrer or url_for("disruptions.index"))


@disruptions_bp.route("/<int:disruption_id>/resolve", methods=["POST"])
@login_required
def resolve(disruption_id):
    if current_user.role not in ("admin", "manager"):
        abort(403)
    disruption = Disruption.query.get_or_404(disruption_id)
    if disruption.status != "Open":
        flash("That disruption is already resolved.", "info")
        return redirect(url_for("disruptions.index"))

    option_no = request.form.get("option_no", type=int)
    chosen = None
    for sol in disruption.solutions:
        sol.selected = sol.option_no == option_no
        if sol.selected:
            chosen = sol

    shipment = disruption.shipment
    disruption.status = "Resolved"
    disruption.resolved_at = datetime.utcnow()
    disruption.resolved_by = current_user.id
    decision = chosen.description if chosen else "an unspecified option"

    # Applying a "hold" option puts the shipment on hold; any other keeps it moving.
    if chosen and chosen.description.lower().startswith("hold"):
        shipment.status = "On-hold"

    db.session.add(ActivityLog(
        user_id=current_user.id,
        action=f"{current_user.name} resolved the disruption on {shipment.tracking_no} via '{decision}'",
    ))
    db.session.commit()

    if shipment.assigned_operator_id:
        notify_users(
            [shipment.assigned_operator_id],
            f"New instruction for {shipment.tracking_no}: {decision} (decided by {current_user.name}).",
        )
    socketio.emit("shipments_updated", {"reason": "resolved"})
    flash(f"Disruption on {shipment.tracking_no} resolved: {decision}.", "success")
    return redirect(url_for("disruptions.index"))
