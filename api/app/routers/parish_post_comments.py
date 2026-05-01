import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.database import get_db
from app.dependencies import get_current_user, is_parish_admin
from app.models.parish import (
    ParishCommentCreate,
    ParishCommentResponse,
    ParishCommentsResponse,
    ParishCommentUpdate,
    ParishPostAuthor,
    ReactionResponse,
)
from app.utils.storage import get_avatar_signed_url

logger = logging.getLogger("nave.api")

router = APIRouter()

REACTION_EMOJIS = ["👍", "🙏", "❤️"]


class ToggleReactionBody(BaseModel):
    reaction: str


# ─── Helpers ──────────────────────────────────────────────────────────────────


def _resolve_avatar_url(raw: str | None) -> str | None:
    if raw and raw.startswith("avatars/"):
        return get_avatar_signed_url(raw)
    return raw


def _resolve_avatars(rows) -> dict[str, str | None]:
    """Resolve avatar signed URLs once per unique GCS path across a batch."""
    unique: dict[str, str | None] = {}
    for r in rows:
        for key in ("avatar_url", "reply_avatar_url"):
            raw = r.get(key)
            if raw and raw not in unique:
                unique[raw] = _resolve_avatar_url(raw)
    return unique


async def _fetch_comment_reactions(
    conn, comment_ids: list, user_id: str
) -> dict:
    """Returns {comment_id: {"reactions": {emoji: count}, "user_reactions": [...]}}"""
    if not comment_ids:
        return {}
    rows = await conn.fetch(
        """
        SELECT comment_id, reaction, COUNT(*) AS cnt,
               BOOL_OR(user_id = $2) AS user_reacted
        FROM parish_post_comment_reactions
        WHERE comment_id = ANY($1::uuid[])
        GROUP BY comment_id, reaction
        """,
        comment_ids,
        user_id,
    )
    result: dict = {}
    for row in rows:
        cid = str(row["comment_id"])
        if cid not in result:
            result[cid] = {"reactions": {e: 0 for e in REACTION_EMOJIS}, "user_reactions": []}
        result[cid]["reactions"][row["reaction"]] = row["cnt"]
        if row["user_reacted"]:
            result[cid]["user_reactions"].append(row["reaction"])
    return result


async def _verify_post(conn, parish_id: str, post_id: str) -> None:
    """Verify the post exists and is visible."""
    exists = await conn.fetchval(
        """
        SELECT 1 FROM parish_posts
        WHERE id = $1 AND parish_id = $2 AND status = 'Posted'
        """,
        post_id,
        parish_id,
    )
    if not exists:
        raise HTTPException(status_code=404, detail="Post not found")


# ─── Endpoints ────────────────────────────────────────────────────────────────


@router.get(
    "/{parish_id}/posts/{post_id}/comments",
    response_model=ParishCommentsResponse,
)
async def list_comments(
    parish_id: str,
    post_id: str,
    limit: int = Query(30, le=100),
    cursor: str | None = Query(None),
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    await _verify_post(conn, parish_id, post_id)

    user_id = str(current_user["id"])

    # Total count of visible comments (excluding blocked users)
    total_count = await conn.fetchval(
        """
        SELECT COUNT(*) FROM parish_post_comments c
        WHERE c.post_id = $1
          AND c.status = 'Posted'
          AND NOT EXISTS (
              SELECT 1 FROM user_blocks ub
              WHERE ub.blocker_id = $2 AND ub.blocked_id = c.user_id
          )
        """,
        post_id,
        current_user["id"],
    )

    if cursor:
        cursor_dt = datetime.fromisoformat(cursor)
        if cursor_dt.tzinfo is None:
            cursor_dt = cursor_dt.replace(tzinfo=timezone.utc)
        rows = await conn.fetch(
            """
            SELECT c.id, c.post_id, c.content, c.status, c.reply_to_id,
                   c.created_at, c.updated_at,
                   u.id AS user_id, u.username, u.display_name, u.avatar_url,
                   ru.id AS reply_user_id, ru.username AS reply_username,
                   ru.display_name AS reply_display_name, ru.avatar_url AS reply_avatar_url
            FROM parish_post_comments c
            JOIN users u ON u.id = c.user_id
            LEFT JOIN parish_post_comments rc ON rc.id = c.reply_to_id
            LEFT JOIN users ru ON ru.id = rc.user_id
            WHERE c.post_id = $1
              AND c.status = 'Posted'
              AND c.created_at > $2
              AND NOT EXISTS (
                  SELECT 1 FROM user_blocks ub
                  WHERE ub.blocker_id = $3 AND ub.blocked_id = c.user_id
              )
            ORDER BY c.created_at ASC
            LIMIT $4
            """,
            post_id,
            cursor_dt,
            current_user["id"],
            limit,
        )
    else:
        rows = await conn.fetch(
            """
            SELECT c.id, c.post_id, c.content, c.status, c.reply_to_id,
                   c.created_at, c.updated_at,
                   u.id AS user_id, u.username, u.display_name, u.avatar_url,
                   ru.id AS reply_user_id, ru.username AS reply_username,
                   ru.display_name AS reply_display_name, ru.avatar_url AS reply_avatar_url
            FROM parish_post_comments c
            JOIN users u ON u.id = c.user_id
            LEFT JOIN parish_post_comments rc ON rc.id = c.reply_to_id
            LEFT JOIN users ru ON ru.id = rc.user_id
            WHERE c.post_id = $1
              AND c.status = 'Posted'
              AND NOT EXISTS (
                  SELECT 1 FROM user_blocks ub
                  WHERE ub.blocker_id = $2 AND ub.blocked_id = c.user_id
              )
            ORDER BY c.created_at ASC
            LIMIT $3
            """,
            post_id,
            current_user["id"],
            limit,
        )

    comment_ids = [r["id"] for r in rows]
    reaction_data = await _fetch_comment_reactions(conn, comment_ids, user_id)
    avatar_cache = _resolve_avatars(rows)

    comments = []
    for r in rows:
        raw_avatar = r.get("avatar_url")
        resolved_avatar = avatar_cache.get(raw_avatar) if raw_avatar else None

        reply_to_author = None
        if r["reply_user_id"]:
            raw_reply_avatar = r.get("reply_avatar_url")
            resolved_reply_avatar = avatar_cache.get(raw_reply_avatar) if raw_reply_avatar else None
            reply_to_author = ParishPostAuthor(
                id=str(r["reply_user_id"]),
                username=r["reply_username"],
                display_name=r["reply_display_name"],
                avatar_url=resolved_reply_avatar,
            )

        cid = str(r["id"])
        rd = reaction_data.get(cid, {})
        comments.append(
            ParishCommentResponse(
                id=cid,
                post_id=str(r["post_id"]),
                author=ParishPostAuthor(
                    id=str(r["user_id"]),
                    username=r["username"],
                    display_name=r["display_name"],
                    avatar_url=resolved_avatar,
                ),
                content=r["content"],
                status=r["status"],
                reply_to_id=str(r["reply_to_id"]) if r["reply_to_id"] else None,
                reply_to_author=reply_to_author,
                created_at=r["created_at"],
                updated_at=r["updated_at"],
                reactions=rd.get("reactions", {e: 0 for e in REACTION_EMOJIS}),
                user_reactions=rd.get("user_reactions", []),
            )
        )

    next_cursor = comments[-1].created_at.isoformat() if len(comments) == limit else None
    return ParishCommentsResponse(
        comments=comments,
        total_count=total_count,
        next_cursor=next_cursor,
    )


@router.post(
    "/{parish_id}/posts/{post_id}/comments",
    response_model=ParishCommentResponse,
    status_code=201,
)
async def create_comment(
    parish_id: str,
    post_id: str,
    body: ParishCommentCreate,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    await _verify_post(conn, parish_id, post_id)

    # Validate reply_to_id if provided
    reply_to_author = None
    if body.reply_to_id:
        reply_row = await conn.fetchrow(
            """
            SELECT c.id, u.id AS user_id, u.username, u.display_name, u.avatar_url
            FROM parish_post_comments c
            JOIN users u ON u.id = c.user_id
            WHERE c.id = $1 AND c.post_id = $2 AND c.status = 'Posted'
            """,
            body.reply_to_id,
            post_id,
        )
        if not reply_row:
            raise HTTPException(status_code=404, detail="Reply target comment not found")
        reply_to_author = ParishPostAuthor(
            id=str(reply_row["user_id"]),
            username=reply_row["username"],
            display_name=reply_row["display_name"],
            avatar_url=_resolve_avatar_url(reply_row.get("avatar_url")),
        )

    # Content moderation
    from app.moderation.moderate import moderate_content

    mod = await moderate_content(
        text=body.content,
        context_type="comment",
        user_id=str(current_user["id"]),
    )

    if mod.action == "block":
        try:
            from app.moderation.review_queue import add_to_queue
            await add_to_queue(
                conn,
                user_id=str(current_user["id"]),
                content=body.content,
                context_type="comment",
                final_action="block",
                layer1_result=mod.layer1_result,
                layer2_result=mod.layer2_result,
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

    initial_status = "Pending" if mod.action == "queue" else "Posted"

    async with conn.transaction():
        row = await conn.fetchrow(
            """
            INSERT INTO parish_post_comments (post_id, user_id, reply_to_id, content, status)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, post_id, reply_to_id, content, status, created_at, updated_at
            """,
            post_id,
            current_user["id"],
            body.reply_to_id,
            body.content,
            initial_status,
        )

        if mod.action == "queue":
            from app.moderation.review_queue import add_to_queue
            await add_to_queue(
                conn,
                user_id=str(current_user["id"]),
                content=body.content,
                context_type="comment",
                content_id=str(row["id"]),
                final_action="queue",
                layer1_result=mod.layer1_result,
                layer2_result=mod.layer2_result,
            )

    response = ParishCommentResponse(
        id=str(row["id"]),
        post_id=str(row["post_id"]),
        author=ParishPostAuthor(
            id=str(current_user["id"]),
            username=current_user["username"],
            display_name=current_user["display_name"],
            avatar_url=_resolve_avatar_url(current_user.get("avatar_url")),
        ),
        content=row["content"],
        status=row["status"],
        reply_to_id=str(row["reply_to_id"]) if row["reply_to_id"] else None,
        reply_to_author=reply_to_author,
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )

    if mod.action == "queue":
        from fastapi.responses import JSONResponse
        payload = response.model_dump(mode="json")
        payload["_moderation"] = {"status": "pending_review", "crisis": mod.crisis}
        if mod.crisis and mod.crisis_resources:
            payload["_moderation"]["crisis_resources"] = mod.crisis_resources
        return JSONResponse(status_code=201, content=payload)

    if mod.crisis and mod.crisis_resources:
        from fastapi.responses import JSONResponse
        payload = response.model_dump(mode="json")
        payload["_moderation"] = {"status": "allowed", "crisis": True, "crisis_resources": mod.crisis_resources}
        return JSONResponse(status_code=201, content=payload)

    return response


@router.patch(
    "/{parish_id}/posts/{post_id}/comments/{comment_id}",
    response_model=ParishCommentResponse,
)
async def update_comment(
    parish_id: str,
    post_id: str,
    comment_id: str,
    body: ParishCommentUpdate,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    await _verify_post(conn, parish_id, post_id)

    comment = await conn.fetchrow(
        """
        SELECT user_id, reply_to_id FROM parish_post_comments
        WHERE id = $1 AND post_id = $2 AND status = 'Posted'
        """,
        comment_id,
        post_id,
    )
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if str(comment["user_id"]) != str(current_user["id"]):
        raise HTTPException(status_code=403, detail="Only the author can edit this comment")

    # Re-moderate edited content
    from app.moderation.moderate import moderate_content

    mod = await moderate_content(
        text=body.content,
        context_type="comment",
        user_id=str(current_user["id"]),
    )

    if mod.action == "block":
        raise HTTPException(
            status_code=400,
            detail={
                "code": "moderation_blocked",
                "message": "This content can't be posted in our community. If you believe this is a mistake, please contact us.",
            },
        )

    row = await conn.fetchrow(
        """
        UPDATE parish_post_comments
        SET content = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, post_id, reply_to_id, content, status, created_at, updated_at
        """,
        body.content,
        comment_id,
    )

    # Fetch reply-to author if applicable
    reply_to_author = None
    if row["reply_to_id"]:
        reply_row = await conn.fetchrow(
            """
            SELECT u.id, u.username, u.display_name, u.avatar_url
            FROM parish_post_comments c
            JOIN users u ON u.id = c.user_id
            WHERE c.id = $1
            """,
            row["reply_to_id"],
        )
        if reply_row:
            reply_to_author = ParishPostAuthor(
                id=str(reply_row["id"]),
                username=reply_row["username"],
                display_name=reply_row["display_name"],
                avatar_url=_resolve_avatar_url(reply_row.get("avatar_url")),
            )

    cid = str(row["id"])
    rd = await _fetch_comment_reactions(conn, [comment_id], str(current_user["id"]))
    entry = rd.get(cid, {})

    return ParishCommentResponse(
        id=cid,
        post_id=str(row["post_id"]),
        author=ParishPostAuthor(
            id=str(current_user["id"]),
            username=current_user["username"],
            display_name=current_user["display_name"],
            avatar_url=_resolve_avatar_url(current_user.get("avatar_url")),
        ),
        content=row["content"],
        status=row["status"],
        reply_to_id=str(row["reply_to_id"]) if row["reply_to_id"] else None,
        reply_to_author=reply_to_author,
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        reactions=entry.get("reactions", {e: 0 for e in REACTION_EMOJIS}),
        user_reactions=entry.get("user_reactions", []),
    )


@router.delete(
    "/{parish_id}/posts/{post_id}/comments/{comment_id}",
    status_code=204,
)
async def delete_comment(
    parish_id: str,
    post_id: str,
    comment_id: str,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    await _verify_post(conn, parish_id, post_id)

    comment = await conn.fetchrow(
        """
        SELECT c.user_id, pp.user_id AS post_author_id
        FROM parish_post_comments c
        JOIN parish_posts pp ON pp.id = c.post_id
        WHERE c.id = $1 AND c.post_id = $2 AND c.status = 'Posted'
        """,
        comment_id,
        post_id,
    )
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    uid = str(current_user["id"])
    is_comment_owner = str(comment["user_id"]) == uid
    is_post_author = str(comment["post_author_id"]) == uid
    admin = await is_parish_admin(conn, uid, parish_id)

    if not (is_comment_owner or is_post_author or admin):
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")

    # Soft-delete the comment and cascade to replies
    async with conn.transaction():
        await conn.execute(
            "UPDATE parish_post_comments SET status = 'Deleted' WHERE id = $1",
            comment_id,
        )
        # Cascade: soft-delete all replies to this comment
        await conn.execute(
            """
            UPDATE parish_post_comments SET status = 'Deleted'
            WHERE reply_to_id = $1 AND status = 'Posted'
            """,
            comment_id,
        )


@router.post(
    "/{parish_id}/posts/{post_id}/comments/{comment_id}/reactions",
    response_model=ReactionResponse,
)
async def toggle_comment_reaction(
    parish_id: str,
    post_id: str,
    comment_id: str,
    body: ToggleReactionBody,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    if body.reaction not in REACTION_EMOJIS:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid reaction. Must be one of: {REACTION_EMOJIS}",
        )

    # Verify comment exists and is visible
    exists = await conn.fetchval(
        """
        SELECT 1 FROM parish_post_comments
        WHERE id = $1 AND post_id = $2 AND status = 'Posted'
        """,
        comment_id,
        post_id,
    )
    if not exists:
        raise HTTPException(status_code=404, detail="Comment not found")

    # Toggle: remove if exists, add if not
    existing = await conn.fetchval(
        """
        SELECT 1 FROM parish_post_comment_reactions
        WHERE comment_id = $1 AND user_id = $2 AND reaction = $3
        """,
        comment_id,
        current_user["id"],
        body.reaction,
    )
    if existing:
        await conn.execute(
            """
            DELETE FROM parish_post_comment_reactions
            WHERE comment_id = $1 AND user_id = $2 AND reaction = $3
            """,
            comment_id,
            current_user["id"],
            body.reaction,
        )
    else:
        await conn.execute(
            """
            INSERT INTO parish_post_comment_reactions (comment_id, user_id, reaction)
            VALUES ($1, $2, $3)
            """,
            comment_id,
            current_user["id"],
            body.reaction,
        )

    data = await _fetch_comment_reactions(conn, [comment_id], str(current_user["id"]))
    entry = data.get(comment_id, {"reactions": {e: 0 for e in REACTION_EMOJIS}, "user_reactions": []})
    return ReactionResponse(reactions=entry["reactions"], user_reactions=entry["user_reactions"])
