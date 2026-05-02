from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import MutualFriendBrief, UserResponse, UserUpdate
from app.utils.storage import (
    _ALLOWED_CONTENT_TYPES,
    _MAX_AVATAR_BYTES,
    get_avatar_signed_url,
    upload_avatar,
)

router = APIRouter()

_GCS_PATH_PREFIX = "avatars/"


def _resolve_avatar_url(raw: str | None) -> str | None:
    """Convert a stored GCS object path to a signed URL; pass through other URLs unchanged."""
    if raw and raw.startswith(_GCS_PATH_PREFIX):
        return get_avatar_signed_url(raw)
    return raw


def _build_user_response(row: dict) -> UserResponse:
    return UserResponse(
        id=str(row["id"]),
        username=row["username"],
        display_name=row["display_name"],
        bio=row.get("bio"),
        avatar_url=_resolve_avatar_url(row.get("avatar_url")),
        parish_id=str(row["parish_id"]) if row.get("parish_id") else None,
        parish=row.get("parish_name"),
        parish_city=row.get("parish_city"),
        diocese=row.get("diocese"),
        location=row.get("location"),
        birthday=row.get("birthday"),
        friend_count=row.get("friend_count", 0),
        prayer_group_count=row.get("prayer_group_count", 0),
        created_at=row["created_at"],
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
               COALESCE(us.prayer_group_count,0) AS prayer_group_count
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
    return {"users": [_build_user_response(dict(r)) for r in rows]}


@router.get("/me", response_model=UserResponse)
async def get_my_profile(
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    row = await conn.fetchrow(
        """
        SELECT u.*, p.name AS parish_name,
               COALESCE(us.prayer_group_count,0) AS prayer_group_count
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
            SELECT u.*, COALESCE(us.prayer_group_count,0) AS prayer_group_count
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
               COALESCE(us.prayer_group_count,0) AS prayer_group_count
        FROM users u
        LEFT JOIN parishes p ON p.id = u.parish_id
        LEFT JOIN user_stats us ON us.id = u.id
        WHERE u.id = $1
        """,
        current_user["id"],
    )
    return _build_user_response(dict(row))


@router.post("/me/avatar", response_model=UserResponse)
async def upload_my_avatar(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    if not settings.gcs_enabled:
        raise HTTPException(status_code=501, detail="File uploads are not enabled")

    content_type = file.content_type or "image/jpeg"
    if content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported image type: {content_type}")

    file_bytes = await file.read()
    if len(file_bytes) > _MAX_AVATAR_BYTES:
        raise HTTPException(status_code=413, detail="Avatar image must be under 5 MB")

    from app.moderation.image_moderator import check_image_or_raise
    await check_image_or_raise(conn, image_bytes=file_bytes, user_id=str(current_user["id"]),
                               context_type="image_avatar")

    object_name = upload_avatar(file_bytes, str(current_user["id"]), content_type)

    await conn.execute(
        "UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2",
        object_name,
        current_user["id"],
    )
    row = await conn.fetchrow(
        """
        SELECT u.*, p.name AS parish_name,
               COALESCE(us.prayer_group_count,0) AS prayer_group_count
        FROM users u
        LEFT JOIN parishes p ON p.id = u.parish_id
        LEFT JOIN user_stats us ON us.id = u.id
        WHERE u.id = $1
        """,
        current_user["id"],
    )
    return _build_user_response(dict(row))


@router.delete("/me", status_code=204)
async def delete_my_account(
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    user_id = current_user["id"]
    async with conn.transaction():
        # For each group this user admins, reassign or delete
        admin_groups = await conn.fetch(
            "SELECT id FROM prayer_groups WHERE admin_id = $1", user_id
        )
        for row in admin_groups:
            group_id = row["id"]
            next_admin = await conn.fetchrow(
                """
                SELECT user_id FROM prayer_group_members
                WHERE group_id = $1 AND user_id <> $2 AND status = 'member'
                ORDER BY joined_at ASC
                LIMIT 1
                """,
                group_id, user_id,
            )
            if next_admin:
                await conn.execute(
                    "UPDATE prayer_groups SET admin_id = $1 WHERE id = $2",
                    next_admin["user_id"], group_id,
                )
            else:
                await conn.execute(
                    "DELETE FROM prayer_groups WHERE id = $1", group_id
                )
        # Delete user — all other FKs cascade
        await conn.execute("DELETE FROM users WHERE id = $1", user_id)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    row = await conn.fetchrow(
        """
        SELECT u.*, p.name AS parish_name, p.city AS parish_city,
               COALESCE(us.prayer_group_count,0) AS prayer_group_count,
               COALESCE(us.friend_count,0) AS friend_count
        FROM users u
        LEFT JOIN parishes p ON p.id = u.parish_id
        LEFT JOIN user_stats us ON us.id = u.id
        WHERE u.id = $1
        """,
        user_id,
    )
    if row is None:
        raise HTTPException(status_code=404, detail="User not found")

    block = await conn.fetchrow(
        """
        SELECT 1 FROM user_blocks
        WHERE (blocker_id = $1 AND blocked_id = $2)
           OR (blocker_id = $2 AND blocked_id = $1)
        """,
        current_user["id"],
        user_id,
    )
    if block:
        raise HTTPException(status_code=404, detail="User not found")

    response = _build_user_response(dict(row))

    friendship = await conn.fetchrow(
        """
        SELECT status, requester_id, created_at
        FROM friendships
        WHERE (requester_id = $1 AND addressee_id = $2)
           OR (requester_id = $2 AND addressee_id = $1)
        """,
        current_user["id"], user_id,
    )
    if friendship:
        if friendship["status"] == "accepted":
            response.is_friend = True
            response.friendship_created_at = friendship["created_at"]
        elif friendship["status"] == "pending" and str(friendship["requester_id"]) == str(current_user["id"]):
            response.is_pending_friend = True

    # Mutual friends: users who are friends with both current_user and target user
    mutual_rows = await conn.fetch(
        """
        SELECT u.id, u.display_name, u.avatar_url
        FROM friendships f1
        JOIN friendships f2
            ON f2.status = 'accepted'
            AND (
                (f2.requester_id = $2 AND f2.addressee_id = CASE WHEN f1.requester_id = $1 THEN f1.addressee_id ELSE f1.requester_id END)
                OR (f2.addressee_id = $2 AND f2.requester_id = CASE WHEN f1.requester_id = $1 THEN f1.addressee_id ELSE f1.requester_id END)
            )
        JOIN users u ON u.id = CASE WHEN f1.requester_id = $1 THEN f1.addressee_id ELSE f1.requester_id END
        WHERE f1.status = 'accepted'
          AND (f1.requester_id = $1 OR f1.addressee_id = $1)
          AND u.id <> $2
        LIMIT 5
        """,
        current_user["id"], user_id,
    )
    response.mutual_friends = [
        MutualFriendBrief(
            id=str(r["id"]),
            display_name=r["display_name"],
            avatar_url=_resolve_avatar_url(r.get("avatar_url")),
        )
        for r in mutual_rows
    ]
    response.mutual_friend_count = len(mutual_rows)
    # If we got exactly 5, there may be more — do a full count
    if len(mutual_rows) == 5:
        count_row = await conn.fetchrow(
            """
            SELECT COUNT(*) AS cnt
            FROM friendships f1
            JOIN friendships f2
                ON f2.status = 'accepted'
                AND (
                    (f2.requester_id = $2 AND f2.addressee_id = CASE WHEN f1.requester_id = $1 THEN f1.addressee_id ELSE f1.requester_id END)
                    OR (f2.addressee_id = $2 AND f2.requester_id = CASE WHEN f1.requester_id = $1 THEN f1.addressee_id ELSE f1.requester_id END)
                )
            JOIN users u ON u.id = CASE WHEN f1.requester_id = $1 THEN f1.addressee_id ELSE f1.requester_id END
            WHERE f1.status = 'accepted'
              AND (f1.requester_id = $1 OR f1.addressee_id = $1)
              AND u.id <> $2
            """,
            current_user["id"], user_id,
        )
        response.mutual_friend_count = count_row["cnt"]

    # Shared prayer groups
    shared_count = await conn.fetchrow(
        """
        SELECT COUNT(*) AS cnt
        FROM prayer_group_members m1
        JOIN prayer_group_members m2
            ON m2.group_id = m1.group_id AND m2.user_id = $2 AND m2.status = 'member'
        WHERE m1.user_id = $1 AND m1.status = 'member'
        """,
        current_user["id"], user_id,
    )
    response.shared_group_count = shared_count["cnt"] if shared_count else 0

    return response
