from functools import wraps

from flask import Blueprint, render_template, redirect, url_for, flash, abort, jsonify
from flask_login import login_required, current_user

from app.extensions import db, socketio
from app.forms import ShipmentForm, StatusUpdateForm
from app.models import Shipment, Hub, CargoType, User, Disruption, ActivityLog
from app.services.risk_engine import scan_shipment, hub_for_city, _alert

shipments_bp = Blueprint("shipments", __name__)

FIELD_OPERATOR_ROLES = ["captain", "pilot", "driver", "loco_pilot"]
RISK_COLORS = {"HIGH": "#dc3545", "MEDIUM": "#fd7e14", "AT-RISK": "#ffc107", "LOW": "#198754"}


def manager_required(view):
    """Admins and managers can create, edit and delete shipments."""

    @wraps(view)
    @login_required
    def wrapped(*args, **kwargs):
        if current_user.role not in ("admin", "manager"):
            abort(403)
        return view(*args, **kwargs)

    return wrapped


def _visible_shipments_query():
    """Field operators only see shipments assigned to them."""
    q = Shipment.query
    if current_user.role in FIELD_OPERATOR_ROLES:
        q = q.filter_by(assigned_operator_id=current_user.id)
    return q


def _populate_choices(form):
    cities = sorted({h.name.replace(" Hub", "") for h in Hub.query.all()})
    form.origin.choices = [(c, c) for c in cities]
    form.destination.choices = [(c, c) for c in cities]
    form.cargo_type_id.choices = [(c.id, c.name) for c in CargoType.query.order_by(CargoType.name)]
    operators = User.query.filter(User.role.in_(FIELD_OPERATOR_ROLES)).order_by(User.name).all()
    form.assigned_operator_id.choices = [(0, "— Unassigned —")] + [
        (u.id, f"{u.name} ({u.role})") for u in operators
    ]


def _next_tracking_no():
    last = Shipment.query.filter(Shipment.tracking_no.like("CS-%")).order_by(Shipment.id.desc()).first()
    n = 1000
    if last:
        try:
            n = int(last.tracking_no.split("-")[1])
        except (IndexError, ValueError):
            n = 1000 + Shipment.query.count()
    candidate = f"CS-{n + 1}"
    while Shipment.query.filter_by(tracking_no=candidate).first():
        n += 1
        candidate = f"CS-{n + 1}"
    return candidate


def _apply_form(form, shipment):
    shipment.origin = form.origin.data
    shipment.destination = form.destination.data
    shipment.transport_mode = form.transport_mode.data
    shipment.cargo_type_id = form.cargo_type_id.data
    shipment.cargo_value = form.cargo_value.data or 0
    shipment.status = form.status.data
    shipment.assigned_operator_id = form.assigned_operator_id.data or None
    origin_hub = hub_for_city(form.origin.data)
    shipment.hub_id = origin_hub.id if origin_hub else None
    if form.current_lat.data is not None and form.current_lng.data is not None:
        shipment.current_lat, shipment.current_lng = form.current_lat.data, form.current_lng.data
    elif shipment.current_lat is None and origin_hub:
        shipment.current_lat, shipment.current_lng = origin_hub.lat, origin_hub.lng


@shipments_bp.route("/")
@login_required
def index():
    shipments = _visible_shipments_query().order_by(Shipment.created_at.desc()).all()
    return render_template("shipments/index.html", shipments=shipments)


@shipments_bp.route("/new", methods=["GET", "POST"])
@manager_required
def create():
    form = ShipmentForm()
    _populate_choices(form)
    if form.validate_on_submit():
        tracking_no = (form.tracking_no.data or "").strip().upper() or _next_tracking_no()
        if Shipment.query.filter_by(tracking_no=tracking_no).first():
            form.tracking_no.errors.append("That tracking number already exists.")
        else:
            shipment = Shipment(tracking_no=tracking_no)
            _apply_form(form, shipment)
            db.session.add(shipment)
            db.session.flush()
            disruption = scan_shipment(shipment) if shipment.status == "In-transit" else None
            db.session.add(ActivityLog(user_id=current_user.id,
                                       action=f"{current_user.name} created shipment {tracking_no} "
                                              f"({shipment.origin} → {shipment.destination})"))
            if disruption:
                _alert(disruption)
            db.session.commit()
            socketio.emit("shipments_updated", {"reason": "created"})
            flash(f"Shipment {tracking_no} created — initial risk: {shipment.risk_level} ({shipment.risk_score}).", "success")
            return redirect(url_for("shipments.detail", shipment_id=shipment.id))
    return render_template("shipments/form.html", form=form, title="New Shipment")


@shipments_bp.route("/<int:shipment_id>")
@login_required
def detail(shipment_id):
    shipment = _visible_shipments_query().filter_by(id=shipment_id).first_or_404()
    disruptions = (Disruption.query.filter_by(shipment_id=shipment.id)
                   .order_by(Disruption.detected_at.desc()).all())
    status_form = StatusUpdateForm(status=shipment.status)
    dest_hub = hub_for_city(shipment.destination)
    origin_hub = hub_for_city(shipment.origin)
    return render_template("shipments/detail.html", s=shipment, disruptions=disruptions,
                           status_form=status_form, origin_hub=origin_hub, dest_hub=dest_hub,
                           risk_color=RISK_COLORS.get(shipment.risk_level, "#6c757d"))


@shipments_bp.route("/<int:shipment_id>/edit", methods=["GET", "POST"])
@manager_required
def edit(shipment_id):
    shipment = Shipment.query.get_or_404(shipment_id)
    form = ShipmentForm(obj=shipment)
    _populate_choices(form)
    if not form.is_submitted():
        form.assigned_operator_id.data = shipment.assigned_operator_id or 0
    if form.validate_on_submit():
        new_no = (form.tracking_no.data or "").strip().upper() or shipment.tracking_no
        clash = Shipment.query.filter(Shipment.tracking_no == new_no, Shipment.id != shipment.id).first()
        if clash:
            form.tracking_no.errors.append("That tracking number already exists.")
        else:
            shipment.tracking_no = new_no
            _apply_form(form, shipment)
            db.session.add(ActivityLog(user_id=current_user.id,
                                       action=f"{current_user.name} updated shipment {shipment.tracking_no}"))
            db.session.commit()
            socketio.emit("shipments_updated", {"reason": "edited"})
            flash(f"Shipment {shipment.tracking_no} updated.", "success")
            return redirect(url_for("shipments.detail", shipment_id=shipment.id))
    return render_template("shipments/form.html", form=form, title=f"Edit {shipment.tracking_no}", shipment=shipment)


@shipments_bp.route("/<int:shipment_id>/delete", methods=["POST"])
@manager_required
def delete(shipment_id):
    shipment = Shipment.query.get_or_404(shipment_id)
    tracking_no = shipment.tracking_no
    for d in Disruption.query.filter_by(shipment_id=shipment.id).all():
        db.session.delete(d)  # route solutions cascade with the disruption
    db.session.delete(shipment)
    db.session.add(ActivityLog(user_id=current_user.id, action=f"{current_user.name} deleted shipment {tracking_no}"))
    db.session.commit()
    socketio.emit("shipments_updated", {"reason": "deleted"})
    flash(f"Shipment {tracking_no} deleted.", "info")
    return redirect(url_for("shipments.index"))


@shipments_bp.route("/<int:shipment_id>/scan", methods=["POST"])
@manager_required
def scan(shipment_id):
    shipment = Shipment.query.get_or_404(shipment_id)
    disruption = scan_shipment(shipment)
    if disruption:
        _alert(disruption)
    db.session.commit()
    socketio.emit("shipments_updated", {"reason": "scanned"})
    msg = f"Re-scanned {shipment.tracking_no}: {shipment.risk_level} ({shipment.risk_score})."
    if disruption:
        msg += " New disruption opened with route options."
    flash(msg, "warning" if disruption else "success")
    return redirect(url_for("shipments.detail", shipment_id=shipment.id))


@shipments_bp.route("/<int:shipment_id>/status", methods=["POST"])
@login_required
def update_status(shipment_id):
    """Assigned field operators (and managers/admins) can update the status."""
    shipment = Shipment.query.get_or_404(shipment_id)
    if current_user.role not in ("admin", "manager") and shipment.assigned_operator_id != current_user.id:
        abort(403)
    form = StatusUpdateForm()
    if form.validate_on_submit():
        old = shipment.status
        shipment.status = form.status.data
        db.session.add(ActivityLog(user_id=current_user.id,
                                   action=f"{current_user.name} changed {shipment.tracking_no} status {old} → {shipment.status}"))
        db.session.commit()
        socketio.emit("shipments_updated", {"reason": "status"})
        flash(f"{shipment.tracking_no} marked {shipment.status}.", "success")
    return redirect(url_for("shipments.detail", shipment_id=shipment.id))


# ---------------------------------------------------------------- live map
@shipments_bp.route("/map")
@login_required
def live_map():
    return render_template("shipments/map.html", risk_colors=RISK_COLORS)


@shipments_bp.route("/api/live")
@login_required
def live_data():
    """JSON feed for the Leaflet map (polled on load + on every Socket.IO update)."""
    shipments = []
    for s in _visible_shipments_query().all():
        if s.current_lat is None:
            continue
        o, d = hub_for_city(s.origin), hub_for_city(s.destination)
        shipments.append({
            "id": s.id,
            "tracking_no": s.tracking_no,
            "origin": s.origin,
            "destination": s.destination,
            "mode": s.transport_mode,
            "status": s.status,
            "risk_level": s.risk_level or "LOW",
            "risk_score": s.risk_score or 0,
            "color": RISK_COLORS.get(s.risk_level or "LOW", "#6c757d"),
            "lat": s.current_lat,
            "lng": s.current_lng,
            "origin_pos": [o.lat, o.lng] if o and o.lat is not None else None,
            "dest_pos": [d.lat, d.lng] if d and d.lat is not None else None,
            "url": url_for("shipments.detail", shipment_id=s.id),
        })
    hubs = [{"name": h.name, "location": h.location, "lat": h.lat, "lng": h.lng}
            for h in Hub.query.all() if h.lat is not None]
    return jsonify({"shipments": shipments, "hubs": hubs})
