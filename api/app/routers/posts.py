from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.database import get_db
from app.dependencies import get_current_user
from app.models.post import CommentCreate, CommentResponse, CommentUpdate, CommentsResponse
from app.models.user import UserResponse
from app.utils.notifications import create_notification
from app.routers.feed import _POST_SELECT, _build_post  # noqa: F401

router = APIRouter()


def _build_comment(row: dict) -> CommentResponse:
    author = UserResponse(
        id=str(row["author_id"]),
        username=row["author_username"],
        display_name=row["author_display_name"],
        avatar_url=row.get("author_avatar_url"),
        created_at=row["author_created_at"],
    )
    return CommentResponse(
        id=str(row["id"]),
        author=author,
        content=row["content"],
        like_count=row.get("like_count", 0) or 0,
        is_liked=bool(row.get("is_liked", False)),
        created_at=row["created_at"],
    )


_COMMENT_SELECT = """
    SELECT
        c.id, c.content, c.created_at,
        u.id AS author_id, u.username AS author_username,
        u.display_name AS author_display_name,
        u.avatar_url AS author_avatar_url,
        u.created_at AS author_created_at,
        COUNT(DISTINCT cl.id) AS like_count,
        BOOL_OR(cl.user_id = $1) AS is_liked
    FROM comments c
    JOIN users u ON u.id = c.author_id
    LEFT JOIN comment_likes cl ON cl.comment_id = c.id
"""


@router.get("/{post_id}", response_model=dict)
async def get_post(
    post_id: str,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    row = await conn.fetchrow(
        f"{_POST_SELECT} WHERE p.id = $2 GROUP BY p.id, u.id, par.id",
        current_user["id"],
        post_id,
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Post not found")
    return _build_post(dict(row))


@router.delete("/{post_id}", response_model=dict)
async def delete_post(
    post_id: str,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    row = await conn.fetchrow("SELECT author_id FROM posts WHERE id = $1", post_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Post not found")
    if str(row["author_id"]) != str(current_user["id"]):
        raise HTTPException(status_code=403, detail="Not your post")
    await conn.execute("DELETE FROM posts WHERE id = $1", post_id)
    return {"success": True}


@router.get("/{post_id}/comments", response_model=CommentsResponse)
async def list_comments(
    post_id: str,
    limit: int = Query(50, le=200),
    cursor: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    post = await conn.fetchrow("SELECT id FROM posts WHERE id = $1", post_id)
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")

    cursor_dt = datetime.fromisoformat(cursor) if cursor else datetime(1970, 1, 1, tzinfo=timezone.utc)

    rows = await conn.fetch(
        f"""
        {_COMMENT_SELECT}
        WHERE c.post_id = $2 AND c.created_at > $3
        GROUP BY c.id, u.id
        ORDER BY c.created_at ASC
        LIMIT $4
        """,
        current_user["id"],
        post_id,
        cursor_dt,
        limit,
    )
    comments = [_build_comment(dict(r)) for r in rows]
    next_cursor = comments[-1].created_at.isoformat() if len(comments) == limit else None
    return CommentsResponse(comments=comments, next_cursor=next_cursor)


@router.post("/{post_id}/comments", response_model=CommentResponse, status_code=201)
async def create_comment(
    post_id: str,
    body: CommentCreate,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    post = await conn.fetchrow("SELECT id, author_id FROM posts WHERE id = $1", post_id)
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")

    async with conn.transaction():
        comment_row = await conn.fetchrow(
            "INSERT INTO comments (post_id, author_id, content) VALUES ($1, $2, $3) RETURNING *",
            post_id,
            current_user["id"],
            body.content,
        )
        await create_notification(
            conn,
            user_id=str(post["author_id"]),
            actor_id=str(current_user["id"]),
            type="post_comment",
            message=f"{current_user['display_name']} commented on your post",
            target_id=post_id,
        )

    row = await conn.fetchrow(
        f"{_COMMENT_SELECT} WHERE c.id = $2 GROUP BY c.id, u.id",
        current_user["id"],
        comment_row["id"],
    )
    return _build_comment(dict(row))


@router.patch("/{post_id}/comments/{comment_id}", response_model=CommentResponse)
async def update_comment(
    post_id: str,
    comment_id: str,
    body: CommentUpdate,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    c = await conn.fetchrow(
        "SELECT author_id FROM comments WHERE id = $1 AND post_id = $2", comment_id, post_id
    )
    if c is None:
        raise HTTPException(status_code=404, detail="Comment not found")
    if str(c["author_id"]) != str(current_user["id"]):
        raise HTTPException(status_code=403, detail="Not your comment")

    await conn.execute(
        "UPDATE comments SET content = $1, updated_at = NOW() WHERE id = $2",
        body.content,
        comment_id,
    )
    row = await conn.fetchrow(
        f"{_COMMENT_SELECT} WHERE c.id = $2 GROUP BY c.id, u.id",
        current_user["id"],
        comment_id,
    )
    return _build_comment(dict(row))


@router.delete("/{post_id}/comments/{comment_id}", response_model=dict)
async def delete_comment(
    post_id: str,
    comment_id: str,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    c = await conn.fetchrow(
        "SELECT c.author_id, p.author_id AS post_author_id FROM comments c JOIN posts p ON p.id = c.post_id WHERE c.id = $1 AND c.post_id = $2",
        comment_id,
        post_id,
    )
    if c is None:
        raise HTTPException(status_code=404, detail="Comment not found")

    uid = str(current_user["id"])
    if uid != str(c["author_id"]) and uid != str(c["post_author_id"]):
        raise HTTPException(status_code=403, detail="Not authorized")

    await conn.execute("DELETE FROM comments WHERE id = $1", comment_id)
    return {"success": True}


@router.post("/{post_id}/comments/{comment_id}/like", response_model=dict)
async def like_comment(
    post_id: str,
    comment_id: str,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    c = await conn.fetchrow(
        "SELECT id FROM comments WHERE id = $1 AND post_id = $2", comment_id, post_id
    )
    if c is None:
        raise HTTPException(status_code=404, detail="Comment not found")

    await conn.execute(
        "INSERT INTO comment_likes (comment_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        comment_id,
        current_user["id"],
    )
    count = await conn.fetchval("SELECT COUNT(*) FROM comment_likes WHERE comment_id = $1", comment_id)
    return {"liked": True, "like_count": count}


@router.delete("/{post_id}/comments/{comment_id}/like", response_model=dict)
async def unlike_comment(
    post_id: str,
    comment_id: str,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    await conn.execute(
        "DELETE FROM comment_likes WHERE comment_id = $1 AND user_id = $2",
        comment_id,
        current_user["id"],
    )
    count = await conn.fetchval("SELECT COUNT(*) FROM comment_likes WHERE comment_id = $1", comment_id)
    return {"liked": False, "like_count": count}
