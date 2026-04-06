from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.database import get_db
from app.dependencies import get_current_user
from app.models.post import FeedResponse, ParishBrief, PostCreate, PostResponse
from app.models.user import UserResponse
from app.utils.notifications import create_notification

router = APIRouter()


def _build_user(row: dict) -> UserResponse:
    return UserResponse(
        id=str(row["author_id"]),
        username=row["author_username"],
        display_name=row["author_display_name"],
        bio=None,
        avatar_url=row.get("author_avatar_url"),
        parish=row.get("author_parish"),
        created_at=row["author_created_at"],
    )


def _build_post(row: dict) -> PostResponse:
    parish = None
    if row.get("par_id"):
        parish = ParishBrief(
            id=str(row["par_id"]),
            name=row["par_name"],
            city=row["par_city"],
            state=row["par_state"],
        )
    return PostResponse(
        id=str(row["id"]),
        author=_build_user(row),
        type=row["type"],
        content=row["content"],
        image_url=row.get("image_url"),
        like_count=row.get("like_count", 0) or 0,
        comment_count=row.get("comment_count", 0) or 0,
        prayer_count=row.get("prayer_count", 0) or 0,
        is_liked=bool(row.get("is_liked", False)),
        is_praying=bool(row.get("is_praying", False)),
        created_at=row["created_at"],
        parish=parish,
    )


_POST_SELECT = """
    SELECT
        p.id, p.type, p.content, p.image_url, p.created_at,
        u.id AS author_id, u.username AS author_username,
        u.display_name AS author_display_name,
        u.avatar_url AS author_avatar_url,
        u.created_at AS author_created_at,
        par.id AS par_id, par.name AS par_name,
        par.city AS par_city, par.state AS par_state,
        COUNT(DISTINCT pr_like.id) FILTER (WHERE pr_like.type = 'like') AS like_count,
        COUNT(DISTINCT pr_pray.id) FILTER (WHERE pr_pray.type = 'pray') AS prayer_count,
        COUNT(DISTINCT c.id)                                             AS comment_count,
        BOOL_OR(pr_like.user_id = $1)                                   AS is_liked,
        BOOL_OR(pr_pray.user_id = $1)                                   AS is_praying
    FROM posts p
    JOIN users u ON u.id = p.author_id
    LEFT JOIN parishes par ON par.id = p.parish_id
    LEFT JOIN post_reactions pr_like ON pr_like.post_id = p.id AND pr_like.type = 'like'
    LEFT JOIN post_reactions pr_pray ON pr_pray.post_id = p.id AND pr_pray.type = 'pray'
    LEFT JOIN comments c ON c.post_id = p.id
"""


@router.get("", response_model=FeedResponse)
async def get_feed(
    limit: int = Query(20, le=100),
    cursor: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    cursor_dt = datetime.fromisoformat(cursor) if cursor else datetime.now(timezone.utc)
    uid = current_user["id"]

    rows = await conn.fetch(
        f"""
        {_POST_SELECT}
        WHERE (
            p.author_id = $1
            OR p.author_id IN (
                SELECT CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END
                FROM friendships f
                WHERE f.status = 'accepted'
                  AND (f.requester_id = $1 OR f.addressee_id = $1)
            )
            OR (
                p.parish_id IS NOT NULL
                AND p.parish_id = (SELECT parish_id FROM users WHERE id = $1)
            )
        )
        AND p.created_at < $2
        GROUP BY p.id, u.id, par.id
        ORDER BY p.created_at DESC
        LIMIT $3
        """,
        uid,
        cursor_dt,
        limit,
    )

    posts = [_build_post(dict(r)) for r in rows]
    next_cursor = posts[-1].created_at.isoformat() if len(posts) == limit else None
    return FeedResponse(posts=posts, next_cursor=next_cursor)


@router.post("/posts", response_model=PostResponse, status_code=201)
async def create_post(
    body: PostCreate,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    parish_id = body.parish_id

    # Default to the author's own parish if not explicitly provided
    if not parish_id:
        parish_id = current_user.get("parish_id")

    if parish_id:
        exists = await conn.fetchval("SELECT id FROM parishes WHERE id = $1", parish_id)
        if exists is None:
            raise HTTPException(status_code=400, detail="Parish not found")

    async with conn.transaction():
        post_row = await conn.fetchrow(
            """
            INSERT INTO posts (author_id, type, content, image_url, parish_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            """,
            current_user["id"],
            body.type,
            body.content,
            body.image_url,
            parish_id,
        )

    row = await conn.fetchrow(
        f"{_POST_SELECT} WHERE p.id = $2 GROUP BY p.id, u.id, par.id",
        current_user["id"],
        post_row["id"],
    )
    return _build_post(dict(row))


@router.post("/posts/{post_id}/like", response_model=dict)
async def like_post(
    post_id: str,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    post = await conn.fetchrow("SELECT id, author_id FROM posts WHERE id = $1", post_id)
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")

    async with conn.transaction():
        await conn.execute(
            "INSERT INTO post_reactions (post_id, user_id, type) VALUES ($1, $2, 'like') ON CONFLICT DO NOTHING",
            post_id,
            current_user["id"],
        )
        await create_notification(
            conn,
            user_id=str(post["author_id"]),
            actor_id=str(current_user["id"]),
            type="post_like",
            message=f"{current_user['display_name']} liked your post",
            target_id=post_id,
        )

    count = await conn.fetchval(
        "SELECT COUNT(*) FROM post_reactions WHERE post_id = $1 AND type = 'like'", post_id
    )
    return {"liked": True, "like_count": count}


@router.delete("/posts/{post_id}/like", response_model=dict)
async def unlike_post(
    post_id: str,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    await conn.execute(
        "DELETE FROM post_reactions WHERE post_id = $1 AND user_id = $2 AND type = 'like'",
        post_id,
        current_user["id"],
    )
    count = await conn.fetchval(
        "SELECT COUNT(*) FROM post_reactions WHERE post_id = $1 AND type = 'like'", post_id
    )
    return {"liked": False, "like_count": count}


@router.post("/posts/{post_id}/pray", response_model=dict)
async def pray_post(
    post_id: str,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    post = await conn.fetchrow("SELECT id, author_id FROM posts WHERE id = $1", post_id)
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")

    async with conn.transaction():
        await conn.execute(
            "INSERT INTO post_reactions (post_id, user_id, type) VALUES ($1, $2, 'pray') ON CONFLICT DO NOTHING",
            post_id,
            current_user["id"],
        )
        await create_notification(
            conn,
            user_id=str(post["author_id"]),
            actor_id=str(current_user["id"]),
            type="prayer_received",
            message=f"{current_user['display_name']} is praying for your post",
            target_id=post_id,
        )

    count = await conn.fetchval(
        "SELECT COUNT(*) FROM post_reactions WHERE post_id = $1 AND type = 'pray'", post_id
    )
    return {"praying": True, "prayer_count": count}


@router.delete("/posts/{post_id}/pray", response_model=dict)
async def unpray_post(
    post_id: str,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    await conn.execute(
        "DELETE FROM post_reactions WHERE post_id = $1 AND user_id = $2 AND type = 'pray'",
        post_id,
        current_user["id"],
    )
    count = await conn.fetchval(
        "SELECT COUNT(*) FROM post_reactions WHERE post_id = $1 AND type = 'pray'", post_id
    )
    return {"praying": False, "prayer_count": count}
