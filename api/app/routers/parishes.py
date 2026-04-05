from fastapi import APIRouter, Depends, HTTPException, Query

from app.database import get_db
from app.dependencies import get_current_user
from app.models.parish import ParishResponse, ParishesResponse

router = APIRouter()


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
        member_count=row.get("member_count", 0),
        created_at=row["created_at"],
    )


@router.get("/search", response_model=ParishesResponse)
async def search_parishes(
    q: str = Query("", description="Search by name"),
    state: str = Query("", description="Filter by state abbreviation"),
    limit: int = Query(20, le=100),
    _: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    conditions = ["1=1"]
    params: list = []
    idx = 1

    if q:
        conditions.append(f"to_tsvector('english', p.name) @@ plainto_tsquery('english', ${idx})")
        params.append(q)
        idx += 1

    if state:
        conditions.append(f"p.state = ${idx}")
        params.append(state.upper())
        idx += 1

    params.append(limit)
    where = " AND ".join(conditions)

    rows = await conn.fetch(
        f"""
        SELECT p.*,
               COUNT(u.id) AS member_count
        FROM parishes p
        LEFT JOIN users u ON u.parish_id = p.id
        WHERE {where}
        GROUP BY p.id
        ORDER BY p.name
        LIMIT ${idx}
        """,
        *params,
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
