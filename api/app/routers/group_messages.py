from datetime import datetime, timezone
from typing import Optional

import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.group_message import (
    AddReactionBody,
    GroupMessageCreate,
    GroupMessageResponse,
    GroupMessagesResponse,
    GroupMessageAuthor,
    MessageReactionSummary,
)

router = APIRouter()


# ─── Helpers ──────────────────────────────────────────────────────────────────

async def _require_member(conn, group_id: str, user_id: str) -> None:
    row = await conn.fetchrow(
        "SELECT status FROM prayer_group_members WHERE group_id = $1 AND user_id = $2",
        group_id,
        user_id,
    )
    if row is None or row["status"] != "member":
        raise HTTPException(status_code=403, detail="You must be a member to perform this action")


async def _fetch_message_reactions(
    conn, message_ids: list[str], viewer_id: str
) -> dict[str, list[MessageReactionSummary]]:
    if not message_ids:
        return {}
    rows = await conn.fetch(
        """
        SELECT message_id, emoji, COUNT(*) AS cnt,
               BOOL_OR(user_id = $2::uuid) AS user_reacted
        FROM group_message_reactions
        WHERE message_id = ANY($1::uuid[])
        GROUP BY message_id, emoji
        """,
        message_ids,
        viewer_id,
    )
    result: dict[str, list[MessageReactionSummary]] = {}
    for r in rows:
        mid = str(r["message_id"])
        result.setdefault(mid, []).append(
            MessageReactionSummary(
                emoji=r["emoji"],
                count=r["cnt"],
                user_reacted=r["user_reacted"],
            )
        )
    return result


_ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
_MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB


def _resolve_image_url(raw: str | None) -> str | None:
    if not raw:
        return None
    if raw.startswith("http"):
        return raw
    from app.utils.storage import get_signed_url
    return get_signed_url(raw)


def _build_message(row: dict, reactions_map: dict) -> GroupMessageResponse:
    author = GroupMessageAuthor(
        id=str(row["user_id"]),
        username=row["username"],
        display_name=row["display_name"],
        avatar_url=row.get("avatar_url"),
    )
    return GroupMessageResponse(
        id=str(row["id"]),
        group_id=str(row["group_id"]),
        author=author,
        content=row.get("content"),
        image_url=_resolve_image_url(row.get("image_url")),
        reactions=reactions_map.get(str(row["id"]), []),
        created_at=row["created_at"],
    )


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/{group_id}/messages", response_model=GroupMessagesResponse)
async def list_messages(
    group_id: str,
    limit: int = Query(50, le=100),
    cursor: Optional[str] = Query(None),
    after: Optional[str] = Query(None, description="ISO timestamp — return only messages newer than this (for polling)"),
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    await _require_member(conn, group_id, str(current_user["id"]))

    # Polling mode: return messages newer than `after` timestamp, oldest-first
    if after is not None:
        after_dt = datetime.fromisoformat(after)
        rows = await conn.fetch(
            """
            SELECT gm.id, gm.group_id, gm.user_id, gm.content, gm.image_url, gm.created_at,
                   u.username, u.display_name, u.avatar_url
            FROM group_messages gm
            JOIN users u ON u.id = gm.user_id
            WHERE gm.group_id = $1 AND gm.created_at > $2
            ORDER BY gm.created_at ASC
            LIMIT $3
            """,
            group_id,
            after_dt,
            limit,
        )
        message_ids = [str(r["id"]) for r in rows]
        reactions_map = await _fetch_message_reactions(conn, message_ids, str(current_user["id"]))
        messages = [_build_message(dict(r), reactions_map) for r in rows]
        return GroupMessagesResponse(messages=messages, next_cursor=None)

    # Cursor-based pagination (newest-first)
    cursor_dt = datetime.fromisoformat(cursor) if cursor else datetime.now(timezone.utc)

    rows = await conn.fetch(
        """
        SELECT gm.id, gm.group_id, gm.user_id, gm.content, gm.image_url, gm.created_at,
               u.username, u.display_name, u.avatar_url
        FROM group_messages gm
        JOIN users u ON u.id = gm.user_id
        WHERE gm.group_id = $1 AND gm.created_at < $2
        ORDER BY gm.created_at DESC
        LIMIT $3
        """,
        group_id,
        cursor_dt,
        limit,
    )

    message_ids = [str(r["id"]) for r in rows]
    reactions_map = await _fetch_message_reactions(conn, message_ids, str(current_user["id"]))
    messages = [_build_message(dict(r), reactions_map) for r in rows]

    next_cursor = messages[-1].created_at.isoformat() if len(messages) == limit else None
    return GroupMessagesResponse(messages=messages, next_cursor=next_cursor)


@router.post("/{group_id}/messages/upload-image", response_model=dict, status_code=201)
async def upload_message_image(
    group_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    await _require_member(conn, group_id, str(current_user["id"]))

    if not settings.gcs_enabled:
        raise HTTPException(status_code=501, detail="File uploads are not enabled")

    content_type = file.content_type or "image/jpeg"
    if content_type not in _ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported image type: {content_type}")

    file_bytes = await file.read()
    if len(file_bytes) > _MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image must be under 10 MB")

    from app.utils.storage import get_signed_url, upload_message_image as _upload
    temp_id = str(uuid.uuid4())
    object_name = _upload(file_bytes, group_id, temp_id, content_type)
    signed_url = get_signed_url(object_name)
    return {"object_name": object_name, "url": signed_url}


@router.post("/{group_id}/messages", response_model=GroupMessageResponse, status_code=201)
async def send_message(
    group_id: str,
    body: GroupMessageCreate,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    await _require_member(conn, group_id, str(current_user["id"]))

    row = await conn.fetchrow(
        """
        INSERT INTO group_messages (group_id, user_id, content, image_url)
        VALUES ($1, $2, $3, $4)
        RETURNING id, group_id, user_id, content, image_url, created_at
        """,
        group_id,
        current_user["id"],
        body.content,
        body.image_url,
    )
    user_row = await conn.fetchrow(
        "SELECT username, display_name, avatar_url FROM users WHERE id = $1",
        current_user["id"],
    )
    merged = {**dict(row), **dict(user_row)}
    response = _build_message(merged, {})

    # Fire push notifications to eligible group members (non-blocking best-effort)
    try:
        group_row = await conn.fetchrow(
            "SELECT name FROM prayer_groups WHERE id = $1", group_id
        )
        group_name = group_row["name"] if group_row else "Group"
        sender_display = user_row["display_name"]

        # Members who have not muted this group and want group message notifications
        token_rows = await conn.fetch(
            """
            SELECT udt.token
            FROM prayer_group_members pgm
            JOIN users u ON u.id = pgm.user_id
            JOIN user_device_tokens udt ON udt.user_id = pgm.user_id
            WHERE pgm.group_id = $1
              AND pgm.status = 'member'
              AND pgm.user_id != $2
              AND u.push_notifications_enabled = TRUE
              AND u.notify_group_messages = TRUE
              AND NOT EXISTS (
                  SELECT 1 FROM group_notification_mutes gnm
                  WHERE gnm.user_id = pgm.user_id AND gnm.group_id = $1
              )
            """,
            group_id,
            current_user["id"],
        )
        tokens = [r["token"] for r in token_rows]
        if tokens:
            from app.utils.push import send_push_notifications
            import asyncio
            notification_body = body.content if body.content else "📷 Photo"
            if len(notification_body) > 100:
                notification_body = notification_body[:97] + "…"
            asyncio.ensure_future(send_push_notifications(
                tokens=tokens,
                title=f"{group_name}",
                body=f"{sender_display}: {notification_body}",
                data={"type": "group_message", "groupId": group_id, "groupName": group_name},
                conn=conn,
            ))
    except Exception:
        import logging
        logging.getLogger("nave.api").exception("Failed to enqueue group message push notifications")

    return response


@router.delete("/{group_id}/messages/{message_id}", status_code=204)
async def delete_message(
    group_id: str,
    message_id: str,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    msg = await conn.fetchrow(
        "SELECT user_id FROM group_messages WHERE id = $1 AND group_id = $2",
        message_id,
        group_id,
    )
    if msg is None:
        raise HTTPException(status_code=404, detail="Message not found")

    pg = await conn.fetchrow("SELECT admin_id FROM prayer_groups WHERE id = $1", group_id)
    is_author = str(msg["user_id"]) == str(current_user["id"])
    is_admin = pg is not None and str(pg["admin_id"]) == str(current_user["id"])
    if not (is_author or is_admin):
        raise HTTPException(status_code=403, detail="Not authorized to delete this message")

    await conn.execute("DELETE FROM group_messages WHERE id = $1", message_id)


@router.post(
    "/{group_id}/messages/{message_id}/reactions",
    response_model=list[MessageReactionSummary],
)
async def toggle_reaction(
    group_id: str,
    message_id: str,
    body: AddReactionBody,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    await _require_member(conn, group_id, str(current_user["id"]))

    exists = await conn.fetchval(
        "SELECT 1 FROM group_messages WHERE id = $1 AND group_id = $2",
        message_id,
        group_id,
    )
    if not exists:
        raise HTTPException(status_code=404, detail="Message not found")

    existing = await conn.fetchval(
        """
        SELECT 1 FROM group_message_reactions
        WHERE message_id = $1 AND user_id = $2 AND emoji = $3
        """,
        message_id,
        current_user["id"],
        body.emoji,
    )
    if existing:
        await conn.execute(
            """
            DELETE FROM group_message_reactions
            WHERE message_id = $1 AND user_id = $2 AND emoji = $3
            """,
            message_id,
            current_user["id"],
            body.emoji,
        )
    else:
        await conn.execute(
            "INSERT INTO group_message_reactions (message_id, user_id, emoji) VALUES ($1, $2, $3)",
            message_id,
            current_user["id"],
            body.emoji,
        )

    reactions_map = await _fetch_message_reactions(conn, [message_id], str(current_user["id"]))
    return reactions_map.get(message_id, [])
