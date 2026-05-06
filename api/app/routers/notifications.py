from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.database import get_db
from app.dependencies import get_current_user
from app.utils import inbox

router = APIRouter()


# ─── Schemas ──────────────────────────────────────────────────────────────────

class DeviceTokenBody(BaseModel):
    token: str
    platform: str  # "ios" | "android"


class NotificationPreferencesUpdate(BaseModel):
    push_notifications_enabled: bool | None = None
    notify_group_messages: bool | None = None
    notify_friend_requests: bool | None = None


class MarkReadBody(BaseModel):
    type: str | None = None
    entity_id: str | None = None


# ─── Device Token ─────────────────────────────────────────────────────────────

@router.post("/device-token", status_code=204)
async def register_device_token(
    body: DeviceTokenBody,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    if body.platform not in ("ios", "android"):
        raise HTTPException(status_code=400, detail="platform must be 'ios' or 'android'")

    await conn.execute(
        """
        INSERT INTO user_device_tokens (user_id, token, platform)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, token) DO UPDATE SET updated_at = NOW()
        """,
        current_user["id"],
        body.token,
        body.platform,
    )


@router.delete("/device-token", status_code=204)
async def unregister_device_token(
    body: DeviceTokenBody,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    await conn.execute(
        "DELETE FROM user_device_tokens WHERE user_id = $1 AND token = $2",
        current_user["id"],
        body.token,
    )


# ─── Notification Preferences ─────────────────────────────────────────────────

@router.get("/preferences")
async def get_preferences(
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    row = await conn.fetchrow(
        """
        SELECT push_notifications_enabled, notify_group_messages, notify_friend_requests
        FROM users WHERE id = $1
        """,
        current_user["id"],
    )
    return {
        "push_notifications_enabled": row["push_notifications_enabled"],
        "notify_group_messages": row["notify_group_messages"],
        "notify_friend_requests": row["notify_friend_requests"],
    }


@router.patch("/preferences")
async def update_preferences(
    body: NotificationPreferencesUpdate,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    updates = {}
    if body.push_notifications_enabled is not None:
        updates["push_notifications_enabled"] = body.push_notifications_enabled
    if body.notify_group_messages is not None:
        updates["notify_group_messages"] = body.notify_group_messages
    if body.notify_friend_requests is not None:
        updates["notify_friend_requests"] = body.notify_friend_requests

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    set_clauses = ", ".join(f"{k} = ${i+2}" for i, k in enumerate(updates))
    values = list(updates.values())
    await conn.execute(
        f"UPDATE users SET {set_clauses}, updated_at = NOW() WHERE id = $1",
        current_user["id"],
        *values,
    )
    row = await conn.fetchrow(
        """
        SELECT push_notifications_enabled, notify_group_messages, notify_friend_requests
        FROM users WHERE id = $1
        """,
        current_user["id"],
    )
    return {
        "push_notifications_enabled": row["push_notifications_enabled"],
        "notify_group_messages": row["notify_group_messages"],
        "notify_friend_requests": row["notify_friend_requests"],
    }


# ─── Inbox ────────────────────────────────────────────────────────────────────

@router.get("/unread-count")
async def get_unread_count(
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    return {"count": await inbox.unread_count(conn, current_user["id"])}


@router.post("/read")
async def mark_read(
    body: MarkReadBody,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    updated = await inbox.mark_read(
        conn,
        current_user["id"],
        type_=body.type,
        entity_id=body.entity_id,
    )
    count = await inbox.unread_count(conn, current_user["id"])
    return {"updated": updated, "count": count}


# ─── Group Mute ───────────────────────────────────────────────────────────────

@router.get("/prayer-groups/{group_id}/mute")
async def get_group_mute_status(
    group_id: str,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    muted = await conn.fetchval(
        "SELECT 1 FROM group_notification_mutes WHERE user_id = $1 AND group_id = $2",
        current_user["id"],
        group_id,
    )
    return {"muted": bool(muted)}


@router.post("/prayer-groups/{group_id}/mute", status_code=204)
async def mute_group(
    group_id: str,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    await conn.execute(
        """
        INSERT INTO group_notification_mutes (user_id, group_id)
        VALUES ($1, $2) ON CONFLICT DO NOTHING
        """,
        current_user["id"],
        group_id,
    )


@router.delete("/prayer-groups/{group_id}/mute", status_code=204)
async def unmute_group(
    group_id: str,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    await conn.execute(
        "DELETE FROM group_notification_mutes WHERE user_id = $1 AND group_id = $2",
        current_user["id"],
        group_id,
    )
