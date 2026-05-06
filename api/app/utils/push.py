"""Firebase Cloud Messaging push notification helper."""
import logging

logger = logging.getLogger("nave.push")


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

    from app.utils.firebase import get_messaging
    messaging = get_messaging()
    if messaging is None:
        return

    try:
        message = messaging.MulticastMessage(
            tokens=tokens,
            notification=messaging.Notification(title=title, body=body),
            data=data,
            apns=messaging.APNSConfig(
                payload=messaging.APNSPayload(
                    aps=messaging.Aps(sound="default", badge=1),
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
