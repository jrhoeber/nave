from datetime import datetime, timezone
from typing import Optional

import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.utils.storage import get_avatar_signed_url
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

def _resolve_avatar_url(raw: str | None) -> str | None:
    if raw and raw.startswith("avatars/"):
        return get_avatar_signed_url(raw)
    return raw


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


def _resolve_avatars(rows) -> dict[str, str | None]:
    """Resolve avatar signed URLs once per unique GCS path across a batch of rows."""
    unique: dict[str, str | None] = {}
    for r in rows:
        raw = r.get("avatar_url")
        if raw and raw not in unique:
            unique[raw] = _resolve_avatar_url(raw)
    return unique


def _build_message(row: dict, reactions_map: dict, avatar_cache: dict | None = None) -> GroupMessageResponse:
    raw_avatar = row.get("avatar_url")
    if avatar_cache is not None:
        resolved_avatar = avatar_cache.get(raw_avatar) if raw_avatar else None
    else:
        resolved_avatar = _resolve_avatar_url(raw_avatar)
    author = GroupMessageAuthor(
        id=str(row["user_id"]),
        username=row["username"],
        display_name=row["display_name"],
        avatar_url=resolved_avatar,
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
              AND (gm.moderation_status IS NULL OR gm.moderation_status = 'approved')
            ORDER BY gm.created_at ASC
            LIMIT $3
            """,
            group_id,
            after_dt,
            limit,
        )
        message_ids = [str(r["id"]) for r in rows]
        reactions_map = await _fetch_message_reactions(conn, message_ids, str(current_user["id"]))
        messages = [_build_message(dict(r), reactions_map, _resolve_avatars(rows)) for r in rows]
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
          AND (gm.moderation_status IS NULL OR gm.moderation_status = 'approved')
        ORDER BY gm.created_at DESC
        LIMIT $3
        """,
        group_id,
        cursor_dt,
        limit,
    )

    message_ids = [str(r["id"]) for r in rows]
    reactions_map = await _fetch_message_reactions(conn, message_ids, str(current_user["id"]))
    messages = [_build_message(dict(r), reactions_map, _resolve_avatars(rows)) for r in rows]

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

    from app.moderation.image_moderator import check_image_or_raise
    await check_image_or_raise(conn, image_bytes=file_bytes, user_id=str(current_user["id"]),
                               context_type="image_group_message")

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

    # ── Content moderation (text messages only; images are out of scope) ───────
    mod_status: Optional[str] = None
    mod_crisis: bool = False
    mod_crisis_resources: list = []
    mod_layer1: Optional[dict] = None
    mod_layer2: Optional[dict] = None

    if body.content:
        from app.moderation.moderate import moderate_content

        mod = await moderate_content(
            text=body.content,
            context_type="comment",
            user_id=str(current_user["id"]),
        )
        mod_layer1 = mod.layer1_result
        mod_layer2 = mod.layer2_result

        if mod.action == "block":
            try:
                from app.moderation.review_queue import add_to_queue
                await add_to_queue(
                    conn,
                    user_id=str(current_user["id"]),
                    content=body.content,
                    context_type="group_message",
                    final_action="block",
                    layer1_result=mod_layer1,
                    layer2_result=mod_layer2,
                )
            except Exception:
                pass
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "moderation_blocked",
                    "message": "This content can't be posted in our community. If you believe this is a mistake, please contact us.",
                },
            )
        if mod.action == "queue":
            mod_status = "pending"
        mod_crisis = mod.crisis
        mod_crisis_resources = mod.crisis_resources

    async with conn.transaction():
        row = await conn.fetchrow(
            """
            INSERT INTO group_messages (group_id, user_id, content, image_url, moderation_status)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, group_id, user_id, content, image_url, moderation_status, created_at
            """,
            group_id,
            current_user["id"],
            body.content,
            body.image_url,
            mod_status,
        )

        if mod_status == "pending":
            from app.moderation.review_queue import add_to_queue
            await add_to_queue(
                conn,
                user_id=str(current_user["id"]),
                content=body.content,
                context_type="group_message",
                content_id=str(row["id"]),
                final_action="queue",
                layer1_result=mod_layer1,
                layer2_result=mod_layer2,
            )

    user_row = await conn.fetchrow(
        "SELECT username, display_name, avatar_url FROM users WHERE id = $1",
        current_user["id"],
    )
    merged = {**dict(row), **dict(user_row)}
    response = _build_message(merged, {})

    # Queued messages: skip push notifications, return pending notice
    if mod_status == "pending":
        payload = response.model_dump(mode="json")
        payload["_moderation"] = {"status": "pending_review", "crisis": mod_crisis}
        if mod_crisis and mod_crisis_resources:
            payload["_moderation"]["crisis_resources"] = mod_crisis_resources
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=201, content=payload)

    if mod_crisis and mod_crisis_resources:
        payload = response.model_dump(mode="json")
        payload["_moderation"] = {"status": "allowed", "crisis": True, "crisis_resources": mod_crisis_resources}
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=201, content=payload)

    # Enqueue inbox notification + push for eligible group members
    try:
        group_row = await conn.fetchrow(
            "SELECT name FROM prayer_groups WHERE id = $1", group_id
        )
        group_name = group_row["name"] if group_row else "Group"
        sender_display = user_row["display_name"]

        recipient_rows = await conn.fetch(
            """
            SELECT pgm.user_id
            FROM prayer_group_members pgm
            WHERE pgm.group_id = $1
              AND pgm.status = 'member'
              AND pgm.user_id != $2
              AND NOT EXISTS (
                  SELECT 1 FROM group_notification_mutes gnm
                  WHERE gnm.user_id = pgm.user_id AND gnm.group_id = $1
              )
            """,
            group_id,
            current_user["id"],
        )
        user_ids = [str(r["user_id"]) for r in recipient_rows]
        if user_ids:
            notification_body = body.content if body.content else "📷 Photo"
            if len(notification_body) > 100:
                notification_body = notification_body[:97] + "…"
            from app.utils.inbox import enqueue
            await enqueue(
                conn,
                user_ids=user_ids,
                type_="group_message",
                entity_id=group_id,
                actor_id=current_user["id"],
                dedup_key=f"group_msg:{group_id}",
                payload={"group_name": group_name, "sender_name": sender_display},
                title=group_name,
                body=f"{sender_display}: {notification_body}",
                push_data={"type": "group_message", "groupId": group_id, "groupName": group_name},
                pref_filter_sql=" AND notify_group_messages = TRUE",
            )
    except Exception:
        import logging
        logging.getLogger("nave.api").exception("Failed to enqueue group message notifications")

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
