from functools import wraps

from flask import Blueprint, render_template, request, redirect, url_for, flash, current_app, abort
from flask_login import login_required, current_user

from app.extensions import db, socketio
from app.models import User, Hub, Shipment, Disruption, ActivityLog

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


@main_bp.route("/dashboard")
@login_required
def dashboard():
    if current_user.role != "admin":
        return render_template("dashboard_simple.html")

    shipments = Shipment.query.all()
    total_shipments = len(shipments) or 1  # avoid a divide-by-zero in the progress bars

    total_cargo_value = sum(s.cargo_value or 0 for s in shipments)
    value_at_risk = sum(
        (s.cargo_value or 0) for s in shipments if s.risk_level in ("AT-RISK", "MEDIUM", "HIGH")
    )

    on_time = sum(1 for s in shipments if s.risk_level in (None, "LOW"))
    at_risk = sum(1 for s in shipments if s.risk_level in ("AT-RISK", "MEDIUM"))
    disrupted = sum(1 for s in shipments if s.risk_level == "HIGH")

    mode_counts = {"Sea": 0, "Air": 0, "Road": 0, "Rail": 0}
    for s in shipments:
        if s.transport_mode in mode_counts:
            mode_counts[s.transport_mode] += 1

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
        mode_counts=mode_counts,
        recent_activity=recent_activity,
        total_shipments=total_shipments,
    )


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
