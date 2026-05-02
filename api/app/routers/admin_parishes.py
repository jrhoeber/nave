"""Admin routes for managing parishes and parish admins."""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

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


# ── Request / response schemas ───────────────────────────────────────────────

class ParishCreate(BaseModel):
    name: str
    city: str
    state: str
    diocese: str
    street_address: Optional[str] = None
    postal_code: Optional[str] = None
    established: Optional[int] = None
    website: Optional[str] = None
    mass_schedule: Optional[str] = None


class ParishAdminUpdate(BaseModel):
    name: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    diocese: Optional[str] = None
    street_address: Optional[str] = None
    postal_code: Optional[str] = None
    established: Optional[int] = None
    website: Optional[str] = None
    mass_schedule: Optional[str] = None


class ParishAdminAdd(BaseModel):
    user_id: str


# ── Helpers ──────────────────────────────────────────────────────────────────

_COLS = ["id", "name", "street_address", "city", "state", "postal_code", "diocese", "established", "website", "mass_schedule", "created_at"]
PARISH_COLS = ", ".join(f"p.{c}" for c in _COLS)
PARISH_COLS_BARE = ", ".join(_COLS)


def _row_to_dict(row) -> dict:
    return {
        "id": str(row["id"]),
        "name": row["name"],
        "street_address": row.get("street_address"),
        "city": row["city"],
        "state": row["state"],
        "postal_code": row.get("postal_code"),
        "diocese": row["diocese"],
        "established": row.get("established"),
        "website": row.get("website"),
        "mass_schedule": row.get("mass_schedule"),
        "member_count": row.get("member_count", 0),
        "created_at": row["created_at"].isoformat(),
    }


# ── Parish CRUD ──────────────────────────────────────────────────────────────

@router.get("")
async def list_parishes(
    q: str = Query("", description="Search by name"),
    limit: int = Query(50, le=200),
    admin: dict = Depends(_require_admin),
    conn=Depends(get_db),
):
    """List all parishes, optionally filtered by name search."""
    if q:
        rows = await conn.fetch(
            f"""
            SELECT {PARISH_COLS}, COUNT(u.id) AS member_count
            FROM parishes p
            LEFT JOIN users u ON u.parish_id = p.id
            WHERE lower(p.name) ILIKE $1
            GROUP BY p.id
            ORDER BY p.name
            LIMIT $2
            """,
            f"%{q}%",
            limit,
        )
    else:
        rows = await conn.fetch(
            f"""
            SELECT {PARISH_COLS}, COUNT(u.id) AS member_count
            FROM parishes p
            LEFT JOIN users u ON u.parish_id = p.id
            GROUP BY p.id
            ORDER BY p.name
            LIMIT $1
            """,
            limit,
        )
    return {"parishes": [_row_to_dict(r) for r in rows]}


@router.post("", status_code=201)
async def create_parish(
    body: ParishCreate,
    admin: dict = Depends(_require_admin),
    conn=Depends(get_db),
):
    """Create a new parish."""
    row = await conn.fetchrow(
        f"""
        INSERT INTO parishes (name, street_address, city, state, postal_code, diocese, established, website, mass_schedule)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING {PARISH_COLS_BARE}
        """,
        body.name,
        body.street_address,
        body.city,
        body.state,
        body.postal_code,
        body.diocese,
        body.established,
        body.website,
        body.mass_schedule,
    )
    d = _row_to_dict(row)
    d["member_count"] = 0
    logger.info("Admin %s created parish %s (%s)", admin["id"], d["id"], body.name)
    return d


@router.patch("/{parish_id}")
async def update_parish(
    parish_id: str,
    body: ParishAdminUpdate,
    admin: dict = Depends(_require_admin),
    conn=Depends(get_db),
):
    """Update any parish field (admin-level, not limited to the 3-field parish-admin PATCH)."""
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    set_clauses = ", ".join(f"{col} = ${i + 2}" for i, col in enumerate(updates.keys()))
    result = await conn.execute(
        f"UPDATE parishes SET {set_clauses} WHERE id = $1",
        parish_id,
        *updates.values(),
    )
    if result == "UPDATE 0":
        raise HTTPException(status_code=404, detail="Parish not found")

    row = await conn.fetchrow(
        f"""
        SELECT {PARISH_COLS}, COUNT(u.id) AS member_count
        FROM parishes p
        LEFT JOIN users u ON u.parish_id = p.id
        WHERE p.id = $1
        GROUP BY p.id
        """,
        parish_id,
    )
    logger.info("Admin %s updated parish %s", admin["id"], parish_id)
    return _row_to_dict(row)


@router.delete("/{parish_id}", status_code=204)
async def delete_parish(
    parish_id: str,
    admin: dict = Depends(_require_admin),
    conn=Depends(get_db),
):
    """Delete a parish. Users referencing it get parish_id set to NULL (FK ON DELETE SET NULL)."""
    result = await conn.execute(
        "DELETE FROM parishes WHERE id = $1",
        parish_id,
    )
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Parish not found")
    logger.info("Admin %s deleted parish %s", admin["id"], parish_id)


# ── Parish admin management ─────────────────────────────────────────────────

@router.get("/{parish_id}/admins")
async def list_parish_admins(
    parish_id: str,
    admin: dict = Depends(_require_admin),
    conn=Depends(get_db),
):
    """List all parish admins for a given parish."""
    exists = await conn.fetchval("SELECT 1 FROM parishes WHERE id = $1", parish_id)
    if not exists:
        raise HTTPException(status_code=404, detail="Parish not found")

    rows = await conn.fetch(
        """
        SELECT u.id, u.username, u.display_name, u.avatar_url, pa.granted_at
        FROM parish_admins pa
        JOIN users u ON u.id = pa.user_id
        WHERE pa.parish_id = $1
        ORDER BY pa.granted_at
        """,
        parish_id,
    )
    return {
        "admins": [
            {
                "user_id": str(r["id"]),
                "username": r["username"],
                "display_name": r["display_name"],
                "avatar_url": _resolve_avatar(r.get("avatar_url")),
                "granted_at": r["granted_at"].isoformat(),
            }
            for r in rows
        ]
    }


@router.post("/{parish_id}/admins", status_code=201)
async def add_parish_admin(
    parish_id: str,
    body: ParishAdminAdd,
    admin: dict = Depends(_require_admin),
    conn=Depends(get_db),
):
    """Grant parish admin to a user."""
    exists = await conn.fetchval("SELECT 1 FROM parishes WHERE id = $1", parish_id)
    if not exists:
        raise HTTPException(status_code=404, detail="Parish not found")

    user_exists = await conn.fetchval("SELECT 1 FROM users WHERE id = $1::uuid", body.user_id)
    if not user_exists:
        raise HTTPException(status_code=404, detail="User not found")

    await conn.execute(
        """
        INSERT INTO parish_admins (parish_id, user_id)
        VALUES ($1, $2::uuid)
        ON CONFLICT DO NOTHING
        """,
        parish_id,
        body.user_id,
    )
    logger.info("Admin %s granted parish-admin for %s to user %s", admin["id"], parish_id, body.user_id)
    return {"status": "ok"}


@router.delete("/{parish_id}/admins/{user_id}", status_code=204)
async def remove_parish_admin(
    parish_id: str,
    user_id: str,
    admin: dict = Depends(_require_admin),
    conn=Depends(get_db),
):
    """Revoke parish admin from a user."""
    result = await conn.execute(
        "DELETE FROM parish_admins WHERE parish_id = $1 AND user_id = $2::uuid",
        parish_id,
        user_id,
    )
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Parish admin entry not found")
    logger.info("Admin %s revoked parish-admin for %s from user %s", admin["id"], parish_id, user_id)
