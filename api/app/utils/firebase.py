"""Shared Firebase Admin SDK initialization."""
import json
import logging

logger = logging.getLogger("nave.firebase")

_initialized = False


def _ensure_initialized() -> bool:
    """Lazy-initialize Firebase Admin SDK. Returns True if successful."""
    global _initialized
    if _initialized:
        return True

    from app.config import settings
    if not settings.firebase_service_account_json:
        logger.warning("FIREBASE_SERVICE_ACCOUNT_JSON not set — Firebase disabled")
        return False

    try:
        import firebase_admin
        from firebase_admin import credentials

        cred_data = json.loads(settings.firebase_service_account_json)
        cred = credentials.Certificate(cred_data)
        try:
            firebase_admin.get_app()
        except ValueError:
            firebase_admin.initialize_app(cred)
        _initialized = True
        logger.info("Firebase Admin SDK initialized")
        return True
    except Exception:
        logger.exception("Failed to initialize Firebase Admin SDK")
        return False


def verify_firebase_token(id_token: str) -> dict:
    """Verify a Firebase ID token. Returns decoded claims or raises ValueError."""
    if not _ensure_initialized():
        raise ValueError("Firebase not configured")
    from firebase_admin import auth
    try:
        return dict(auth.verify_id_token(id_token))
    except Exception as e:
        raise ValueError(f"Invalid Firebase token: {e}")


def get_messaging():
    """Return the firebase_admin messaging module, or None if not configured."""
    if not _ensure_initialized():
        return None
    from firebase_admin import messaging
    return messaging
