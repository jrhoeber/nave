from fastapi import APIRouter, Depends, HTTPException, Response

from app.database import get_db
from app.dependencies import get_current_user
from app.models.block import BlockCreate
from app.utils.storage import get_avatar_signed_url

router = APIRouter()

_GCS_PATH_PREFIX = "avatars/"


def _resolve_avatar(raw: str | None) -> str | None:
    if raw and raw.startswith(_GCS_PATH_PREFIX):
        return get_avatar_signed_url(raw)
    return raw


@router.post("", status_code=201)
async def block_user(
    body: BlockCreate,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    if str(body.blocked_id) == str(current_user["id"]):
        raise HTTPException(status_code=400, detail="Cannot block yourself")

    target = await conn.fetchrow("SELECT id FROM users WHERE id = $1", body.blocked_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    async with conn.transaction():
        # Remove any existing friendship in either direction
        await conn.execute(
            """
            DELETE FROM friendships
            WHERE (requester_id = $1 AND addressee_id = $2)
               OR (requester_id = $2 AND addressee_id = $1)
            """,
            current_user["id"],
            body.blocked_id,
        )
        # Insert block (ignore if already blocked)
        await conn.execute(
            """
            INSERT INTO user_blocks (blocker_id, blocked_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
            """,
            current_user["id"],
            body.blocked_id,
        )

    return {"message": "User blocked"}


@router.delete("/{blocked_id}", status_code=204)
async def unblock_user(
    blocked_id: str,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    await conn.execute(
        "DELETE FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2",
        current_user["id"],
        blocked_id,
    )
    return Response(status_code=204)


@router.get("")
async def get_blocked_users(
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    rows = await conn.fetch(
        """
        SELECT u.id, u.username, u.display_name, u.avatar_url, ub.created_at AS blocked_at
        FROM user_blocks ub
        JOIN users u ON u.id = ub.blocked_id
        WHERE ub.blocker_id = $1
        ORDER BY ub.created_at DESC
        """,
        current_user["id"],
    )
    return {
        "blocked_users": [
            {
                "id": str(r["id"]),
                "username": r["username"],
                "display_name": r["display_name"],
                "avatar_url": _resolve_avatar(r.get("avatar_url")),
                "blocked_at": r["blocked_at"],
            }
            for r in rows
        ]
    }
