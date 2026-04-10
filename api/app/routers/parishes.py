import re

from fastapi import APIRouter, Depends, HTTPException, Query

from app.database import get_db
from app.dependencies import get_current_user
from app.models.parish import ParishResponse, ParishesResponse

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


def _build_parish(row: dict) -> ParishResponse:
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
        cover_photo_url=row.get("cover_photo_url"),
        mass_schedule=row.get("mass_schedule"),
        member_count=row.get("member_count", 0),
        created_at=row["created_at"],
    )


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
    _: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    row = await conn.fetchrow(
        """
        SELECT p.*, COUNT(u.id) AS member_count
        FROM parishes p
        LEFT JOIN users u ON u.parish_id = p.id
        WHERE p.id = $1
        GROUP BY p.id
        """,
        parish_id,
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Parish not found")
    return _build_parish(dict(row))
