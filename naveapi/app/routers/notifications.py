from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.database import get_db
from app.dependencies import get_current_user
from app.models.notification import MarkReadRequest, NotificationResponse, NotificationsResponse
from app.models.user import UserResponse

router = APIRouter()


def _build_notification(row: dict) -> NotificationResponse:
    actor = UserResponse(
        id=str(row["actor_id"]),
        username=row["actor_username"],
        display_name=row["actor_display_name"],
        avatar_url=row.get("actor_avatar_url"),
        created_at=row["actor_created_at"],
    )
    return NotificationResponse(
        id=str(row["id"]),
        type=row["type"],
        actor=actor,
        message=row["message"],
        is_read=row["is_read"],
        target_id=str(row["target_id"]) if row.get("target_id") else None,
        created_at=row["created_at"],
    )


@router.get("", response_model=NotificationsResponse)
async def list_notifications(
    limit: int = Query(20, le=100),
    cursor: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    cursor_dt = datetime.fromisoformat(cursor) if cursor else datetime.now(timezone.utc)

    rows = await conn.fetch(
        """
        SELECT n.*,
               u.id AS actor_id, u.username AS actor_username,
               u.display_name AS actor_display_name,
               u.avatar_url AS actor_avatar_url,
               u.created_at AS actor_created_at
        FROM notifications n
        JOIN users u ON u.id = n.actor_id
        WHERE n.user_id = $1 AND n.created_at < $2
        ORDER BY n.created_at DESC
        LIMIT $3
        """,
        current_user["id"],
        cursor_dt,
        limit,
    )

    unread_count = await conn.fetchval(
        "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE",
        current_user["id"],
    )

    notifications = [_build_notification(dict(r)) for r in rows]
    next_cursor = notifications[-1].created_at.isoformat() if len(notifications) == limit else None
    return NotificationsResponse(
        notifications=notifications,
        unread_count=unread_count,
        next_cursor=next_cursor,
    )


@router.get("/unread-count", response_model=dict)
async def unread_count(
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    count = await conn.fetchval(
        "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE",
        current_user["id"],
    )
    return {"count": count}


@router.post("/mark-read", response_model=dict)
async def mark_read(
    body: MarkReadRequest,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    if body.all:
        await conn.execute(
            "UPDATE notifications SET is_read = TRUE WHERE user_id = $1",
            current_user["id"],
        )
    elif body.notification_ids:
        await conn.execute(
            "UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND id = ANY($2::uuid[])",
            current_user["id"],
            body.notification_ids,
        )
    return {"success": True}
