from datetime import datetime

from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_required, current_user

from app.extensions import db
from app.models import Disruption, ActivityLog

disruptions_bp = Blueprint("disruptions", __name__)


@disruptions_bp.route("/")
@login_required
def index():
    open_disruptions = Disruption.query.filter_by(status="Open").order_by(Disruption.detected_at.desc()).all()
    resolved_disruptions = (
        Disruption.query.filter_by(status="Resolved").order_by(Disruption.resolved_at.desc()).limit(10).all()
    )
    return render_template(
        "disruptions/index.html",
        open_disruptions=open_disruptions,
        resolved_disruptions=resolved_disruptions,
    )


@disruptions_bp.route("/<int:disruption_id>/resolve", methods=["POST"])
@login_required
def resolve(disruption_id):
    disruption = Disruption.query.get_or_404(disruption_id)
    option_no = request.form.get("option_no", type=int)

    chosen = None
    for sol in disruption.solutions:
        sol.selected = sol.option_no == option_no
        if sol.selected:
            chosen = sol

    disruption.status = "Resolved"
    disruption.resolved_at = datetime.utcnow()
    disruption.resolved_by = current_user.id

    db.session.add(
        ActivityLog(
            user_id=current_user.id,
            action=(
                f"{current_user.name} resolved the disruption on {disruption.shipment.tracking_no} "
                f"via '{chosen.description if chosen else 'an unspecified option'}'"
            ),
        )
    )
    db.session.commit()
    flash(f"Disruption on {disruption.shipment.tracking_no} resolved.", "success")
    return redirect(url_for("disruptions.index"))
