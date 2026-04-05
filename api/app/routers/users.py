from fastapi import APIRouter, Depends, HTTPException, Query

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import UserResponse, UserUpdate

router = APIRouter()


def _build_user_response(row: dict, current_user_id: str | None = None) -> UserResponse:
    return UserResponse(
        id=str(row["id"]),
        username=row["username"],
        display_name=row["display_name"],
        bio=row.get("bio"),
        avatar_url=row.get("avatar_url"),
        parish_id=str(row["parish_id"]) if row.get("parish_id") else None,
        parish=row.get("parish_name"),
        diocese=row.get("diocese"),
        location=row.get("location"),
        friend_count=row.get("friend_count", 0),
        prayer_group_count=row.get("prayer_group_count", 0),
        post_count=row.get("post_count", 0),
        created_at=row["created_at"],
        is_friend=row.get("is_friend"),
        is_pending_friend=row.get("is_pending_friend"),
    )


@router.get("/search", response_model=dict)
async def search_users(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, le=100),
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    rows = await conn.fetch(
        """
        SELECT u.*, p.name AS parish_name,
               COALESCE(us.friend_count,0) AS friend_count,
               COALESCE(us.prayer_group_count,0) AS prayer_group_count,
               COALESCE(us.post_count,0) AS post_count,
               EXISTS (
                   SELECT 1 FROM friendships f
                   WHERE f.status = 'accepted'
                     AND ((f.requester_id = $2 AND f.addressee_id = u.id)
                       OR (f.addressee_id = $2 AND f.requester_id = u.id))
               ) AS is_friend,
               EXISTS (
                   SELECT 1 FROM friendships f
                   WHERE f.status = 'pending' AND f.requester_id = $2 AND f.addressee_id = u.id
               ) AS is_pending_friend
        FROM users u
        LEFT JOIN parishes p ON p.id = u.parish_id
        LEFT JOIN user_stats us ON us.id = u.id
        WHERE u.id <> $2
          AND (u.username ILIKE $1 OR u.display_name ILIKE $1)
        LIMIT $3
        """,
        f"%{q}%",
        current_user["id"],
        limit,
    )
    return {"users": [_build_user_response(dict(r), str(current_user["id"])) for r in rows]}


@router.get("/me", response_model=UserResponse)
async def get_my_profile(
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    row = await conn.fetchrow(
        """
        SELECT u.*, p.name AS parish_name,
               COALESCE(us.friend_count,0) AS friend_count,
               COALESCE(us.prayer_group_count,0) AS prayer_group_count,
               COALESCE(us.post_count,0) AS post_count
        FROM users u
        LEFT JOIN parishes p ON p.id = u.parish_id
        LEFT JOIN user_stats us ON us.id = u.id
        WHERE u.id = $1
        """,
        current_user["id"],
    )
    return _build_user_response(dict(row))


@router.patch("/me", response_model=UserResponse)
async def update_my_profile(
    body: UserUpdate,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        row = await conn.fetchrow(
            """
            SELECT u.*, COALESCE(us.friend_count,0) AS friend_count,
                   COALESCE(us.prayer_group_count,0) AS prayer_group_count,
                   COALESCE(us.post_count,0) AS post_count
            FROM users u LEFT JOIN user_stats us ON us.id = u.id
            WHERE u.id = $1
            """,
            current_user["id"],
        )
        return _build_user_response(dict(row))

    set_clauses = ", ".join(f"{col} = ${i+2}" for i, col in enumerate(updates.keys()))
    set_clauses += f", updated_at = NOW()"
    values = list(updates.values())

    await conn.execute(
        f"UPDATE users SET {set_clauses} WHERE id = $1",
        current_user["id"],
        *values,
    )
    row = await conn.fetchrow(
        """
        SELECT u.*, p.name AS parish_name,
               COALESCE(us.friend_count,0) AS friend_count,
               COALESCE(us.prayer_group_count,0) AS prayer_group_count,
               COALESCE(us.post_count,0) AS post_count
        FROM users u
        LEFT JOIN parishes p ON p.id = u.parish_id
        LEFT JOIN user_stats us ON us.id = u.id
        WHERE u.id = $1
        """,
        current_user["id"],
    )
    return _build_user_response(dict(row))


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    row = await conn.fetchrow(
        """
        SELECT u.*, p.name AS parish_name,
               COALESCE(us.friend_count,0) AS friend_count,
               COALESCE(us.prayer_group_count,0) AS prayer_group_count,
               COALESCE(us.post_count,0) AS post_count,
               EXISTS (
                   SELECT 1 FROM friendships f
                   WHERE f.status = 'accepted'
                     AND ((f.requester_id = $2 AND f.addressee_id = u.id)
                       OR (f.addressee_id = $2 AND f.requester_id = u.id))
               ) AS is_friend,
               EXISTS (
                   SELECT 1 FROM friendships f
                   WHERE f.status = 'pending' AND f.requester_id = $2 AND f.addressee_id = u.id
               ) AS is_pending_friend
        FROM users u
        LEFT JOIN parishes p ON p.id = u.parish_id
        LEFT JOIN user_stats us ON us.id = u.id
        WHERE u.id = $1
        """,
        user_id,
        current_user["id"],
    )
    if row is None:
        raise HTTPException(status_code=404, detail="User not found")
    return _build_user_response(dict(row), str(current_user["id"]))
