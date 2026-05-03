import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user, is_parish_admin
from app.models.parish import (
    ParishPostAuthor,
    ParishPostCreate,
    ParishPostResponse,
    ParishPostsResponse,
    ParishPostUpdate,
    ParishResponse,
    ParishUpdate,
    ParishesResponse,
    ReactionResponse,
)
from app.utils.storage import (
    _ALLOWED_CONTENT_TYPES,
    _MAX_AVATAR_BYTES,
    get_avatar_signed_url,
    get_signed_url,
    upload_parish_cover,
)
from pydantic import BaseModel

REACTION_EMOJIS = ['👍', '🙏', '❤️']


class AddReactionBody(BaseModel):
    reaction: str

router = APIRouter()

# Abbreviation expansions for fuzzy parish name matching
_ABBREVIATIONS = {
    r"\bsaint\b": "st.",
    r"\bblessed\b": "bl.",
    r"\bour lady\b": "our lady",
    r"\bchurch of\b": "",
    r"\bparish\b": "",
}


def _normalize_query(q: str) -> str:
    """Expand common abbreviations so 'Saint Joseph' matches 'St. Joseph'."""
    normalized = q.lower().strip()
    for pattern, replacement in _ABBREVIATIONS.items():
        normalized = re.sub(pattern, replacement, normalized, flags=re.IGNORECASE)
    return " ".join(normalized.split())  # collapse extra whitespace


def _resolve_avatar(raw: str | None) -> str | None:
    if not raw:
        return None
    if raw.startswith("http"):
        return raw
    return get_avatar_signed_url(raw)


def _resolve_cover_photo(raw: str | None) -> str | None:
    if not raw:
        return None
    if raw.startswith("http"):
        return raw
    return get_signed_url(raw)


def _build_parish(row: dict, admin: bool = False) -> ParishResponse:
    return ParishResponse(
        id=str(row["id"]),
        name=row["name"],
        street_address=row.get("street_address"),
        city=row["city"],
        state=row["state"],
        postal_code=row.get("postal_code"),
        diocese=row["diocese"],
        established=row.get("established"),
        avatar_url=row.get("avatar_url"),
        cover_photo_url=_resolve_cover_photo(row.get("cover_photo_url")),
        mass_schedule=row.get("mass_schedule"),
        website=row.get("website"),
        member_count=row.get("member_count", 0),
        group_count=row.get("group_count", 0),
        is_parish_admin=admin,
        created_at=row["created_at"],
    )


async def _fetch_reactions(conn, post_ids: list, user_id: str) -> dict:
    """Returns {post_id: {"reactions": {emoji: count}, "user_reactions": [emoji, ...]}}"""
    if not post_ids:
        return {}
    rows = await conn.fetch(
        """
        SELECT post_id, reaction, COUNT(*) AS cnt,
               BOOL_OR(user_id = $2) AS user_reacted
        FROM parish_post_reactions
        WHERE post_id = ANY($1::uuid[])
        GROUP BY post_id, reaction
        """,
        post_ids,
        user_id,
    )
    result: dict = {}
    for row in rows:
        pid = str(row["post_id"])
        if pid not in result:
            result[pid] = {"reactions": {e: 0 for e in REACTION_EMOJIS}, "user_reactions": []}
        result[pid]["reactions"][row["reaction"]] = row["cnt"]
        if row["user_reacted"]:
            result[pid]["user_reactions"].append(row["reaction"])
    return result


@router.get("/search", response_model=ParishesResponse)
async def search_parishes(
    q: str = Query("", description="Search by name"),
    limit: int = Query(20, le=100),
    _: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    if not q:
        rows = await conn.fetch(
            """
            SELECT p.*, COUNT(u.id) AS member_count
            FROM parishes p
            LEFT JOIN users u ON u.parish_id = p.id
            GROUP BY p.id
            ORDER BY p.name
            LIMIT $1
            """,
            limit,
        )
        return ParishesResponse(parishes=[_build_parish(dict(r)) for r in rows])

    normalized = _normalize_query(q)
    ilike_pattern = f"%{normalized}%"
    original_ilike = f"%{q}%"

    rows = await conn.fetch(
        """
        SELECT p.*, COUNT(u.id) AS member_count,
               GREATEST(
                 similarity(lower(p.name), $1),
                 similarity(lower(p.name), $2)
               ) AS _score
        FROM parishes p
        LEFT JOIN users u ON u.parish_id = p.id
        WHERE
          similarity(lower(p.name), $1) > 0.1
          OR similarity(lower(p.name), $2) > 0.1
          OR lower(p.name) ILIKE $3
          OR lower(p.name) ILIKE $4
        GROUP BY p.id
        ORDER BY _score DESC, p.name ASC
        LIMIT $5
        """,
        normalized,
        q.lower(),
        ilike_pattern,
        original_ilike,
        limit,
    )
    return ParishesResponse(parishes=[_build_parish(dict(r)) for r in rows])


@router.get("/{parish_id}", response_model=ParishResponse)
async def get_parish(
    parish_id: str,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    row = await conn.fetchrow(
        """
        SELECT p.*, COUNT(u.id) AS member_count,
               (SELECT COUNT(*) FROM prayer_groups pg WHERE pg.parish = p.name) AS group_count
        FROM parishes p
        LEFT JOIN users u ON u.parish_id = p.id
        WHERE p.id = $1
        GROUP BY p.id
        """,
        parish_id,
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Parish not found")
    admin = await is_parish_admin(conn, str(current_user["id"]), parish_id)
    return _build_parish(dict(row), admin=admin)


@router.patch("/{parish_id}", response_model=ParishResponse)
async def update_parish(
    parish_id: str,
    body: ParishUpdate,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    if not await is_parish_admin(conn, str(current_user["id"]), parish_id):
        raise HTTPException(status_code=403, detail="Only parish admins can update the parish profile")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if updates:
        set_clauses = ", ".join(f"{col} = ${i + 2}" for i, col in enumerate(updates.keys()))
        await conn.execute(
            f"UPDATE parishes SET {set_clauses} WHERE id = $1",
            parish_id,
            *updates.values(),
        )

    row = await conn.fetchrow(
        """
        SELECT p.*, COUNT(u.id) AS member_count,
               (SELECT COUNT(*) FROM prayer_groups pg WHERE pg.parish = p.name) AS group_count
        FROM parishes p
        LEFT JOIN users u ON u.parish_id = p.id
        WHERE p.id = $1
        GROUP BY p.id
        """,
        parish_id,
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Parish not found")
    return _build_parish(dict(row), admin=True)


@router.post("/{parish_id}/cover-photo")
async def upload_parish_cover_photo(
    parish_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    if not await is_parish_admin(conn, str(current_user["id"]), parish_id):
        raise HTTPException(status_code=403, detail="Only parish admins can update the cover photo")

    if not settings.gcs_enabled:
        raise HTTPException(status_code=501, detail="File uploads are not enabled")

    content_type = file.content_type or "image/jpeg"
    if content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported image type: {content_type}")

    file_bytes = await file.read()
    if len(file_bytes) > _MAX_AVATAR_BYTES:
        raise HTTPException(status_code=413, detail="Cover photo must be under 5 MB")

    from app.moderation.image_moderator import check_image_or_raise
    await check_image_or_raise(conn, image_bytes=file_bytes, user_id=str(current_user["id"]),
                               context_type="image_parish_cover")

    object_name = upload_parish_cover(file_bytes, parish_id, content_type)

    await conn.execute(
        "UPDATE parishes SET cover_photo_url = $1 WHERE id = $2",
        object_name,
        parish_id,
    )

    signed = get_signed_url(object_name)
    return {"cover_photo_url": signed or object_name}


@router.get("/{parish_id}/posts", response_model=ParishPostsResponse)
async def list_parish_posts(
    parish_id: str,
    limit: int = Query(10, le=50),
    cursor: str | None = Query(None),
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    if cursor:
        cursor_dt = datetime.fromisoformat(cursor)
        if cursor_dt.tzinfo is None:
            cursor_dt = cursor_dt.replace(tzinfo=timezone.utc)
        rows = await conn.fetch(
            """
            SELECT pp.id, pp.parish_id, pp.content, pp.status, pp.is_announcement, pp.created_at,
                   u.id AS user_id, u.username, u.display_name, u.avatar_url,
                   (SELECT COUNT(*) FROM parish_post_comments c
                    WHERE c.post_id = pp.id AND c.status = 'Posted') AS comment_count
            FROM parish_posts pp
            JOIN users u ON u.id = pp.user_id
            WHERE pp.parish_id = $1
              AND pp.status = 'Posted'
              AND pp.created_at < $2
            ORDER BY pp.created_at DESC
            LIMIT $3
            """,
            parish_id,
            cursor_dt,
            limit,
        )
    else:
        rows = await conn.fetch(
            """
            SELECT pp.id, pp.parish_id, pp.content, pp.status, pp.is_announcement, pp.created_at,
                   u.id AS user_id, u.username, u.display_name, u.avatar_url,
                   (SELECT COUNT(*) FROM parish_post_comments c
                    WHERE c.post_id = pp.id AND c.status = 'Posted') AS comment_count
            FROM parish_posts pp
            JOIN users u ON u.id = pp.user_id
            WHERE pp.parish_id = $1
              AND pp.status = 'Posted'
            ORDER BY pp.created_at DESC
            LIMIT $2
            """,
            parish_id,
            limit,
        )

    post_ids = [r["id"] for r in rows]
    reaction_data = await _fetch_reactions(conn, post_ids, current_user["id"])

    posts = [
        ParishPostResponse(
            id=str(r["id"]),
            parish_id=str(r["parish_id"]),
            author=ParishPostAuthor(
                id=str(r["user_id"]),
                username=r["username"],
                display_name=r["display_name"],
                avatar_url=_resolve_avatar(r.get("avatar_url")),
            ),
            content=r["content"],
            status=r["status"],
            is_announcement=r["is_announcement"],
            created_at=r["created_at"],
            reactions=reaction_data.get(str(r["id"]), {}).get("reactions", {e: 0 for e in REACTION_EMOJIS}),
            user_reactions=reaction_data.get(str(r["id"]), {}).get("user_reactions", []),
            comment_count=r.get("comment_count", 0),
        )
        for r in rows
    ]

    next_cursor = posts[-1].created_at.isoformat() if len(posts) == limit else None
    return ParishPostsResponse(posts=posts, next_cursor=next_cursor)


@router.post("/{parish_id}/posts", response_model=ParishPostResponse, status_code=201)
async def create_parish_post(
    parish_id: str,
    body: ParishPostCreate,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    parish_exists = await conn.fetchval(
        "SELECT id FROM parishes WHERE id = $1", parish_id
    )
    if not parish_exists:
        raise HTTPException(status_code=404, detail="Parish not found")

    if body.is_announcement:
        if not await is_parish_admin(conn, str(current_user["id"]), parish_id):
            raise HTTPException(status_code=403, detail="Only parish admins can post announcements")

    # ── Content moderation ───────────────────────────────────────────────────
    from app.moderation.moderate import moderate_content

    mod = await moderate_content(
        text=body.content,
        context_type="post",
        user_id=str(current_user["id"]),
    )

    if mod.action == "block":
        # Log blocked attempts to the queue for audit purposes
        try:
            from app.moderation.review_queue import add_to_queue
            await add_to_queue(
                conn,
                user_id=str(current_user["id"]),
                content=body.content,
                context_type="post",
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

    # 'Pending' posts are hidden from feeds until approved; 'Posted' are live.
    initial_status = "Pending" if mod.action == "queue" else "Posted"

    async with conn.transaction():
        row = await conn.fetchrow(
            """
            INSERT INTO parish_posts (parish_id, user_id, content, status, is_announcement)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, parish_id, content, status, is_announcement, created_at
            """,
            parish_id,
            current_user["id"],
            body.content,
            initial_status,
            body.is_announcement,
        )

        if mod.action == "queue":
            from app.moderation.review_queue import add_to_queue
            await add_to_queue(
                conn,
                user_id=str(current_user["id"]),
                content=body.content,
                context_type="post",
                content_id=str(row["id"]),
                final_action="queue",
                layer1_result=mod.layer1_result,
                layer2_result=mod.layer2_result,
            )

    response = ParishPostResponse(
        id=str(row["id"]),
        parish_id=str(row["parish_id"]),
        author=ParishPostAuthor(
            id=str(current_user["id"]),
            username=current_user["username"],
            display_name=current_user["display_name"],
            avatar_url=_resolve_avatar(current_user.get("avatar_url")),
        ),
        content=row["content"],
        status=row["status"],
        is_announcement=row["is_announcement"],
        created_at=row["created_at"],
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


@router.patch("/{parish_id}/posts/{post_id}", response_model=ParishPostResponse)
async def update_parish_post(
    parish_id: str,
    post_id: str,
    body: ParishPostUpdate,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    row = await conn.fetchrow(
        """
        UPDATE parish_posts
        SET content = $1
        WHERE id = $2 AND parish_id = $3 AND user_id = $4 AND status = 'Posted'
        RETURNING id, parish_id, content, status, is_announcement, created_at
        """,
        body.content,
        post_id,
        parish_id,
        current_user["id"],
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Post not found")

    return ParishPostResponse(
        id=str(row["id"]),
        parish_id=str(row["parish_id"]),
        author=ParishPostAuthor(
            id=str(current_user["id"]),
            username=current_user["username"],
            display_name=current_user["display_name"],
            avatar_url=_resolve_avatar(current_user.get("avatar_url")),
        ),
        content=row["content"],
        status=row["status"],
        is_announcement=row["is_announcement"],
        created_at=row["created_at"],
    )


@router.delete("/{parish_id}/posts/{post_id}", status_code=204)
async def delete_parish_post(
    parish_id: str,
    post_id: str,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    post = await conn.fetchrow(
        "SELECT user_id, status FROM parish_posts WHERE id = $1 AND parish_id = $2",
        post_id,
        parish_id,
    )
    if post is None or post["status"] != "Posted":
        raise HTTPException(status_code=404, detail="Post not found")

    is_owner = str(post["user_id"]) == str(current_user["id"])
    admin = await is_parish_admin(conn, str(current_user["id"]), parish_id)
    if not is_owner and not admin:
        raise HTTPException(status_code=403, detail="Not authorized to delete this post")

    await conn.execute(
        "UPDATE parish_posts SET status = 'Deleted' WHERE id = $1",
        post_id,
    )


@router.post("/{parish_id}/posts/{post_id}/reactions", response_model=ReactionResponse)
async def add_reaction(
    parish_id: str,
    post_id: str,
    body: AddReactionBody,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    if body.reaction not in REACTION_EMOJIS:
        raise HTTPException(status_code=422, detail=f"Invalid reaction. Must be one of: {REACTION_EMOJIS}")
    await conn.execute(
        """
        INSERT INTO parish_post_reactions (post_id, user_id, reaction)
        VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING
        """,
        post_id,
        current_user["id"],
        body.reaction,
    )
    data = await _fetch_reactions(conn, [post_id], current_user["id"])
    entry = data.get(post_id, {"reactions": {e: 0 for e in REACTION_EMOJIS}, "user_reactions": []})
    return ReactionResponse(reactions=entry["reactions"], user_reactions=entry["user_reactions"])


@router.delete("/{parish_id}/posts/{post_id}/reactions/{reaction}", response_model=ReactionResponse)
async def remove_reaction(
    parish_id: str,
    post_id: str,
    reaction: str,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    await conn.execute(
        "DELETE FROM parish_post_reactions WHERE post_id = $1 AND user_id = $2 AND reaction = $3",
        post_id,
        current_user["id"],
        reaction,
    )
    data = await _fetch_reactions(conn, [post_id], current_user["id"])
    entry = data.get(post_id, {"reactions": {e: 0 for e in REACTION_EMOJIS}, "user_reactions": []})
    return ReactionResponse(reactions=entry["reactions"], user_reactions=entry["user_reactions"])
