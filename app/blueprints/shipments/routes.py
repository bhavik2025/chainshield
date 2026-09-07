from flask import Blueprint, render_template
from flask_login import login_required

from app.models import Shipment

shipments_bp = Blueprint("shipments", __name__)


@shipments_bp.route("/")
@login_required
def index():
    shipments = Shipment.query.order_by(Shipment.created_at.desc()).all()
    return render_template("shipments/index.html", shipments=shipments)
