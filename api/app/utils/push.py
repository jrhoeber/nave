"""Firebase Cloud Messaging push notification helper."""

import logging
from typing import Any

logger = logging.getLogger("nave.push")

_firebase_initialized = False


def _get_messaging():
    """Lazy-initialize Firebase Admin SDK and return the messaging client."""
    global _firebase_initialized
    import firebase_admin
    from firebase_admin import credentials, messaging

    if not _firebase_initialized:
        from app.config import settings
        if not settings.firebase_service_account_json:
            logger.warning("FIREBASE_SERVICE_ACCOUNT_JSON not set — push notifications disabled")
            return None
        try:
            import json
            cred_data = json.loads(settings.firebase_service_account_json)
            cred = credentials.Certificate(cred_data)
            firebase_admin.initialize_app(cred)
            _firebase_initialized = True
            logger.info("Firebase Admin SDK initialized")
        except Exception:
            logger.exception("Failed to initialize Firebase Admin SDK")
            return None

    return messaging


async def send_push_notifications(
    tokens: list[str],
    title: str,
    body: str,
    data: dict[str, str],
    conn=None,
) -> None:
    """
    Send a multicast FCM push notification to a list of device tokens.
    Silently removes invalid/expired tokens from the DB if conn is provided.
    """
    if not tokens:
        return

    messaging = _get_messaging()
    if messaging is None:
        return

    try:
        message = messaging.MulticastMessage(
            tokens=tokens,
            notification=messaging.Notification(title=title, body=body),
            data=data,
            apns=messaging.APNSConfig(
                payload=messaging.APNSPayload(
                    aps=messaging.Aps(sound="default"),
                )
            ),
            android=messaging.AndroidConfig(priority="high"),
        )
        response = messaging.send_each_for_multicast(message)
        logger.info(
            "FCM multicast: %d success, %d failure",
            response.success_count,
            response.failure_count,
        )

        # Clean up invalid tokens
        if conn and response.failure_count > 0:
            invalid_tokens = []
            for i, resp in enumerate(response.responses):
                if not resp.success:
                    err_code = resp.exception.code if resp.exception else None
                    if err_code in (
                        "messaging/invalid-registration-token",
                        "messaging/registration-token-not-registered",
                    ):
                        invalid_tokens.append(tokens[i])
            if invalid_tokens:
                await conn.execute(
                    "DELETE FROM user_device_tokens WHERE token = ANY($1::text[])",
                    invalid_tokens,
                )
                logger.info("Removed %d invalid FCM tokens", len(invalid_tokens))
    except Exception:
        logger.exception("Failed to send FCM multicast")
