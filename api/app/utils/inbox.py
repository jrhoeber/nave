"""Notifications inbox: type-agnostic write/read helpers.

`enqueue` is the single entry point routers should use to notify users.
It inserts inbox rows (with optional per-recipient dedup), then fires a
push whose APNS badge equals each recipient's current unread count.

`mark_read` is the single read-side helper, called when the user opens a
chat / accepts a request / lands on a tab that surfaces a notification
type.
"""
import asyncio
import json
import logging
from typing import Any

from app.utils.push import send_push_notifications

logger = logging.getLogger("nave.inbox")


async def enqueue(
    conn,
    *,
    user_ids: list[str],
    type_: str,
    title: str,
    body: str,
    push_data: dict[str, str],
    entity_id: str | None = None,
    actor_id: str | None = None,
    payload: dict[str, Any] | None = None,
    dedup_key: str | None = None,
    pref_filter_sql: str = "",
) -> None:
    """
    Insert one inbox row per user (or upsert into the existing unread row
    when dedup_key is set) and fire a push to each user's devices.

    pref_filter_sql is appended to the recipient filter so callers can
    enforce per-type opt-out preferences (e.g. notify_friend_requests).
    Example: " AND notify_friend_requests = TRUE".
    """
    if not user_ids:
        return

    payload_json = json.dumps(payload or {})

    if dedup_key:
        await conn.execute(
            """
            INSERT INTO notifications (user_id, type, entity_id, actor_id, payload, dedup_key)
            SELECT u, $2, $3::uuid, $4::uuid, $5::jsonb, $6
            FROM unnest($1::uuid[]) AS u
            ON CONFLICT (user_id, dedup_key) WHERE read_at IS NULL AND dedup_key IS NOT NULL
            DO UPDATE SET
                created_at = NOW(),
                payload    = EXCLUDED.payload,
                actor_id   = EXCLUDED.actor_id,
                entity_id  = EXCLUDED.entity_id,
                type       = EXCLUDED.type
            """,
            user_ids, type_, entity_id, actor_id, payload_json, dedup_key,
        )
    else:
        await conn.execute(
            """
            INSERT INTO notifications (user_id, type, entity_id, actor_id, payload)
            SELECT u, $2, $3::uuid, $4::uuid, $5::jsonb
            FROM unnest($1::uuid[]) AS u
            """,
            user_ids, type_, entity_id, actor_id, payload_json,
        )

    target_rows = await conn.fetch(
        f"""
        WITH counts AS (
            SELECT user_id, COUNT(*)::int AS cnt
            FROM notifications
            WHERE user_id = ANY($1::uuid[]) AND read_at IS NULL
            GROUP BY user_id
        )
        SELECT udt.token, c.cnt
        FROM counts c
        JOIN users u ON u.id = c.user_id
        JOIN user_device_tokens udt ON udt.user_id = c.user_id
        WHERE u.push_notifications_enabled = TRUE{pref_filter_sql}
        """,
        user_ids,
    )
    targets = [(r["token"], r["cnt"]) for r in target_rows]
    if not targets:
        return

    asyncio.ensure_future(send_push_notifications(targets, title, body, push_data))


async def mark_read(
    conn,
    user_id: str,
    *,
    type_: str | None = None,
    entity_id: str | None = None,
) -> int:
    """Mark unread notifications matching the filter as read. Returns rows updated."""
    parts = ["user_id = $1", "read_at IS NULL"]
    args: list[Any] = [user_id]
    if type_ is not None:
        args.append(type_)
        parts.append(f"type = ${len(args)}")
    if entity_id is not None:
        args.append(entity_id)
        parts.append(f"entity_id = ${len(args)}::uuid")
    sql = f"UPDATE notifications SET read_at = NOW() WHERE {' AND '.join(parts)}"
    result = await conn.execute(sql, *args)
    try:
        return int(result.split()[-1])
    except Exception:
        return 0


async def unread_count(conn, user_id: str) -> int:
    val = await conn.fetchval(
        "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read_at IS NULL",
        user_id,
    )
    return int(val or 0)
