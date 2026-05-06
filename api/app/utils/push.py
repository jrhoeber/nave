"""Firebase Cloud Messaging push notification helper.

Each target carries its own APNS badge value (recipient's unread count),
so the icon badge is correct regardless of how many pushes have stacked
up while the app was backgrounded. Callers compute the badge via the
notifications inbox (see app/utils/inbox.py) — push.py just sends.
"""
import logging

logger = logging.getLogger("nave.push")


async def send_push_notifications(
    targets: list[tuple[str, int]],
    title: str,
    body: str,
    data: dict[str, str],
    conn=None,
) -> None:
    """
    Send per-token FCM messages. Each target is (token, badge).
    Silently removes invalid/expired tokens from the DB if conn is provided.
    """
    if not targets:
        return

    from app.utils.firebase import get_messaging
    messaging = get_messaging()
    if messaging is None:
        return

    try:
        messages = [
            messaging.Message(
                token=token,
                notification=messaging.Notification(title=title, body=body),
                data=data,
                apns=messaging.APNSConfig(
                    payload=messaging.APNSPayload(
                        aps=messaging.Aps(sound="default", badge=badge),
                    )
                ),
                android=messaging.AndroidConfig(priority="high"),
            )
            for (token, badge) in targets
        ]
        response = messaging.send_each(messages)
        logger.info(
            "FCM send_each: %d success, %d failure",
            response.success_count,
            response.failure_count,
        )

        if conn and response.failure_count > 0:
            invalid_tokens = []
            for i, resp in enumerate(response.responses):
                if not resp.success:
                    err_code = resp.exception.code if resp.exception else None
                    if err_code in (
                        "messaging/invalid-registration-token",
                        "messaging/registration-token-not-registered",
                    ):
                        invalid_tokens.append(targets[i][0])
            if invalid_tokens:
                await conn.execute(
                    "DELETE FROM user_device_tokens WHERE token = ANY($1::text[])",
                    invalid_tokens,
                )
                logger.info("Removed %d invalid FCM tokens", len(invalid_tokens))
    except Exception:
        logger.exception("Failed to send FCM messages")
