import csv
import io
from datetime import datetime, timedelta
from functools import wraps

from flask import (Blueprint, render_template, request, redirect, url_for, flash, current_app, abort, jsonify,
                   Response)
from flask_login import login_required, current_user

from app.extensions import db, socketio
from app.models import User, Hub, Shipment, Disruption, ActivityLog, CargoType
from app.services.stats import chart_data

main_bp = Blueprint("main", __name__)

VALID_ROLES = ["admin", "manager", "captain", "pilot", "driver", "loco_pilot"]
FIELD_OPERATOR_ROLES = ["captain", "pilot", "driver", "loco_pilot"]


def admin_required(view):
    """Only the admin role can reach the management tabs on the dashboard."""

    @wraps(view)
    @login_required
    def wrapped(*args, **kwargs):
        if current_user.role != "admin":
            abort(403)
        return view(*args, **kwargs)

    return wrapped


@main_bp.route("/")
def index():
    return render_template("index.html")


def _my_shipments():
    """Field operators see only their assigned shipments; admins/managers see all."""
    q = Shipment.query
    if current_user.role in FIELD_OPERATOR_ROLES:
        q = q.filter_by(assigned_operator_id=current_user.id)
    return q.all()


@main_bp.route("/dashboard")
@login_required
def dashboard():
    if current_user.role != "admin":
        shipments = _my_shipments()
        ids = {s.id for s in shipments}
        open_disruptions = [
            d for d in Disruption.query.filter_by(status="Open").order_by(Disruption.risk_score.desc()).all()
            if d.shipment_id in ids
        ]
        watchlist = sorted(
            [s for s in shipments if s.status != "Delivered"], key=lambda s: s.risk_score or 0, reverse=True
        )[:8]
        return render_template(
            "dashboard_simple.html",
            charts=chart_data(shipments),
            stats_url=url_for("main.dashboard_stats"),
            open_disruptions=open_disruptions[:5],
            watchlist=watchlist,
        )

    shipments = Shipment.query.all()
    total_shipments = len(shipments) or 1  # avoid a divide-by-zero in the progress bars

    total_cargo_value = sum(s.cargo_value or 0 for s in shipments)
    value_at_risk = sum(
        (s.cargo_value or 0) for s in shipments
        if s.risk_level in ("AT-RISK", "MEDIUM", "HIGH") and s.status != "Delivered"
    )

    on_time = sum(1 for s in shipments if s.risk_level in (None, "LOW"))
    at_risk = sum(1 for s in shipments if s.risk_level in ("AT-RISK", "MEDIUM"))
    disrupted = sum(1 for s in shipments if s.risk_level == "HIGH")

    recent_activity = ActivityLog.query.order_by(ActivityLog.timestamp.desc()).limit(8).all()

    return render_template(
        "dashboard/overview.html",
        active_tab="overview",
        total_users=User.query.count(),
        active_shipments=Shipment.query.filter_by(status="In-transit").count(),
        active_disruptions=Disruption.query.filter_by(status="Open").count(),
        logistics_hubs=Hub.query.count(),
        total_cargo_value=total_cargo_value,
        value_at_risk=value_at_risk,
        managers=User.query.filter_by(role="manager").count(),
        field_operators=User.query.filter(User.role.in_(FIELD_OPERATOR_ROLES)).count(),
        status_counts={"On Time": on_time, "At Risk": at_risk, "Disrupted": disrupted},
        recent_activity=recent_activity,
        total_shipments=total_shipments,
        charts=chart_data(shipments),
        stats_url=url_for("main.dashboard_stats"),
    )


@main_bp.route("/dashboard/api/stats")
@login_required
def dashboard_stats():
    """Live chart data — refetched by the dashboard on every Socket.IO update."""
    shipments = Shipment.query.all() if current_user.role == "admin" else _my_shipments()
    return jsonify(chart_data(shipments))


@main_bp.route("/dashboard/users")
@admin_required
def dashboard_users():
    all_users = User.query.order_by(User.created_at.desc()).all()
    return render_template("dashboard/users.html", active_tab="users", users=all_users, roles=VALID_ROLES)


@main_bp.route("/dashboard/users/<int:user_id>/role", methods=["POST"])
@admin_required
def update_user_role(user_id):
    user = User.query.get_or_404(user_id)
    new_role = request.form.get("role")
    if new_role in VALID_ROLES and new_role != user.role:
        old_role = user.role
        user.role = new_role
        db.session.add(
            ActivityLog(
                user_id=current_user.id,
                action=f"{current_user.name} changed {user.name}'s role from {old_role} to {new_role}",
            )
        )
        db.session.commit()
        flash(f"Updated {user.name}'s role to {new_role}.", "success")
    return redirect(url_for("main.dashboard_users"))


@main_bp.route("/dashboard/shipments")
@admin_required
def dashboard_shipments():
    all_shipments = Shipment.query.order_by(Shipment.created_at.desc()).all()
    return render_template("dashboard/shipments.html", active_tab="shipments", shipments=all_shipments)


@main_bp.route("/dashboard/hubs", methods=["GET", "POST"])
@admin_required
def dashboard_hubs():
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        location = request.form.get("location", "").strip()
        lat = request.form.get("lat", type=float)
        lng = request.form.get("lng", type=float)
        if name:
            hub = Hub(name=name, location=location, lat=lat, lng=lng)
            db.session.add(hub)
            db.session.add(ActivityLog(user_id=current_user.id, action=f"{current_user.name} added logistics hub: {name}"))
            db.session.commit()
            flash(f"Added hub: {name}.", "success")
        else:
            flash("Hub name is required.", "warning")
        return redirect(url_for("main.dashboard_hubs"))

    all_hubs = Hub.query.order_by(Hub.name).all()
    return render_template("dashboard/hubs.html", active_tab="hubs", hubs=all_hubs)


@main_bp.route("/dashboard/config")
@admin_required
def dashboard_config():
    cfg = current_app.config
    return render_template(
        "dashboard/config.html",
        active_tab="config",
        risk_weights={
            "Weather": cfg["RISK_WEIGHT_WEATHER"],
            "Congestion": cfg["RISK_WEIGHT_CONGESTION"],
            "Cargo": cfg["RISK_WEIGHT_CARGO"],
            "History": cfg["RISK_WEIGHT_HISTORY"],
        },
        scan_interval=cfg.get("RISK_SCAN_INTERVAL_SECONDS"),
        weather_key_set=bool(cfg.get("OPENWEATHER_API_KEY")),
        gemini_key_set=bool(cfg.get("GEMINI_API_KEY")),
        socketio_async_mode=socketio.async_mode,
        debug=current_app.debug,
    )


@main_bp.route("/dashboard/activity")
@admin_required
def dashboard_activity():
    logs = ActivityLog.query.order_by(ActivityLog.timestamp.desc()).limit(100).all()
    return render_template("dashboard/activity.html", active_tab="activity", logs=logs)


def _log(action):
    db.session.add(ActivityLog(user_id=current_user.id, action=f"{current_user.name} {action}"))


def manager_or_admin_required(view):
    @wraps(view)
    @login_required
    def wrapped(*args, **kwargs):
        if current_user.role not in ("admin", "manager"):
            abort(403)
        return view(*args, **kwargs)

    return wrapped


# ------------------------------------------------------------------ users
@main_bp.route("/dashboard/users/new", methods=["POST"])
@admin_required
def create_user():
    name = request.form.get("name", "").strip()
    email = request.form.get("email", "").strip().lower()
    password = request.form.get("password", "")
    role = request.form.get("role", "manager")
    phone = request.form.get("phone", "").strip() or None
    if not name or not email or len(password) < 6 or role not in VALID_ROLES:
        flash("Name, email, a valid role and a password of 6+ characters are required.", "warning")
    elif User.query.filter_by(email=email).first():
        flash("A user with that email already exists.", "warning")
    else:
        user = User(name=name, email=email, role=role, phone=phone)
        user.set_password(password)
        db.session.add(user)
        _log(f"created user {name} ({role})")
        db.session.commit()
        flash(f"User {name} created.", "success")
    return redirect(url_for("main.dashboard_users"))


@main_bp.route("/dashboard/users/<int:user_id>/toggle-active", methods=["POST"])
@admin_required
def toggle_user_active(user_id):
    user = User.query.get_or_404(user_id)
    if user.id == current_user.id:
        flash("You can't deactivate your own account.", "warning")
        return redirect(url_for("main.dashboard_users"))
    user.is_active = not user.is_active
    _log(f"{'re-activated' if user.is_active else 'deactivated'} user {user.name}")
    db.session.commit()
    flash(f"{user.name} is now {'active' if user.is_active else 'deactivated'}.", "success")
    return redirect(url_for("main.dashboard_users"))


# ------------------------------------------------------------------- hubs
def _hub_in_use(hub):
    city = hub.name.replace(" Hub", "")
    return Shipment.query.filter(
        db.or_(Shipment.hub_id == hub.id, Shipment.origin == city, Shipment.destination == city)
    ).count()


@main_bp.route("/dashboard/hubs/<int:hub_id>/edit", methods=["GET", "POST"])
@admin_required
def edit_hub(hub_id):
    hub = Hub.query.get_or_404(hub_id)
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        if not name:
            flash("Hub name is required.", "warning")
        else:
            hub.name = name
            hub.location = request.form.get("location", "").strip()
            hub.lat = request.form.get("lat", type=float)
            hub.lng = request.form.get("lng", type=float)
            _log(f"updated logistics hub: {name}")
            db.session.commit()
            flash(f"Hub {name} updated.", "success")
            return redirect(url_for("main.dashboard_hubs"))
    return render_template("dashboard/hub_edit.html", active_tab="hubs", hub=hub)


@main_bp.route("/dashboard/hubs/<int:hub_id>/delete", methods=["POST"])
@admin_required
def delete_hub(hub_id):
    hub = Hub.query.get_or_404(hub_id)
    used = _hub_in_use(hub)
    if used:
        flash(f"Can't delete {hub.name}: {used} shipment(s) use it.", "warning")
    else:
        _log(f"deleted logistics hub: {hub.name}")
        db.session.delete(hub)
        db.session.commit()
        flash(f"Hub {hub.name} deleted.", "info")
    return redirect(url_for("main.dashboard_hubs"))


# ------------------------------------------------------------ cargo types
@main_bp.route("/dashboard/cargo", methods=["GET", "POST"])
@admin_required
def dashboard_cargo():
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        weight = request.form.get("sensitivity_weight", type=float)
        if not name or weight is None or not 0 <= weight <= 1:
            flash("Name and a sensitivity weight between 0.0 and 1.0 are required.", "warning")
        elif CargoType.query.filter(db.func.lower(CargoType.name) == name.lower()).first():
            flash("That cargo type already exists.", "warning")
        else:
            db.session.add(CargoType(name=name, sensitivity_weight=weight))
            _log(f"added cargo type {name} (sensitivity {weight})")
            db.session.commit()
            flash(f"Cargo type {name} added.", "success")
        return redirect(url_for("main.dashboard_cargo"))
    cargo_types = CargoType.query.order_by(CargoType.name).all()
    usage = {c.id: Shipment.query.filter_by(cargo_type_id=c.id).count() for c in cargo_types}
    return render_template("dashboard/cargo.html", active_tab="cargo", cargo_types=cargo_types, usage=usage)


@main_bp.route("/dashboard/cargo/<int:cargo_id>/edit", methods=["POST"])
@admin_required
def edit_cargo(cargo_id):
    cargo = CargoType.query.get_or_404(cargo_id)
    name = request.form.get("name", "").strip()
    weight = request.form.get("sensitivity_weight", type=float)
    clash = CargoType.query.filter(db.func.lower(CargoType.name) == name.lower(), CargoType.id != cargo.id).first()
    if not name or weight is None or not 0 <= weight <= 1:
        flash("Name and a sensitivity weight between 0.0 and 1.0 are required.", "warning")
    elif clash:
        flash("Another cargo type already has that name.", "warning")
    else:
        cargo.name, cargo.sensitivity_weight = name, weight
        _log(f"updated cargo type {name} (sensitivity {weight})")
        db.session.commit()
        flash(f"Cargo type {name} updated.", "success")
    return redirect(url_for("main.dashboard_cargo"))


@main_bp.route("/dashboard/cargo/<int:cargo_id>/delete", methods=["POST"])
@admin_required
def delete_cargo(cargo_id):
    cargo = CargoType.query.get_or_404(cargo_id)
    used = Shipment.query.filter_by(cargo_type_id=cargo.id).count()
    if used:
        flash(f"Can't delete {cargo.name}: {used} shipment(s) use it.", "warning")
    else:
        _log(f"deleted cargo type {cargo.name}")
        db.session.delete(cargo)
        db.session.commit()
        flash(f"Cargo type {cargo.name} deleted.", "info")
    return redirect(url_for("main.dashboard_cargo"))


# ---------------------------------------------------------------- reports
def _date_range():
    """?from=YYYY-MM-DD&to=YYYY-MM-DD (inclusive); defaults to the last 30 days."""
    today = datetime.utcnow().date()
    try:
        start = datetime.strptime(request.args.get("from", ""), "%Y-%m-%d").date()
    except ValueError:
        start = today - timedelta(days=29)
    try:
        end = datetime.strptime(request.args.get("to", ""), "%Y-%m-%d").date()
    except ValueError:
        end = today
    if start > end:
        start, end = end, start
    return start, end, datetime.combine(start, datetime.min.time()), datetime.combine(end + timedelta(days=1), datetime.min.time())


def _resolution_hours(d):
    if d.resolved_at and d.detected_at:
        return round((d.resolved_at - d.detected_at).total_seconds() / 3600, 2)
    return None


def _report_data():
    start, end, dt_from, dt_to = _date_range()
    shipments = Shipment.query.order_by(Shipment.risk_score.desc()).all()
    disruptions = (Disruption.query.filter(Disruption.detected_at >= dt_from, Disruption.detected_at < dt_to)
                   .order_by(Disruption.detected_at.desc()).all())
    logs = (ActivityLog.query.filter(ActivityLog.timestamp >= dt_from, ActivityLog.timestamp < dt_to)
            .order_by(ActivityLog.timestamp.desc()).all())
    return start, end, shipments, disruptions, logs


@main_bp.route("/reports")
@manager_or_admin_required
def reports():
    start, end, shipments, disruptions, logs = _report_data()
    by_type, by_severity = {}, {}
    for d in disruptions:
        by_type[d.type] = by_type.get(d.type, 0) + 1
        by_severity[d.severity] = by_severity.get(d.severity, 0) + 1
    resolved = [h for h in (_resolution_hours(d) for d in disruptions) if h is not None]

    # Resolution time per decision-maker (who resolved, how many, how fast)
    per_user = {}
    for d in disruptions:
        h = _resolution_hours(d)
        if h is None or not d.resolved_by:
            continue
        per_user.setdefault(d.resolved_by, []).append(h)
    responders = []
    for uid, hours in per_user.items():
        u = db.session.get(User, uid)
        responders.append({"name": u.name if u else f"User {uid}", "role": u.role if u else "-",
                           "count": len(hours), "avg": round(sum(hours) / len(hours), 2)})
    responders.sort(key=lambda r: r["avg"])

    return render_template(
        "reports.html", start=start, end=end, shipments=shipments, disruptions=disruptions, logs=logs,
        by_type=by_type, by_severity=by_severity, responders=responders,
        open_count=sum(1 for d in disruptions if d.status == "Open"),
        avg_resolution=round(sum(resolved) / len(resolved), 2) if resolved else None,
        resolution_hours=_resolution_hours,
    )


def _csv_response(filename, header, rows):
    buf = io.StringIO()
    buf.write("\ufeff")  # BOM so Excel opens UTF-8 (₹, →) correctly
    writer = csv.writer(buf)
    writer.writerow(header)
    writer.writerows(rows)
    return Response(buf.getvalue(), mimetype="text/csv",
                    headers={"Content-Disposition": f"attachment; filename={filename}"})


@main_bp.route("/reports/<kind>.csv")
@manager_or_admin_required
def report_csv(kind):
    start, end, shipments, disruptions, logs = _report_data()
    stamp = f"{start:%Y%m%d}-{end:%Y%m%d}"
    if kind == "shipment-risk":
        return _csv_response(
            f"chainshield_shipment_risk_{datetime.utcnow():%Y%m%d}.csv",
            ["Tracking No", "Origin", "Destination", "Mode", "Cargo Type", "Status", "Risk Level",
             "Risk Score", "Cargo Value (INR)", "Operator", "Latitude", "Longitude"],
            [[s.tracking_no, s.origin, s.destination, s.transport_mode,
              s.cargo_type.name if s.cargo_type else "", s.status, s.risk_level, s.risk_score,
              s.cargo_value or 0, s.assigned_operator.name if s.assigned_operator else "",
              s.current_lat, s.current_lng] for s in shipments],
        )
    if kind == "disruptions":
        rows = []
        for d in disruptions:
            chosen = next((x for x in d.solutions if x.selected), None)
            resolver = db.session.get(User, d.resolved_by) if d.resolved_by else None
            rows.append([d.id, d.shipment.tracking_no, d.type, d.severity, d.risk_score, d.status,
                         d.detected_at.strftime("%Y-%m-%d %H:%M"),
                         d.resolved_at.strftime("%Y-%m-%d %H:%M") if d.resolved_at else "",
                         _resolution_hours(d) if _resolution_hours(d) is not None else "",
                         resolver.name if resolver else "", chosen.description if chosen else ""])
        return _csv_response(
            f"chainshield_disruptions_{stamp}.csv",
            ["ID", "Shipment", "Dominant Factor", "Severity", "Risk Score", "Status", "Detected (UTC)",
             "Resolved (UTC)", "Resolution Time (h)", "Resolved By", "Chosen Option"],
            rows,
        )
    if kind == "activity-log":
        return _csv_response(
            f"chainshield_activity_log_{stamp}.csv",
            ["Timestamp (UTC)", "User", "Action"],
            [[l.timestamp.strftime("%Y-%m-%d %H:%M:%S"), l.user.name if l.user else "System", l.action] for l in logs],
        )
    abort(404)
