"""
Creates the seeded ChainShield accounts in Firebase Auth
so they can log in via Firebase email/password.

Run once from the backend folder:
  python create_firebase_users.py
"""
import os, sys
os.environ.setdefault("GOOGLE_APPLICATION_CREDENTIALS", "serviceAccountKey.json")

try:
    import firebase_admin
    from firebase_admin import credentials, auth
except ImportError:
    print("ERROR: firebase-admin not installed. Run: pip install firebase-admin")
    sys.exit(1)

# Init Firebase Admin
cred = credentials.Certificate("serviceAccountKey.json")
try:
    firebase_admin.initialize_app(cred)
except ValueError:
    pass  # already initialised

SEED_USERS = [
    {"email": "admin@chainshield.io",    "password": "admin123",    "display_name": "Alex Admin"},
    {"email": "manager@chainshield.io",  "password": "manager123",  "display_name": "Maria Manager"},
    {"email": "operator@chainshield.io", "password": "op123",       "display_name": "Omar Operator"},
    {"email": "operator2@chainshield.io","password": "op123",       "display_name": "Priya Patel"},
]

for u in SEED_USERS:
    try:
        user = auth.get_user_by_email(u["email"])
        print(f"  EXISTS : {u['email']} (uid={user.uid})")
    except auth.UserNotFoundError:
        try:
            user = auth.create_user(
                email=u["email"],
                password=u["password"],
                display_name=u["display_name"],
                email_verified=True,
            )
            print(f"  CREATED: {u['email']} (uid={user.uid})")
        except Exception as e:
            print(f"  ERROR  : {u['email']} -> {e}")

print("\nDone. All seeded accounts are now in Firebase Auth.")
print("You can now log in with admin@chainshield.io / admin123")
