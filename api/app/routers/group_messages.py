from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

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
        content=row["content"],
        reactions=reactions_map.get(str(row["id"]), []),
        created_at=row["created_at"],
    )


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/{group_id}/messages", response_model=GroupMessagesResponse)
async def list_messages(
    group_id: str,
    limit: int = Query(50, le=100),
    cursor: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    await _require_member(conn, group_id, str(current_user["id"]))

    cursor_dt = datetime.fromisoformat(cursor) if cursor else datetime.now(timezone.utc)

    rows = await conn.fetch(
        """
        SELECT gm.id, gm.group_id, gm.user_id, gm.content, gm.created_at,
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
        INSERT INTO group_messages (group_id, user_id, content)
        VALUES ($1, $2, $3)
        RETURNING id, group_id, user_id, content, created_at
        """,
        group_id,
        current_user["id"],
        body.content,
    )
    user_row = await conn.fetchrow(
        "SELECT username, display_name, avatar_url FROM users WHERE id = $1",
        current_user["id"],
    )
    merged = {**dict(row), **dict(user_row)}
    return _build_message(merged, {})


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
