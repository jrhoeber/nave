"""User-facing route for reporting content."""
import logging

import asyncpg
from fastapi import APIRouter, Depends, HTTPException
from starlette.responses import JSONResponse

from app.database import get_db
from app.dependencies import get_current_user
from app.models.report import ReportCreate

logger = logging.getLogger("nave.reports")

router = APIRouter()

# Maps content_type → (table, id column, author column)
_CONTENT_TABLES = {
    "post": ("parish_posts", "id", "user_id"),
    "group_message": ("group_messages", "id", "user_id"),
}


@router.post("")
async def create_report(
    body: ReportCreate,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    """Submit a report against a post or group message."""
    table, id_col, author_col = _CONTENT_TABLES[body.content_type]

    # Verify content exists and get author
    row = await conn.fetchrow(
        f"SELECT {author_col} AS author_id FROM {table} WHERE {id_col} = $1::uuid",
        body.content_id,
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Content not found")

    if row["author_id"] == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot report your own content")

    try:
        report_id = await conn.fetchval(
            """
            INSERT INTO user_reports (reporter_id, content_type, content_id, reason, notes)
            VALUES ($1, $2, $3::uuid, $4, $5)
            RETURNING id
            """,
            current_user["id"],
            body.content_type,
            body.content_id,
            body.reason,
            body.notes,
        )
    except asyncpg.UniqueViolationError:
        raise HTTPException(status_code=409, detail="You have already reported this content")

    logger.info(
        "User %s reported %s %s (reason=%s)",
        current_user["id"], body.content_type, body.content_id, body.reason,
    )
    return JSONResponse(status_code=201, content={"id": str(report_id)})
