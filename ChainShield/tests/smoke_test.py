"""
ChainShield smoke test: end-to-end checks of every module and role.

Runs the real app with the "testing" config (in-memory SQLite, CSRF off, no
simulated movement unless a check turns it on), seeds the demo data, then
drives it through Flask's test client and the Socket.IO test client.
No internet is needed: the Gemini and OpenWeatherMap keys are blanked, so
the offline assistant and the simulated weather are used.

    cd ChainShield
    python tests/smoke_test.py

Prints PASS/FAIL per check and exits with code 1 if anything failed.
"""
import os
import random
import sys

from flask import g

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app  # noqa: E402
from app.extensions import db, socketio  # noqa: E402
from app.models import (  # noqa: E402
    ActivityLog, CargoType, Disruption, Hub, Message, Notification, Shipment, User,
)

PASSWORD = "demo1234"
results = []


def check(name, condition):
    results.append((bool(condition), name))
    print(f"{'PASS' if condition else 'FAIL'}  {name}")


def status_is(client, method, url, expected, name=None, **kwargs):
    resp = getattr(client, method)(url, **kwargs)
    codes = expected if isinstance(expected, tuple) else (expected,)
    check(name or f"{method.upper()} {url} -> {codes}", resp.status_code in codes)
    return resp


def login(client, email, password=PASSWORD):
    client.get("/auth/logout")
    return client.post("/auth/login", data={"email": email, "password": password})


def user_id(email):
    return User.query.filter_by(email=email).first().id


random.seed(42)
app = create_app("testing")
app.config.update(GEMINI_API_KEY="", OPENWEATHER_API_KEY="")


@app.teardown_request
def _forget_login(_exc):
    # The script keeps one app context open so it can query models between
    # requests; requests then share flask.g, so drop Flask-Login's cached user
    # and let each request load its own from its session cookie.
    g.pop("_login_user", None)


cli = app.test_cli_runner()
cli.invoke(args=["init-db"])
cli.invoke(args=["seed-db"])
ctx = app.app_context()
ctx.push()

from app.services import risk_engine, sea_route  # noqa: E402
from app.services.risk_engine import classify_risk, compute_risk_score, scan_all_shipments, scan_shipment  # noqa: E402
from app.services.route_solver import build_candidates, haversine_km  # noqa: E402

# ------------------------------------------------------------- seed data
print("\n== Seed data")
check("6 demo users seeded", User.query.count() == 6)
check("10 hubs seeded", Hub.query.count() == 10)
check("4 cargo types seeded", CargoType.query.count() == 4)
check("6 demo shipments seeded", Shipment.query.count() == 6)
operator_for_mode = {"Road": "driver", "Rail": "loco_pilot", "Air": "pilot", "Sea": "captain"}
check("each demo shipment has the operator matching its mode",
      all(s.assigned_operator and s.assigned_operator.role == operator_for_mode[s.transport_mode]
          for s in Shipment.query.all()))
check("passwords stored as hashes, not plain text",
      all(u.password_hash != PASSWORD and u.check_password(PASSWORD) for u in User.query.all()))

# ----------------------------------------------------------- risk engine
print("\n== Risk engine")
cfg = app.config
check("risk weights add up to 1.0", abs(cfg["RISK_WEIGHT_WEATHER"] + cfg["RISK_WEIGHT_CONGESTION"]
                                        + cfg["RISK_WEIGHT_CARGO"] + cfg["RISK_WEIGHT_HISTORY"] - 1) < 1e-9)
check("TC002: 80/60/50/40 scores 63.0", compute_risk_score(80, 60, 50, 40) == 63.0)
check("TC002: 63.0 is MEDIUM", classify_risk(63.0) == "MEDIUM")
for score, level in [(0, "LOW"), (29.99, "LOW"), (30, "AT-RISK"), (49.99, "AT-RISK"),
                     (50, "MEDIUM"), (69.99, "MEDIUM"), (70, "HIGH"), (100, "HIGH")]:
    check(f"classify_risk({score}) is {level}", classify_risk(score) == level)
check("all-zero factors score 0", compute_risk_score(0, 0, 0, 0) == 0)
check("all-100 factors score 100", compute_risk_score(100, 100, 100, 100) == 100)

ahd, mum = Hub.query.filter_by(name="Ahmedabad Hub").first(), Hub.query.filter_by(name="Mumbai Hub").first()
km = haversine_km((ahd.lat, ahd.lng), (mum.lat, mum.lng))
check(f"haversine Ahmedabad-Mumbai is about 440 km ({km:.0f})", 420 < km < 460)
check("haversine of a point to itself is 0", haversine_km((ahd.lat, ahd.lng), (ahd.lat, ahd.lng)) == 0)

# Controlled factors: hazardous cargo (90) on CS-1003; first MEDIUM, then HIGH.
cs1003 = Shipment.query.filter_by(tracking_no="CS-1003").first()
real_weather, real_congestion = risk_engine.get_weather_severity, risk_engine._get_congestion_level
risk_engine.get_weather_severity = lambda lat, lng: 50.0
risk_engine._get_congestion_level = lambda mode: 50.0
d1 = scan_shipment(cs1003)
db.session.commit()
check("a MEDIUM score opens a disruption", d1 is not None and cs1003.risk_level == "MEDIUM")
check("the new disruption is Open and MEDIUM", d1 and d1.status == "Open" and d1.severity == "MEDIUM")
check("disruption type is the dominant factor (Cargo)", d1 and d1.type == "Cargo")
check("at least 3 ranked route options generated", d1 and len(d1.solutions) >= 3)
check("scanning again at MEDIUM opens no duplicate", scan_shipment(cs1003) is None
      and Disruption.query.filter_by(shipment_id=cs1003.id, status="Open").count() == 1)
risk_engine.get_weather_severity = lambda lat, lng: 100.0
risk_engine._get_congestion_level = lambda mode: 100.0
scan_shipment(cs1003)
db.session.commit()
check("rising to HIGH escalates the open disruption", d1.severity == "HIGH" and cs1003.risk_level == "HIGH")
check("escalation re-plans the route options", len(d1.solutions) >= 3
      and all(s.risk_score <= d1.risk_score for s in d1.solutions))
check("escalation still keeps a single open disruption",
      Disruption.query.filter_by(shipment_id=cs1003.id, status="Open").count() == 1)
check("history factor rises after a disruption on the lane", risk_engine._get_history_score(cs1003) == 27)
risk_engine.get_weather_severity, risk_engine._get_congestion_level = real_weather, real_congestion

# ---------------------------------------------------------- route solver
print("\n== Route solver")
cands = build_candidates(d1)
check("candidates are sorted best-first", [c["score"] for c in cands] == sorted(c["score"] for c in cands))
cont = next(c for c in cands if c["description"].startswith("Continue"))
hold = next(c for c in cands if c["description"].startswith("Hold"))
check("Continue keeps the full risk at zero time and cost",
      cont["risk_score"] == round(d1.risk_score, 2) and cont["extra_time_hours"] == 0 and cont["extra_cost"] == 0)
check("Hold cuts residual risk to 15%", hold["risk_score"] == round(d1.risk_score * 0.15, 2))
check("Hold costs Rs 800 per hour", hold["extra_cost"] == round(hold["extra_time_hours"] * 800, 2))
check("a reroute via another hub is offered", any(c["description"].startswith("Reroute via") for c in cands))
check("a Road shipment is offered a switch to Rail", any("from Road to Rail" in c["description"] for c in cands))
air = Shipment.query.filter_by(transport_mode="Air").first()
air_d = Disruption(shipment_id=air.id, type="Weather", severity="HIGH", risk_score=75)
db.session.add(air_d)
db.session.flush()
check("an Air shipment gets no mode-switch option",
      not any(c["description"].startswith("Switch") for c in build_candidates(air_d)))
db.session.rollback()

print("\n== Sea routing")
mumbai_hub, sydney = (19.08, 72.88), (-33.8688, 151.2093)
sea = sea_route.route_path("Sea", mumbai_hub, sydney)
check("a Sea route follows shipping lanes, not a straight line", len(sea) > 10)
check("Mumbai to Sydney rounds the south of Sri Lanka", any(lat < 6.5 and 79 < lng < 83 for lat, lng in sea))
check("Mumbai to Sydney never crosses mainland Australia",
      not any(-30 < lat < -20 and 120 < lng < 145 for lat, lng in sea))
pos, arrived, steps = mumbai_hub, False, 0
while not arrived and steps < 5000:
    pos, arrived = sea_route.advance(sea, pos, 0.15)
    steps += 1
check("a ship sails the whole route to Sydney and arrives", arrived and abs(pos[0] - sydney[0]) < 1e-6)
pacific = sea_route.route_path("Sea", (13.08, 80.27), (33.74, -118.24))
check("a route across the Pacific has no jump at 180 degrees",
      all(abs(b[1] - a[1]) < 180 for a, b in zip(pacific, pacific[1:])))
check("Road, Rail and Air keep the straight line", sea_route.route_path("Air", mumbai_hub, sydney) == [mumbai_hub, sydney])

# --------------------------------------------------- public pages + auth
print("\n== Public pages and login")
c = app.test_client()
for url in ["/", "/auth/login", "/auth/register"]:
    status_is(c, "get", url, 200)
resp = status_is(c, "get", "/health", 200)
check("/health reports ok", resp.get_json().get("status") == "ok")
resp = c.get("/dashboard")
check("anonymous /dashboard redirects to login", resp.status_code == 302 and "/auth/login" in resp.location)
resp = c.post("/auth/login", data={"email": "admin@chainshield.com", "password": "wrong"}, follow_redirects=True)
check("wrong password is refused", b"Invalid email or password" in resp.data)
c.post("/auth/register", data={"name": "Self Admin", "email": "self@x.com", "password": "secret1", "role": "admin"})
check("self-registering as admin becomes manager", User.query.filter_by(email="self@x.com").first().role == "manager")
c.post("/auth/register", data={"name": "Dup", "email": "self@x.com", "password": "secret1", "role": "driver"})
check("duplicate e-mail is refused", User.query.filter_by(email="self@x.com").count() == 1)
c.post("/auth/register", data={"name": "Short", "email": "short@x.com", "password": "123", "role": "driver"})
check("password under 6 characters is refused", User.query.filter_by(email="short@x.com").first() is None)
resp = login(c, "admin@chainshield.com")
check("admin logs in and goes to the dashboard", resp.status_code == 302 and "/dashboard" in resp.location)
check("login is written to the activity log", ActivityLog.query.filter(ActivityLog.action.like("%logged in")).count() >= 1)

# ------------------------------------------------------------ admin pages
print("\n== Admin pages")
for url in ["/dashboard", "/dashboard/api/stats", "/dashboard/users", "/dashboard/shipments", "/dashboard/hubs",
            "/dashboard/hubs/1/edit", "/dashboard/cargo", "/dashboard/config", "/dashboard/activity", "/reports",
            "/reports?from=2026-01-01&to=2026-12-31", "/shipments/", "/shipments/new", "/shipments/1",
            "/shipments/1/edit", "/shipments/map", "/disruptions/", "/notifications/", "/chat/", "/chat/2",
            "/assistant/"]:
    status_is(c, "get", url, 200)
stats = c.get("/dashboard/api/stats").get_json()
check("stats API returns the 4 chart datasets", stats and all(k in stats for k in ("risk", "modes", "factors", "trend")))
for kind in ["shipment-risk", "disruptions", "activity-log"]:
    resp = c.get(f"/reports/{kind}.csv")
    check(f"{kind}.csv downloads as CSV", resp.status_code == 200 and resp.mimetype == "text/csv")
status_is(c, "get", "/reports/unknown.csv", 404, "an unknown report kind gives 404")
status_is(c, "get", "/no-such-page", 404, "an unknown page gives the 404 page")

# ------------------------------------------------------------- admin CRUD
print("\n== Admin CRUD")
c.post("/dashboard/users/new", data={"name": "New Driver", "email": "nd@x.com", "password": "secret1", "role": "driver"})
check("admin creates a user", User.query.filter_by(email="nd@x.com").first() is not None)
nd = User.query.filter_by(email="nd@x.com").first()
c.post(f"/dashboard/users/{nd.id}/role", data={"role": "pilot"})
check("admin changes a user's role", db.session.get(User, nd.id).role == "pilot")
c.post("/dashboard/cargo", data={"name": "Pharma", "sensitivity_weight": "0.9"})
pharma = CargoType.query.filter_by(name="Pharma").first()
check("TC005: cargo type added", pharma is not None)
c.post(f"/dashboard/cargo/{pharma.id}/edit", data={"name": "Pharma", "sensitivity_weight": "0.85"})
check("TC005: cargo weight edited to 0.85", db.session.get(CargoType, pharma.id).sensitivity_weight == 0.85)
c.post("/dashboard/cargo", data={"name": "Bad", "sensitivity_weight": "1.5"})
check("TC005: weight 1.5 is rejected", CargoType.query.filter_by(name="Bad").first() is None)
c.post(f"/dashboard/cargo/{pharma.id}/delete")
check("TC005: unused cargo type deleted", db.session.get(CargoType, pharma.id) is None)
general = CargoType.query.filter_by(name="General").first()
c.post(f"/dashboard/cargo/{general.id}/delete")
check("a cargo type in use can't be deleted", db.session.get(CargoType, general.id) is not None)
c.post("/dashboard/hubs", data={"name": "Lucknow Hub", "location": "Lucknow, UP", "lat": "26.85", "lng": "80.95"})
lucknow = Hub.query.filter_by(name="Lucknow Hub").first()
check("admin adds a hub", lucknow is not None)
c.post(f"/dashboard/hubs/{lucknow.id}/edit", data={"name": "Lucknow Hub", "location": "Lucknow", "lat": "26.85", "lng": "80.95"})
check("admin edits a hub", db.session.get(Hub, lucknow.id).location == "Lucknow")
c.post(f"/dashboard/hubs/{lucknow.id}/delete")
check("an unused hub is deleted", db.session.get(Hub, lucknow.id) is None)
c.post(f"/dashboard/hubs/{ahd.id}/delete")
check("a hub in use can't be deleted", db.session.get(Hub, ahd.id) is not None)

# ---------------------------------------------------------- shipment CRUD
print("\n== Shipments")
before = Shipment.query.count()
form = {"origin": "Ahmedabad", "destination": "Delhi", "transport_mode": "Road", "cargo_type_id": str(general.id),
        "cargo_value": "50000", "status": "In-transit", "assigned_operator_id": "0"}
resp = c.post("/shipments/new", data=form)
new = Shipment.query.order_by(Shipment.id.desc()).first()
check("manager/admin creates a shipment", resp.status_code == 302 and Shipment.query.count() == before + 1)
check("tracking number auto-generated as CS-1007", new.tracking_no == "CS-1007")
check("new shipment starts at its origin hub", (new.current_lat, new.current_lng) == (ahd.lat, ahd.lng))
check("new shipment is risk-scored on creation", new.risk_score > 0)
status_is(c, "post", "/shipments/new", 200, "same origin and destination is rejected",
          data=form | {"destination": "Ahmedabad"})
status_is(c, "post", "/shipments/new", 200, "a negative cargo value is rejected", data=form | {"cargo_value": "-5"})
check("rejected forms add no shipment", Shipment.query.count() == before + 1)
c.post(f"/shipments/{new.id}/edit", data=form | {"cargo_value": "75000", "tracking_no": new.tracking_no})
check("shipment edited", db.session.get(Shipment, new.id).cargo_value == 75000)
c.post(f"/shipments/{new.id}/delete")
check("shipment deleted", db.session.get(Shipment, new.id) is None)

# --------------------------------------------------- disruptions + decide
print("\n== Disruptions, demo mode and resolving")
resp = c.post("/disruptions/scan", follow_redirects=True)
check("Scan now runs a full scan", resp.status_code == 200 and b"Scan complete" in resp.data)
c.post("/disruptions/demo")
demo = Disruption.query.filter_by(status="Open").order_by(Disruption.id.desc()).first()
check("TC012: demo trigger opens a HIGH disruption", demo is not None and demo.severity == "HIGH")
check("TC012: demo disruption has ranked options", demo and len(demo.solutions) >= 3
      and sorted(s.option_no for s in demo.solutions) == list(range(1, len(demo.solutions) + 1)))
op_id = demo.shipment.assigned_operator_id
op_before = Notification.query.filter_by(user_id=op_id).count()
c.post(f"/disruptions/{demo.id}/resolve", data={"option_no": "1"})
db.session.refresh(demo)
check("TC004: disruption is Resolved", demo.status == "Resolved" and demo.resolved_at is not None)
check("TC004: resolved_by is the admin", demo.resolved_by == user_id("admin@chainshield.com"))
check("TC004: only option 1 is marked selected", [s.option_no for s in demo.solutions if s.selected] == [1])
check("TC004: the operator gets a notification", Notification.query.filter_by(user_id=op_id).count() == op_before + 1)
check("TC004: the decision is in the activity log",
      ActivityLog.query.filter(ActivityLog.action.like(f"%resolved the disruption on {demo.shipment.tracking_no}%")).count() == 1)
resp = c.post(f"/disruptions/{demo.id}/resolve", data={"option_no": "1"}, follow_redirects=True)
check("resolving twice is refused", b"already resolved" in resp.data)

# ------------------------------------------- notifications, chat, sockets
print("\n== Notifications, chat and real time")
unread = c.get("/notifications/api/unread").get_json()
check("unread API returns a count", isinstance(unread.get("count"), int))
c.post("/notifications/read-all")
check("mark all read leaves 0 unread", c.get("/notifications/api/unread").get_json()["count"] == 0)
suresh = user_id("suresh@chainshield.com")
status_is(c, "post", f"/chat/{suresh}/send", 201, "TC008: chat message sent", json={"content": "Hold CS-1001 at Surat"})
check("TC008: chat message stored", Message.query.filter_by(receiver_id=suresh, content="Hold CS-1001 at Surat").count() == 1)
status_is(c, "post", f"/chat/{suresh}/send", 400, "an empty chat message is refused", json={"content": "  "})
status_is(c, "post", f"/chat/{suresh}/send", 400, "a chat message over 2000 characters is refused", json={"content": "x" * 2001})
status_is(c, "post", f"/chat/{user_id('admin@chainshield.com')}/send", 404, "messaging yourself is refused", json={"content": "hi"})
sock = socketio.test_client(app, flask_test_client=c)
check("a logged-in user's socket connects", sock.is_connected())
c.post(f"/chat/{suresh}/send", json={"content": "live?"})
check("sender receives the chat_message event live", any(e["name"] == "chat_message" for e in sock.get_received()))
check("an anonymous socket is rejected", not socketio.test_client(app).is_connected())

# ------------------------------------------------------- AI assistant
print("\n== AI assistant (offline engine)")
resp = c.post("/assistant/ask", json={"question": "How is the risk score calculated?"}).get_json()
check("TC009: assistant answers offline without a key", resp["source"] == "offline" and "40% weather" in resp["answer"])
resp = c.post("/assistant/ask", json={"question": "Tell me about CS-1001"}).get_json()
check("assistant answers about a tracking number", "CS-1001" in resp["answer"])
resp = c.post("/assistant/ask", json={"question": "Give me a summary"}).get_json()
check("assistant gives an operations summary", "summary" in resp["answer"].lower())
status_is(c, "post", "/assistant/ask", 400, "an empty question is refused", json={"question": ""})

# --------------------------------------------------------- manager role
print("\n== Manager access")
login(c, "manisha@chainshield.com")
for url, code in [("/dashboard", 200), ("/reports", 200), ("/shipments/new", 200), ("/disruptions/", 200),
                  ("/dashboard/users", 403), ("/dashboard/config", 403), ("/dashboard/activity", 403)]:
    status_is(c, "get", url, code, f"manager GET {url} -> {code}")

# ---------------------------------------------------- field operator role
print("\n== Field operator access (driver)")
login(c, "suresh@chainshield.com")
mine = [s.id for s in Shipment.query.filter_by(assigned_operator_id=suresh)]
other = next(s.id for s in Shipment.query.all() if s.id not in mine)
for url, code in [("/dashboard", 200), ("/shipments/", 200), (f"/shipments/{mine[0]}", 200),
                  (f"/shipments/{other}", 404), ("/shipments/new", 403), (f"/shipments/{mine[0]}/edit", 403),
                  ("/reports", 403), ("/dashboard/users", 403), ("/shipments/map", 200), ("/chat/", 200),
                  ("/assistant/", 200), ("/disruptions/", 200)]:
    status_is(c, "get", url, code, f"TC007: driver GET {url} -> {code}")
live = c.get("/shipments/api/live").get_json()
check("driver's live map shows only their shipments", sorted(s["id"] for s in live["shipments"]) == sorted(mine))
c.post(f"/shipments/{mine[0]}/status", data={"status": "Delayed"})
check("driver updates the status of their own shipment", db.session.get(Shipment, mine[0]).status == "Delayed")
status_is(c, "post", f"/shipments/{other}/status", 403, "driver can't update another operator's shipment",
          data={"status": "Delayed"})
status_is(c, "post", "/disruptions/demo", 403, "driver can't trigger the demo")
status_is(c, "post", "/disruptions/scan", 403, "driver can't run a scan")
status_is(c, "post", f"/disruptions/{demo.id}/resolve", 403, "driver can't resolve a disruption", data={"option_no": "1"})

# ------------------------------------------------------------ deactivation
print("\n== User deactivation")
admin = app.test_client()
login(admin, "admin@chainshield.com")
rohit_client = app.test_client()
login(rohit_client, "rohit@chainshield.com")
status_is(rohit_client, "get", "/dashboard", 200, "pilot is logged in before deactivation")
admin.post(f"/dashboard/users/{user_id('rohit@chainshield.com')}/toggle-active")
check("TC011: admin deactivates the pilot", not User.query.filter_by(email="rohit@chainshield.com").first().is_active)
resp = rohit_client.get("/dashboard")
check("TC011: the open session is logged out", resp.status_code == 302 and "/auth/login" in resp.location)
resp = rohit_client.post("/auth/login", data={"email": "rohit@chainshield.com", "password": PASSWORD}, follow_redirects=True)
check("TC011: login is refused for a deactivated user", b"deactivated" in resp.data)
admin.post(f"/dashboard/users/{user_id('admin@chainshield.com')}/toggle-active")
check("admin can't deactivate their own account", User.query.filter_by(email="admin@chainshield.com").first().is_active)

# ---------------------------------------------------- simulated movement
print("\n== Simulated movement")
app.config["SIMULATE_MOVEMENT"] = True
cs1001 = Shipment.query.filter_by(tracking_no="CS-1001").first()
cs1001.status = "In-transit"  # the driver marked it Delayed above
db.session.commit()
start = (cs1001.current_lat, cs1001.current_lng)
scan_all_shipments()
check("a scan moves an in-transit shipment", (cs1001.current_lat, cs1001.current_lng) != start)
for _ in range(60):
    scan_all_shipments()
check("CS-1001 reaches Mumbai and is Delivered", cs1001.status == "Delivered"
      and (cs1001.current_lat, cs1001.current_lng) == (mum.lat, mum.lng))
check("delivered shipments have no open disruption",
      all(Disruption.query.filter_by(shipment_id=s.id, status="Open").count() == 0
          for s in Shipment.query.filter_by(status="Delivered")))
check("the sea shipment is still sailing along its lane",
      Shipment.query.filter_by(tracking_no="CS-1005").first().status == "In-transit")

ctx.pop()
failed = [name for ok, name in results if not ok]
print(f"\n{len(results)} checks, {len(results) - len(failed)} passed, {len(failed)} failed")
for name in failed:
    print("  FAILED:", name)
sys.exit(1 if failed else 0)
