"""Admin routes for the content moderation review queue."""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.database import get_db
from app.dependencies import get_current_user

logger = logging.getLogger("nave.admin")

router = APIRouter()


async def _require_admin(
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
) -> dict:
    """Dependency: allow only users present in the app_admins table."""
    is_admin = await conn.fetchval(
        "SELECT 1 FROM app_admins WHERE user_id = $1", current_user["id"]
    )
    if not is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


class ReviewDecision(BaseModel):
    decision: str  # "approved" or "rejected"
    notes: Optional[str] = None


@router.get("/queue")
async def list_queue(
    limit: int = Query(20, le=100),
    admin: dict = Depends(_require_admin),
    conn=Depends(get_db),
):
    """List pending items in the moderation review queue, oldest first."""
    from app.moderation.review_queue import get_pending
    items = await get_pending(conn, limit=limit)
    return {"items": items, "count": len(items)}


@router.patch("/queue/{item_id}")
async def review_item(
    item_id: str,
    body: ReviewDecision,
    admin: dict = Depends(_require_admin),
    conn=Depends(get_db),
):
    """Approve or reject a queued moderation item.

    On approval, the underlying content (parish post or group message) is published
    atomically in the same transaction as the queue update.
    """
    if body.decision not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="decision must be 'approved' or 'rejected'")

    # Fetch the item first so we know what content to update
    item_row = await conn.fetchrow(
        "SELECT id, content_id, context_type, status FROM moderation_queue WHERE id = $1::uuid",
        item_id,
    )
    if item_row is None:
        raise HTTPException(status_code=404, detail="Queue item not found")
    if item_row["status"] != "pending":
        raise HTTPException(status_code=409, detail="Item has already been reviewed")

    from app.moderation.review_queue import mark_reviewed

    async with conn.transaction():
        updated = await mark_reviewed(
            conn,
            item_id=item_id,
            decision=body.decision,
            reviewer_id=str(admin["id"]),
            notes=body.notes,
        )
        if not updated:
            raise HTTPException(status_code=409, detail="Item has already been reviewed")

        content_id = item_row["content_id"]
        context_type = item_row["context_type"]

        if content_id and body.decision == "approved":
            if context_type == "post":
                await conn.execute(
                    "UPDATE parish_posts SET status = 'Posted' WHERE id = $1 AND status = 'Pending'",
                    content_id,
                )
            elif context_type == "group_message":
                await conn.execute(
                    "UPDATE group_messages SET moderation_status = 'approved' WHERE id = $1 AND moderation_status = 'pending'",
                    content_id,
                )
        elif content_id and body.decision == "rejected":
            if context_type == "post":
                await conn.execute(
                    "UPDATE parish_posts SET status = 'Rejected' WHERE id = $1 AND status = 'Pending'",
                    content_id,
                )
            elif context_type == "group_message":
                await conn.execute(
                    "UPDATE group_messages SET moderation_status = 'rejected' WHERE id = $1 AND moderation_status = 'pending'",
                    content_id,
                )

    logger.info(
        "Admin %s %s queue item %s (content_id=%s context=%s)",
        admin["id"], body.decision, item_id, content_id, context_type,
    )
    return {"status": "ok", "item_id": item_id, "decision": body.decision}
