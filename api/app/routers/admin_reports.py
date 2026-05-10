"""Admin routes for reviewing user-submitted content reports."""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.database import get_db
from app.models.report import ReportDecision
from app.routers.admin import _require_admin

logger = logging.getLogger("nave.admin")

router = APIRouter()


@router.get("/queue")
async def list_reports(
    status: Optional[str] = Query("pending"),
    limit: int = Query(50, le=100),
    admin: dict = Depends(_require_admin),
    conn=Depends(get_db),
):
    """List reported content with snippets and per-item report counts."""
    rows = await conn.fetch(
        """
        SELECT
            ur.id,
            ur.content_type,
            ur.content_id,
            ur.reason,
            ur.notes,
            ur.status,
            ur.created_at,
            u.id         AS reporter_id,
            u.username   AS reporter_username,
            u.display_name AS reporter_display_name,
            CASE
                WHEN ur.content_type = 'post'          THEN LEFT(pp.content, 300)
                WHEN ur.content_type = 'group_message'  THEN LEFT(gm.content, 300)
                WHEN ur.content_type = 'comment'        THEN LEFT(ppc.content, 300)
            END AS content_snippet,
            CASE
                WHEN ur.content_type = 'post'          THEN pp.id IS NOT NULL
                WHEN ur.content_type = 'group_message'  THEN gm.id IS NOT NULL
                WHEN ur.content_type = 'comment'        THEN ppc.id IS NOT NULL
                ELSE FALSE
            END AS content_exists,
            (
                SELECT COUNT(*)
                FROM user_reports ur2
                WHERE ur2.content_type = ur.content_type
                  AND ur2.content_id   = ur.content_id
            ) AS report_count
        FROM user_reports ur
        JOIN users u ON u.id = ur.reporter_id
        LEFT JOIN parish_posts          pp  ON ur.content_type = 'post'          AND pp.id  = ur.content_id
        LEFT JOIN group_messages        gm  ON ur.content_type = 'group_message'  AND gm.id  = ur.content_id
        LEFT JOIN parish_post_comments  ppc ON ur.content_type = 'comment'        AND ppc.id = ur.content_id
        WHERE ($1::text IS NULL OR ur.status = $1)
        ORDER BY
            (SELECT COUNT(*) FROM user_reports ur3
             WHERE ur3.content_type = ur.content_type
               AND ur3.content_id   = ur.content_id) DESC,
            ur.created_at ASC
        LIMIT $2
        """,
        status,
        limit,
    )

    items = [
        {
            "id": str(r["id"]),
            "content_type": r["content_type"],
            "content_id": str(r["content_id"]),
            "reason": r["reason"],
            "notes": r["notes"],
            "status": r["status"],
            "created_at": r["created_at"].isoformat(),
            "reporter": {
                "id": str(r["reporter_id"]),
                "username": r["reporter_username"],
                "display_name": r["reporter_display_name"],
            },
            "content_snippet": r["content_snippet"],
            "content_exists": r["content_exists"],
            "report_count": r["report_count"],
        }
        for r in rows
    ]

    return {"items": items, "count": len(items)}


@router.patch("/queue/{item_id}")
async def review_report(
    item_id: str,
    body: ReportDecision,
    admin: dict = Depends(_require_admin),
    conn=Depends(get_db),
):
    """Mark a report as reviewed or dismissed, optionally removing the content."""
    row = await conn.fetchrow(
        "SELECT id, status, content_type, content_id FROM user_reports WHERE id = $1::uuid",
        item_id,
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Report not found")
    if row["status"] != "pending":
        raise HTTPException(status_code=409, detail="Report has already been reviewed")

    content_removed = False

    async with conn.transaction():
        await conn.execute(
            """
            UPDATE user_reports
            SET status = $1, reviewer_id = $2, reviewed_at = NOW(), reviewer_notes = $3
            WHERE id = $4::uuid
            """,
            body.decision,
            admin["id"],
            body.notes,
            item_id,
        )

        if body.remove_content and body.decision == "reviewed":
            content_type = row["content_type"]
            content_id = row["content_id"]

            if content_type == "post":
                await conn.execute(
                    "UPDATE parish_posts SET status = 'Deleted' WHERE id = $1 AND status != 'Deleted'",
                    content_id,
                )
            elif content_type == "group_message":
                await conn.execute(
                    "DELETE FROM group_messages WHERE id = $1",
                    content_id,
                )
            elif content_type == "comment":
                await conn.execute(
                    "UPDATE parish_post_comments SET status = 'Deleted' WHERE id = $1 AND status != 'Deleted'",
                    content_id,
                )
            content_removed = True

            logger.info(
                "Admin %s removed %s %s via report %s",
                admin["id"], content_type, content_id, item_id,
            )

    logger.info(
        "Admin %s %s report %s", admin["id"], body.decision, item_id,
    )
    return {"status": "ok", "item_id": item_id, "decision": body.decision, "content_removed": content_removed}
