"""
Seed the database on first run.
Creates demo accounts and populates lookup tables.
Safe to call multiple times — skips if data already exists.
"""
import uuid
import random
from sqlalchemy.orm import Session
import models
from auth import hash_password


def _gen_chat_number(db) -> str:
    for _ in range(200):
        num = str(random.randint(10000, 99999))
        if not db.query(models.User).filter(models.User.chat_number == num).first():
            return num
    return "10000"


# Demo accounts for the Solution Challenge submission
DEMO_USERS = [
    dict(name="Admin User",     email="admin@chainshield.com",   password="demo1234", role="admin",    operator_type=None,        company="ChainShield HQ"),
    dict(name="Manager User",   email="manager@chainshield.com", password="demo1234", role="manager",  operator_type=None,        company="ChainShield HQ"),
    dict(name="Ship Captain",   email="captain@chainshield.com", password="demo1234", role="operator", operator_type="Captain",   company="OceanFreight Ltd"),
    dict(name="Air Pilot",      email="pilot@chainshield.com",   password="demo1234", role="operator", operator_type="Pilot",     company="SkyLogistics Inc"),
    dict(name="Truck Driver",   email="driver@chainshield.com",  password="demo1234", role="operator", operator_type="Driver",    company="RoadHaul Co"),
    dict(name="Loco Pilot",     email="loco@chainshield.com",    password="demo1234", role="operator", operator_type="Loco Pilot", company="RailExpress Ltd"),
]


def seed(db: Session):
    if db.query(models.User).count() > 0:
        # Ensure all demo accounts exist even if DB was previously seeded
        _ensure_demo_accounts(db)
        return

    print("[ChainShield] Seeding initial data...")

    # Create all demo accounts
    for u in DEMO_USERS:
        user = models.User(
            id=f"USR-{uuid.uuid4().hex[:8].upper()}",
            name=u["name"],
            email=u["email"],
            password_hash=hash_password(u["password"]),
            role=u["role"],
            operator_type=u["operator_type"],
            company=u["company"],
            active=True,
            chat_number=_gen_chat_number(db),
        )
        db.add(user)

    # Legacy personal admin (kept for backwards compatibility)
    admin = models.User(
        id=f"USR-{uuid.uuid4().hex[:8].upper()}",
        name="Bhavik Visani",
        email="bhavik@gmail.com",
        password_hash=hash_password("Chain@123"),
        role="admin",
        company="ChainShield",
        active=True,
        chat_number=_gen_chat_number(db),
    )
    db.add(admin)

    # Base logistics hubs
    hubs = [
        ("Shanghai",    "China",       31.2304,  121.4737),
        ("Singapore",   "Singapore",    1.3521,  103.8198),
        ("Rotterdam",   "Netherlands", 51.9244,    4.4777),
        ("Los Angeles", "USA",         34.0522, -118.2437),
        ("Dubai",       "UAE",         25.2048,   55.2708),
        ("Mumbai",      "India",       19.0760,   72.8777),
        ("Frankfurt",   "Germany",     50.1109,    8.6821),
        ("Tokyo",       "Japan",       35.6762,  139.6503),
        ("New York",    "USA",         40.7128,  -74.0060),
        ("Hamburg",     "Germany",     53.5511,    9.9937),
        ("Hong Kong",   "China",       22.3193,  114.1694),
        ("London",      "UK",          51.5074,   -0.1278),
        ("Paris",       "France",      48.8566,    2.3522),
        ("Delhi",       "India",       28.6139,   77.2090),
        ("Detroit",     "USA",         42.3314,  -83.0458),
        ("Istanbul",    "Turkey",      41.0082,   28.9784),
        ("Sydney",      "Australia",  -33.8688,  151.2093),
        ("Sao Paulo",   "Brazil",     -23.5505,  -46.6333),
        ("Chicago",     "USA",         41.8781,  -87.6298),
        ("Osaka",       "Japan",       34.6937,  135.5023),
    ]
    db.add_all([models.BaseCity(city=c, country=cn, lat=la, lng=ln) for c, cn, la, ln in hubs])

    # Cargo types
    cargo_types = [
        "Consumer Electronics", "Pharmaceuticals", "Automotive Components", "Textiles",
        "Agriculture / Food", "Luxury Goods", "Medical Devices", "Machinery / Industrial",
        "Chemicals", "Oil & Gas", "Construction Materials", "Apparel / Fashion",
        "Furniture", "Plastics", "Paper / Pulp", "Raw Materials",
        "Refrigerated Goods", "Hazardous Materials", "E-Commerce Parcels", "Other",
    ]
    db.add_all([models.CargoType(name=n) for n in cargo_types])

    db.commit()
    print("[ChainShield] Seed complete.")
    print("[ChainShield] Demo accounts: admin@chainshield.com / demo1234  |  manager@chainshield.com / demo1234")
    print("[ChainShield] Also: captain / pilot / driver / loco @chainshield.com  (password: demo1234)")


def _ensure_demo_accounts(db: Session):
    """Upsert demo accounts so they always exist, even on a previously-seeded DB."""
    changed = False
    for u in DEMO_USERS:
        existing = db.query(models.User).filter(models.User.email == u["email"]).first()
        if not existing:
            user = models.User(
                id=f"USR-{uuid.uuid4().hex[:8].upper()}",
                name=u["name"],
                email=u["email"],
                password_hash=hash_password(u["password"]),
                role=u["role"],
                operator_type=u["operator_type"],
                company=u["company"],
                active=True,
                chat_number=_gen_chat_number(db),
            )
            db.add(user)
            changed = True
            print(f"[ChainShield] Created missing demo account: {u['email']}")
    if changed:
        db.commit()
