"""
ChainShield — Firebase Admin SDK initialisation
Verifies Firebase ID tokens sent from the React frontend.

Setup:
  1. Go to Firebase Console → Project Settings → Service Accounts
  2. Click "Generate new private key" → save as backend/serviceAccountKey.json
  3. Set GOOGLE_APPLICATION_CREDENTIALS=serviceAccountKey.json in your .env

If no credentials are found the module falls back to legacy JWT verification
so local development with seeded accounts still works.
"""

import os, json, logging
from pathlib import Path

log = logging.getLogger(__name__)

_firebase_app = None
_firebase_available = False

def _init():
    global _firebase_app, _firebase_available
    try:
        import firebase_admin
        from firebase_admin import credentials

        # Already initialised
        if firebase_admin._apps:
            _firebase_app = firebase_admin.get_app()
            _firebase_available = True
            return

        sa_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS', 'serviceAccountKey.json')
        if Path(sa_path).exists():
            cred = credentials.Certificate(sa_path)
            _firebase_app = firebase_admin.initialize_app(cred)
            _firebase_available = True
            log.info('Firebase Admin initialised from %s', sa_path)
        else:
            # Try Application Default Credentials (Cloud Run automatically provides these)
            try:
                cred = credentials.ApplicationDefault()
                _firebase_app = firebase_admin.initialize_app(cred)
                _firebase_available = True
                log.info('Firebase Admin initialised via Application Default Credentials')
            except Exception as e:
                log.warning('Firebase Admin not initialised (no credentials): %s', e)
    except ImportError:
        log.warning('firebase-admin package not installed — Firebase token verification disabled')

_init()


def verify_firebase_token(id_token: str) -> dict | None:
    """
    Verify a Firebase ID token.
    Returns decoded token dict (uid, email, name, …) or None if invalid.
    Falls back to None gracefully so JWT path can take over.
    """
    if not _firebase_available:
        return None
    try:
        import firebase_admin.auth as fb_auth
        decoded = fb_auth.verify_id_token(id_token)
        return decoded
    except Exception as e:
        log.debug('Firebase token verification failed: %s', e)
        return None


def write_disruption_to_firestore(disruption: dict):
    """
    Write a disruption event to Firestore so the frontend gets real-time updates.
    Non-blocking — errors are swallowed so they never affect the main flow.
    """
    if not _firebase_available:
        return
    try:
        from firebase_admin import firestore
        db = firestore.client()
        db.collection('disruptions').document(str(disruption.get('id', 'unknown'))).set({
            **disruption,
            'created_at': firestore.SERVER_TIMESTAMP,
        })
    except Exception as e:
        log.debug('Firestore write failed: %s', e)


def sync_shipment_to_firestore(shipment: dict):
    """
    Write/update a shipment document in Firestore for real-time map updates.
    """
    if not _firebase_available:
        return
    try:
        from firebase_admin import firestore
        db = firestore.client()
        db.collection('shipments').document(str(shipment.get('id', 'unknown'))).set({
            **shipment,
            'updated_at': firestore.SERVER_TIMESTAMP,
        }, merge=True)
    except Exception as e:
        log.debug('Firestore shipment sync failed: %s', e)
