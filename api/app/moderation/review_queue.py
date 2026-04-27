"""PostgreSQL-backed review queue for content flagged for human moderation."""
import json
import logging
from typing import Any, Optional

logger = logging.getLogger("nave.moderation.queue")


async def add_to_queue(
    conn,
    *,
    user_id: str,
    content: str,
    context_type: str,
    content_id: Optional[str] = None,
    layer1_result: Optional[dict] = None,
    layer2_result: Optional[dict] = None,
    final_action: str,
) -> str:
    """Insert a flagged item into the moderation queue. Returns the queue item UUID."""
    row = await conn.fetchrow(
        """
        INSERT INTO moderation_queue
            (user_id, content, context_type, content_id, final_action, layer1_result, layer2_result)
        VALUES ($1::uuid, $2, $3, $4::uuid, $5, $6::jsonb, $7::jsonb)
        RETURNING id
        """,
        user_id,
        content,
        context_type,
        content_id,
        final_action,
        json.dumps(layer1_result) if layer1_result else None,
        json.dumps(layer2_result) if layer2_result else None,
    )
    item_id = str(row["id"])
    logger.info("Added item %s to moderation queue (action=%s)", item_id, final_action)
    return item_id


async def get_pending(conn, limit: int = 20) -> list[dict[str, Any]]:
    """Return up to `limit` pending items, oldest first."""
    rows = await conn.fetch(
        """
        SELECT mq.id, mq.user_id, mq.content, mq.context_type, mq.content_id,
               mq.final_action, mq.layer1_result, mq.layer2_result,
               mq.status, mq.created_at,
               u.username, u.display_name
        FROM moderation_queue mq
        JOIN users u ON u.id = mq.user_id
        WHERE mq.status = 'pending'
        ORDER BY mq.created_at ASC
        LIMIT $1
        """,
        limit,
    )
    return [_serialize(r) for r in rows]


async def mark_reviewed(
    conn,
    *,
    item_id: str,
    decision: str,
    reviewer_id: str,
    notes: Optional[str] = None,
) -> bool:
    """Mark a queue item as approved or rejected. Returns False if not found/already reviewed."""
    result = await conn.execute(
        """
        UPDATE moderation_queue
        SET status = $1, reviewer_id = $2::uuid, reviewed_at = NOW(), reviewer_notes = $3
        WHERE id = $4::uuid AND status = 'pending'
        """,
        decision,
        reviewer_id,
        notes,
        item_id,
    )
    updated = result.split()[-1] != "0"
    if updated:
        logger.info("Queue item %s marked %s by %s", item_id, decision, reviewer_id)
    return updated


def _serialize(row) -> dict[str, Any]:
    d = dict(row)
    d["id"] = str(d["id"])
    d["user_id"] = str(d["user_id"])
    d["content_id"] = str(d["content_id"]) if d.get("content_id") else None
    d["created_at"] = d["created_at"].isoformat()
    # asyncpg returns JSONB as dicts already
    return d
