from fastapi import APIRouter, Depends, HTTPException, Query

from app.database import get_db
from app.dependencies import get_current_user
from app.models.friendship import FriendRequestCreate, FriendRequestUpdate
from app.utils.storage import get_avatar_signed_url

router = APIRouter()

_GCS_PATH_PREFIX = "avatars/"


def _resolve_avatar(raw: str | None) -> str | None:
    if raw and raw.startswith(_GCS_PATH_PREFIX):
        return get_avatar_signed_url(raw)
    return raw


def _build_friendship(row: dict, current_user_id: str) -> dict:
    return {
        "id": str(row["id"]),
        "status": row["status"],
        "is_requester": str(row["requester_id"]) == str(current_user_id),
        "created_at": row["created_at"],
        "user": {
            "id": str(row["other_id"]),
            "username": row["other_username"],
            "display_name": row["other_display_name"],
            "avatar_url": _resolve_avatar(row.get("other_avatar_url")),
            "parish": row.get("other_parish_name"),
            "prayer_group_count": row.get("other_prayer_group_count", 0),
        },
    }


# ─── Query helpers ────────────────────────────────────────────────────────────

_FRIEND_SELECT = """
    SELECT
        f.id, f.status, f.requester_id, f.created_at,
        CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END AS other_id,
        CASE WHEN f.requester_id = $1 THEN ua.username     ELSE ur.username     END AS other_username,
        CASE WHEN f.requester_id = $1 THEN ua.display_name ELSE ur.display_name END AS other_display_name,
        CASE WHEN f.requester_id = $1 THEN ua.avatar_url   ELSE ur.avatar_url   END AS other_avatar_url,
        CASE WHEN f.requester_id = $1 THEN pa.name         ELSE pr.name         END AS other_parish_name,
        CASE WHEN f.requester_id = $1
             THEN COALESCE(usa.prayer_group_count, 0)
             ELSE COALESCE(usr.prayer_group_count, 0)
        END AS other_prayer_group_count
    FROM friendships f
    JOIN users ur ON ur.id = f.requester_id
    JOIN users ua ON ua.id = f.addressee_id
    LEFT JOIN parishes pr  ON pr.id  = ur.parish_id
    LEFT JOIN parishes pa  ON pa.id  = ua.parish_id
    LEFT JOIN user_stats usr ON usr.id = ur.id
    LEFT JOIN user_stats usa ON usa.id = ua.id
"""

# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/search")
async def search_for_friends(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, le=50),
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    """Search users by name, username, or email — returns each result with their friendship status."""
    rows = await conn.fetch(
        """
        SELECT
            u.id, u.username, u.display_name, u.avatar_url,
            p.name AS parish_name,
            COALESCE(us.prayer_group_count, 0) AS prayer_group_count,
            f.id             AS friendship_id,
            f.status         AS friendship_status,
            f.requester_id   AS friendship_requester_id
        FROM users u
        LEFT JOIN parishes p   ON p.id  = u.parish_id
        LEFT JOIN user_stats us ON us.id = u.id
        LEFT JOIN friendships f ON (
            (f.requester_id = $2 AND f.addressee_id = u.id)
            OR (f.addressee_id = $2 AND f.requester_id = u.id)
        )
        WHERE u.id != $2
          AND (u.username ILIKE $1 OR u.display_name ILIKE $1 OR u.email ILIKE $1)
          AND NOT EXISTS (
              SELECT 1 FROM user_blocks
              WHERE (blocker_id = $2 AND blocked_id = u.id)
                 OR (blocker_id = u.id AND blocked_id = $2)
          )
        ORDER BY u.display_name
        LIMIT $3
        """,
        f"%{q}%",
        current_user["id"],
        limit,
    )
    results = []
    for r in rows:
        r = dict(r)
        fid = r.get("friendship_id")
        freq = r.get("friendship_requester_id")
        results.append({
            "id": str(r["id"]),
            "username": r["username"],
            "display_name": r["display_name"],
            "avatar_url": _resolve_avatar(r.get("avatar_url")),
            "parish": r.get("parish_name"),
            "prayer_group_count": r["prayer_group_count"],
            "friendship_id": str(fid) if fid else None,
            "friendship_status": r.get("friendship_status"),
            "is_requester": str(freq) == str(current_user["id"]) if freq else None,
        })
    return {"users": results}


@router.post("/requests", status_code=201)
async def send_friend_request(
    body: FriendRequestCreate,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    if str(body.addressee_id) == str(current_user["id"]):
        raise HTTPException(status_code=400, detail="Cannot send a friend request to yourself")

    addressee = await conn.fetchrow("SELECT id FROM users WHERE id = $1", body.addressee_id)
    if not addressee:
        raise HTTPException(status_code=404, detail="User not found")

    block = await conn.fetchrow(
        """
        SELECT 1 FROM user_blocks
        WHERE (blocker_id = $1 AND blocked_id = $2)
           OR (blocker_id = $2 AND blocked_id = $1)
        """,
        current_user["id"],
        body.addressee_id,
    )
    if block:
        raise HTTPException(status_code=404, detail="User not found")

    existing = await conn.fetchrow(
        """
        SELECT id, status, requester_id FROM friendships
        WHERE (requester_id = $1 AND addressee_id = $2)
           OR (requester_id = $2 AND addressee_id = $1)
        """,
        current_user["id"],
        body.addressee_id,
    )
    if existing:
        status = existing["status"]
        if status == "accepted":
            raise HTTPException(status_code=409, detail="Already friends")
        if status == "pending":
            # If the other person already sent us a request, auto-accept
            if str(existing["requester_id"]) != str(current_user["id"]):
                await conn.execute(
                    "UPDATE friendships SET status = 'accepted', updated_at = NOW() WHERE id = $1",
                    existing["id"],
                )
                # Maintain friend_edges
                await conn.execute(
                    "INSERT INTO friend_edges (user_id, friend_id) VALUES ($1, $2), ($2, $1) ON CONFLICT DO NOTHING",
                    current_user["id"],
                    body.addressee_id,
                )
                return {"message": "Friend request accepted"}
            raise HTTPException(status_code=409, detail="Friend request already sent")
        if status == "rejected":
            # Allow re-requesting by resetting the row
            await conn.execute(
                """
                UPDATE friendships
                SET requester_id = $1, addressee_id = $2, status = 'pending', updated_at = NOW()
                WHERE id = $3
                """,
                current_user["id"],
                body.addressee_id,
                existing["id"],
            )
            return {"message": "Friend request sent"}

    await conn.execute(
        "INSERT INTO friendships (requester_id, addressee_id) VALUES ($1, $2)",
        current_user["id"],
        body.addressee_id,
    )

    # Enqueue inbox notification + push
    try:
        requester_row = await conn.fetchrow(
            "SELECT display_name FROM users WHERE id = $1", current_user["id"]
        )
        if requester_row:
            from app.utils.inbox import enqueue
            await enqueue(
                conn,
                user_ids=[body.addressee_id],
                type_="friend_request",
                title="New Friend Request",
                body=f"{requester_row['display_name']} sent you a friend request",
                push_data={"type": "friend_request"},
                actor_id=current_user["id"],
                payload={"requester_name": requester_row["display_name"]},
                pref_filter_sql=" AND notify_friend_requests = TRUE",
            )
    except Exception:
        import logging
        logging.getLogger("nave.api").exception("Failed to enqueue friend request notification")

    return {"message": "Friend request sent"}


@router.get("")
async def get_friends(
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    rows = await conn.fetch(
        _FRIEND_SELECT + """
        WHERE (f.requester_id = $1 OR f.addressee_id = $1)
          AND f.status = 'accepted'
        ORDER BY f.updated_at DESC
        """,
        current_user["id"],
    )
    return {"friends": [_build_friendship(dict(r), current_user["id"]) for r in rows]}


@router.get("/requests/incoming")
async def get_incoming_requests(
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    rows = await conn.fetch(
        _FRIEND_SELECT + """
        WHERE f.addressee_id = $1
          AND f.status = 'pending'
        ORDER BY f.created_at DESC
        """,
        current_user["id"],
    )
    return {"requests": [_build_friendship(dict(r), current_user["id"]) for r in rows]}


@router.patch("/requests/{friendship_id}")
async def respond_to_request(
    friendship_id: str,
    body: FriendRequestUpdate,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    if body.status not in ("accepted", "rejected"):
        raise HTTPException(status_code=400, detail="status must be 'accepted' or 'rejected'")

    row = await conn.fetchrow(
        "SELECT id, requester_id, addressee_id, status FROM friendships WHERE id = $1",
        friendship_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Friend request not found")
    if str(row["addressee_id"]) != str(current_user["id"]):
        raise HTTPException(status_code=403, detail="Not authorized")
    if row["status"] != "pending":
        raise HTTPException(status_code=409, detail="Request is no longer pending")

    await conn.execute(
        "UPDATE friendships SET status = $1, updated_at = NOW() WHERE id = $2",
        body.status,
        friendship_id,
    )

    if body.status == "accepted":
        # Maintain friend_edges
        await conn.execute(
            "INSERT INTO friend_edges (user_id, friend_id) VALUES ($1, $2), ($2, $1) ON CONFLICT DO NOTHING",
            row["requester_id"],
            row["addressee_id"],
        )

    return {"status": body.status}


@router.delete("/{friendship_id}", status_code=204)
async def remove_friendship(
    friendship_id: str,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    """Remove a friend, cancel an outgoing request, or delete any friendship record."""
    row = await conn.fetchrow(
        """
        SELECT id, requester_id, addressee_id FROM friendships
        WHERE id = $1 AND (requester_id = $2 OR addressee_id = $2)
        """,
        friendship_id,
        current_user["id"],
    )
    if not row:
        raise HTTPException(status_code=404, detail="Friendship not found")
    await conn.execute("DELETE FROM friendships WHERE id = $1", friendship_id)
    # Clean up friend_edges
    await conn.execute(
        "DELETE FROM friend_edges WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)",
        row["requester_id"],
        row["addressee_id"],
    )
