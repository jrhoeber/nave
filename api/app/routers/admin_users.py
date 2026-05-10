"""Admin routes for managing user accounts."""
import logging

from fastapi import APIRouter, Depends, HTTPException, Query

from app.database import get_db
from app.routers.admin import _require_admin
from app.utils.storage import get_avatar_signed_url

logger = logging.getLogger("nave.admin")

router = APIRouter()

_GCS_PATH_PREFIX = "avatars/"


def _resolve_avatar(raw: str | None) -> str | None:
    if raw and raw.startswith(_GCS_PATH_PREFIX):
        return get_avatar_signed_url(raw)
    return raw


@router.get("")
async def list_users(
    q: str = Query("", description="Search by username or display name"),
    limit: int = Query(50, le=200),
    admin: dict = Depends(_require_admin),
    conn=Depends(get_db),
):
    """List users for admin management; optional fuzzy search."""
    if q:
        rows = await conn.fetch(
            """
            SELECT u.id, u.username, u.display_name, u.avatar_url, u.created_at,
                   u.parish_id, p.name AS parish_name,
                   EXISTS(SELECT 1 FROM app_admins a WHERE a.user_id = u.id) AS is_app_admin
            FROM users u
            LEFT JOIN parishes p ON p.id = u.parish_id
            WHERE u.username ILIKE $1 OR u.display_name ILIKE $1
            ORDER BY u.created_at DESC
            LIMIT $2
            """,
            f"%{q}%",
            limit,
        )
    else:
        rows = await conn.fetch(
            """
            SELECT u.id, u.username, u.display_name, u.avatar_url, u.created_at,
                   u.parish_id, p.name AS parish_name,
                   EXISTS(SELECT 1 FROM app_admins a WHERE a.user_id = u.id) AS is_app_admin
            FROM users u
            LEFT JOIN parishes p ON p.id = u.parish_id
            ORDER BY u.created_at DESC
            LIMIT $1
            """,
            limit,
        )
    return {
        "users": [
            {
                "id": str(r["id"]),
                "username": r["username"],
                "display_name": r["display_name"],
                "avatar_url": _resolve_avatar(r.get("avatar_url")),
                "parish_id": str(r["parish_id"]) if r.get("parish_id") else None,
                "parish_name": r.get("parish_name"),
                "is_app_admin": r["is_app_admin"],
                "created_at": r["created_at"].isoformat(),
            }
            for r in rows
        ]
    }


@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: str,
    admin: dict = Depends(_require_admin),
    conn=Depends(get_db),
):
    """Delete a user account. Mirrors the self-delete flow in users.delete_my_account:
    reassigns or deletes admin-owned prayer groups, stamps moderation rows for retention
    sweep, then deletes the user (other FKs cascade)."""
    if str(user_id) == str(admin["id"]):
        raise HTTPException(status_code=400, detail="Use the in-app account delete to remove your own account")

    exists = await conn.fetchval("SELECT 1 FROM users WHERE id = $1::uuid", user_id)
    if not exists:
        raise HTTPException(status_code=404, detail="User not found")

    async with conn.transaction():
        admin_groups = await conn.fetch(
            "SELECT id FROM prayer_groups WHERE admin_id = $1::uuid", user_id
        )
        for row in admin_groups:
            group_id = row["id"]
            next_admin = await conn.fetchrow(
                """
                SELECT user_id FROM prayer_group_members
                WHERE group_id = $1 AND user_id <> $2::uuid AND status = 'member'
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
        await conn.execute(
            "UPDATE moderation_queue SET account_deleted_at = NOW() "
            "WHERE user_id = $1::uuid",
            user_id,
        )
        await conn.execute("DELETE FROM users WHERE id = $1::uuid", user_id)

    logger.info("Admin %s deleted user %s", admin["id"], user_id)
