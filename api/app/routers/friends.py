from fastapi import APIRouter, Depends, HTTPException, Query

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import UserResponse
from app.utils.notifications import create_notification

router = APIRouter()


def _build_user(row: dict) -> UserResponse:
    return UserResponse(
        id=str(row["id"]),
        username=row["username"],
        display_name=row["display_name"],
        bio=row.get("bio"),
        avatar_url=row.get("avatar_url"),
        parish=row.get("parish"),
        diocese=row.get("diocese"),
        location=row.get("location"),
        friend_count=row.get("friend_count", 0),
        prayer_group_count=row.get("prayer_group_count", 0),
        post_count=row.get("post_count", 0),
        created_at=row["created_at"],
        is_friend=row.get("is_friend"),
        is_pending_friend=row.get("is_pending_friend"),
    )


@router.get("", response_model=dict)
async def list_friends(
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    rows = await conn.fetch(
        """
        SELECT u.*,
               COALESCE(us.friend_count,0) AS friend_count,
               COALESCE(us.prayer_group_count,0) AS prayer_group_count,
               COALESCE(us.post_count,0) AS post_count,
               TRUE AS is_friend,
               FALSE AS is_pending_friend
        FROM friendships f
        JOIN users u ON u.id = CASE
            WHEN f.requester_id = $1 THEN f.addressee_id
            ELSE f.requester_id
        END
        LEFT JOIN user_stats us ON us.id = u.id
        WHERE f.status = 'accepted'
          AND (f.requester_id = $1 OR f.addressee_id = $1)
        ORDER BY u.display_name
        """,
        current_user["id"],
    )
    return {"friends": [_build_user(dict(r)) for r in rows]}


@router.get("/pending", response_model=dict)
async def pending_requests(
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    rows = await conn.fetch(
        """
        SELECT u.*,
               COALESCE(us.friend_count,0) AS friend_count,
               COALESCE(us.prayer_group_count,0) AS prayer_group_count,
               COALESCE(us.post_count,0) AS post_count,
               FALSE AS is_friend,
               FALSE AS is_pending_friend,
               f.created_at AS requested_at
        FROM friendships f
        JOIN users u ON u.id = f.requester_id
        LEFT JOIN user_stats us ON us.id = u.id
        WHERE f.addressee_id = $1 AND f.status = 'pending'
        ORDER BY f.created_at DESC
        """,
        current_user["id"],
    )
    return {"requests": [_build_user(dict(r)) for r in rows]}


@router.get("/suggestions", response_model=dict)
async def friend_suggestions(
    limit: int = Query(20, le=50),
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    rows = await conn.fetch(
        """
        SELECT DISTINCT u.*,
               COALESCE(us.friend_count,0) AS friend_count,
               COALESCE(us.prayer_group_count,0) AS prayer_group_count,
               COALESCE(us.post_count,0) AS post_count,
               FALSE AS is_friend,
               FALSE AS is_pending_friend
        FROM prayer_group_members pgm
        JOIN prayer_group_members pgm2 ON pgm2.group_id = pgm.group_id AND pgm2.user_id <> $1
        JOIN users u ON u.id = pgm2.user_id
        LEFT JOIN user_stats us ON us.id = u.id
        WHERE pgm.user_id = $1
          AND pgm.status = 'member'
          AND pgm2.status = 'member'
          AND NOT EXISTS (
              SELECT 1 FROM friendships f
              WHERE (f.requester_id = $1 AND f.addressee_id = u.id)
                 OR (f.addressee_id = $1 AND f.requester_id = u.id)
          )
        LIMIT $2
        """,
        current_user["id"],
        limit,
    )
    return {"suggestions": [_build_user(dict(r)) for r in rows]}


@router.post("/request/{user_id}", response_model=dict, status_code=201)
async def send_friend_request(
    user_id: str,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    if str(current_user["id"]) == user_id:
        raise HTTPException(status_code=400, detail="Cannot friend yourself")

    target = await conn.fetchrow("SELECT id, display_name FROM users WHERE id = $1", user_id)
    if target is None:
        raise HTTPException(status_code=404, detail="User not found")

    existing = await conn.fetchrow(
        """
        SELECT id, status FROM friendships
        WHERE (requester_id = $1 AND addressee_id = $2)
           OR (requester_id = $2 AND addressee_id = $1)
        """,
        current_user["id"],
        user_id,
    )
    if existing:
        raise HTTPException(status_code=409, detail="Friend request already exists or already friends")

    async with conn.transaction():
        await conn.execute(
            "INSERT INTO friendships (requester_id, addressee_id) VALUES ($1, $2)",
            current_user["id"],
            user_id,
        )
        await create_notification(
            conn,
            user_id=user_id,
            actor_id=str(current_user["id"]),
            type="friend_request",
            message=f"{current_user['display_name']} sent you a friend request",
            target_id=str(current_user["id"]),
        )
    return {"status": "pending"}


@router.post("/accept/{requester_id}", response_model=dict)
async def accept_friend_request(
    requester_id: str,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    row = await conn.fetchrow(
        "SELECT id FROM friendships WHERE requester_id = $1 AND addressee_id = $2 AND status = 'pending'",
        requester_id,
        current_user["id"],
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Friend request not found")

    async with conn.transaction():
        await conn.execute(
            "UPDATE friendships SET status = 'accepted', updated_at = NOW() WHERE id = $1",
            row["id"],
        )
        await create_notification(
            conn,
            user_id=requester_id,
            actor_id=str(current_user["id"]),
            type="friend_accepted",
            message=f"{current_user['display_name']} accepted your friend request",
            target_id=str(current_user["id"]),
        )
    return {"status": "accepted"}


@router.delete("/reject/{requester_id}", response_model=dict)
async def reject_friend_request(
    requester_id: str,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    result = await conn.execute(
        "DELETE FROM friendships WHERE requester_id = $1 AND addressee_id = $2 AND status = 'pending'",
        requester_id,
        current_user["id"],
    )
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Friend request not found")
    return {"success": True}


@router.delete("/{user_id}", response_model=dict)
async def remove_friend(
    user_id: str,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    result = await conn.execute(
        """
        DELETE FROM friendships
        WHERE status = 'accepted'
          AND ((requester_id = $1 AND addressee_id = $2)
            OR (requester_id = $2 AND addressee_id = $1))
        """,
        current_user["id"],
        user_id,
    )
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Friendship not found")
    return {"success": True}
