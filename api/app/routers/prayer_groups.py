from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.database import get_db
from app.dependencies import get_current_user
from app.models.prayer_group import (
    PrayerGroupCreate,
    PrayerGroupResponse,
    PrayerGroupUpdate,
    PrayerGroupsResponse,
)
from app.models.user import UserResponse
from app.models.post import FeedResponse
from app.utils.notifications import create_notification
from app.routers.feed import _POST_SELECT, _build_post

router = APIRouter()


def _build_admin(row: dict) -> UserResponse:
    return UserResponse(
        id=str(row["admin_id"]),
        username=row["admin_username"],
        display_name=row["admin_display_name"],
        avatar_url=row.get("admin_avatar_url"),
        created_at=row["admin_created_at"],
    )


def _build_group(row: dict) -> PrayerGroupResponse:
    return PrayerGroupResponse(
        id=str(row["id"]),
        name=row["name"],
        description=row["description"],
        category=row["category"],
        avatar_url=row.get("avatar_url"),
        member_count=row.get("member_count", 0) or 0,
        post_count=row.get("post_count", 0) or 0,
        is_private=row["is_private"],
        is_member=bool(row.get("is_member", False)),
        is_pending_approval=bool(row.get("is_pending_approval", False)),
        admin=_build_admin(row),
        parish=row.get("parish"),
        diocese=row.get("diocese"),
        meeting_schedule=row.get("meeting_schedule"),
        created_at=row["created_at"],
    )


_GROUP_SELECT = """
    SELECT
        pg.*,
        u.id AS admin_id, u.username AS admin_username,
        u.display_name AS admin_display_name,
        u.avatar_url AS admin_avatar_url,
        u.created_at AS admin_created_at,
        COUNT(DISTINCT pgm.id) FILTER (WHERE pgm.status = 'member') AS member_count,
        0                                                            AS post_count,
        BOOL_OR(my_mem.status = 'member')                           AS is_member,
        BOOL_OR(my_mem.status = 'pending')                          AS is_pending_approval
    FROM prayer_groups pg
    JOIN users u ON u.id = pg.admin_id
    LEFT JOIN prayer_group_members pgm ON pgm.group_id = pg.id
    LEFT JOIN prayer_group_members my_mem ON my_mem.group_id = pg.id AND my_mem.user_id = $1
"""


@router.get("", response_model=PrayerGroupsResponse)
async def list_groups(
    category: Optional[str] = Query(None),
    limit: int = Query(20, le=100),
    cursor: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    cursor_dt = datetime.fromisoformat(cursor) if cursor else datetime.now(timezone.utc)
    params: list = [current_user["id"], cursor_dt]
    extra_where = "AND (pg.is_private = FALSE OR my_mem.status IS NOT NULL)"

    if category:
        params.append(category)
        extra_where += f" AND pg.category = ${len(params)}"

    params.append(limit)

    rows = await conn.fetch(
        f"""
        {_GROUP_SELECT}
        WHERE pg.created_at < $2
        {extra_where}
        GROUP BY pg.id, u.id
        ORDER BY pg.created_at DESC
        LIMIT ${len(params)}
        """,
        *params,
    )
    groups = [_build_group(dict(r)) for r in rows]
    next_cursor = groups[-1].created_at.isoformat() if len(groups) == limit else None
    return PrayerGroupsResponse(groups=groups, next_cursor=next_cursor)


@router.get("/mine", response_model=dict)
async def my_groups(
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    rows = await conn.fetch(
        f"""
        {_GROUP_SELECT}
        JOIN prayer_group_members mine ON mine.group_id = pg.id AND mine.user_id = $1 AND mine.status = 'member'
        GROUP BY pg.id, u.id
        ORDER BY pg.name
        """,
        current_user["id"],
    )
    return {"groups": [_build_group(dict(r)) for r in rows]}


@router.post("", response_model=PrayerGroupResponse, status_code=201)
async def create_group(
    body: PrayerGroupCreate,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    async with conn.transaction():
        group_row = await conn.fetchrow(
            """
            INSERT INTO prayer_groups
                (name, description, category, is_private, admin_id, parish, diocese, meeting_schedule, avatar_url)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            RETURNING *
            """,
            body.name,
            body.description,
            body.category,
            body.is_private,
            current_user["id"],
            body.parish,
            body.diocese,
            body.meeting_schedule,
            body.avatar_url,
        )
        await conn.execute(
            "INSERT INTO prayer_group_members (group_id, user_id, status) VALUES ($1, $2, 'member')",
            group_row["id"],
            current_user["id"],
        )

    row = await conn.fetchrow(
        f"{_GROUP_SELECT} WHERE pg.id = $2 GROUP BY pg.id, u.id",
        current_user["id"],
        group_row["id"],
    )
    return _build_group(dict(row))


@router.get("/{group_id}", response_model=PrayerGroupResponse)
async def get_group(
    group_id: str,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    row = await conn.fetchrow(
        f"{_GROUP_SELECT} WHERE pg.id = $2 GROUP BY pg.id, u.id",
        current_user["id"],
        group_id,
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Prayer group not found")
    return _build_group(dict(row))


@router.patch("/{group_id}", response_model=PrayerGroupResponse)
async def update_group(
    group_id: str,
    body: PrayerGroupUpdate,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    pg = await conn.fetchrow("SELECT admin_id FROM prayer_groups WHERE id = $1", group_id)
    if pg is None:
        raise HTTPException(status_code=404, detail="Prayer group not found")
    if str(pg["admin_id"]) != str(current_user["id"]):
        raise HTTPException(status_code=403, detail="Only the group admin can update this group")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if updates:
        set_clauses = ", ".join(f"{col} = ${i+2}" for i, col in enumerate(updates.keys()))
        set_clauses += ", updated_at = NOW()"
        await conn.execute(
            f"UPDATE prayer_groups SET {set_clauses} WHERE id = $1",
            group_id,
            *updates.values(),
        )

    row = await conn.fetchrow(
        f"{_GROUP_SELECT} WHERE pg.id = $2 GROUP BY pg.id, u.id",
        current_user["id"],
        group_id,
    )
    return _build_group(dict(row))


@router.post("/{group_id}/join", response_model=dict)
async def join_group(
    group_id: str,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    pg = await conn.fetchrow("SELECT is_private, admin_id FROM prayer_groups WHERE id = $1", group_id)
    if pg is None:
        raise HTTPException(status_code=404, detail="Prayer group not found")

    existing = await conn.fetchrow(
        "SELECT status FROM prayer_group_members WHERE group_id = $1 AND user_id = $2",
        group_id,
        current_user["id"],
    )
    if existing:
        raise HTTPException(status_code=409, detail=f"Already {existing['status']}")

    new_status = "pending" if pg["is_private"] else "member"
    async with conn.transaction():
        await conn.execute(
            "INSERT INTO prayer_group_members (group_id, user_id, status) VALUES ($1,$2,$3)",
            group_id,
            current_user["id"],
            new_status,
        )
        if pg["is_private"]:
            await create_notification(
                conn,
                user_id=str(pg["admin_id"]),
                actor_id=str(current_user["id"]),
                type="prayer_group_invite",
                message=f"{current_user['display_name']} requested to join your prayer group",
                target_id=group_id,
            )
    return {"status": new_status}


@router.delete("/{group_id}/leave", response_model=dict)
async def leave_group(
    group_id: str,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    pg = await conn.fetchrow("SELECT admin_id FROM prayer_groups WHERE id = $1", group_id)
    if pg is None:
        raise HTTPException(status_code=404, detail="Prayer group not found")
    if str(pg["admin_id"]) == str(current_user["id"]):
        raise HTTPException(status_code=400, detail="Admin cannot leave. Transfer admin role first.")

    result = await conn.execute(
        "DELETE FROM prayer_group_members WHERE group_id = $1 AND user_id = $2",
        group_id,
        current_user["id"],
    )
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="You are not a member of this group")
    return {"success": True}


@router.post("/{group_id}/members/{user_id}/approve", response_model=dict)
async def approve_member(
    group_id: str,
    user_id: str,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    pg = await conn.fetchrow("SELECT admin_id, name FROM prayer_groups WHERE id = $1", group_id)
    if pg is None:
        raise HTTPException(status_code=404, detail="Prayer group not found")
    if str(pg["admin_id"]) != str(current_user["id"]):
        raise HTTPException(status_code=403, detail="Only the admin can approve members")

    result = await conn.execute(
        "UPDATE prayer_group_members SET status = 'member' WHERE group_id = $1 AND user_id = $2 AND status = 'pending'",
        group_id,
        user_id,
    )
    if result == "UPDATE 0":
        raise HTTPException(status_code=404, detail="Pending membership not found")

    await create_notification(
        conn,
        user_id=user_id,
        actor_id=str(current_user["id"]),
        type="prayer_group_invite",
        message=f"Your request to join {pg['name']} was approved",
        target_id=group_id,
    )
    return {"status": "member"}


@router.delete("/{group_id}/members/{user_id}", response_model=dict)
async def remove_member(
    group_id: str,
    user_id: str,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    pg = await conn.fetchrow("SELECT admin_id FROM prayer_groups WHERE id = $1", group_id)
    if pg is None:
        raise HTTPException(status_code=404, detail="Prayer group not found")
    if str(pg["admin_id"]) != str(current_user["id"]) and str(current_user["id"]) != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    await conn.execute(
        "DELETE FROM prayer_group_members WHERE group_id = $1 AND user_id = $2",
        group_id,
        user_id,
    )
    return {"success": True}


@router.get("/{group_id}/posts", response_model=FeedResponse)
async def group_posts(
    group_id: str,
    limit: int = Query(20, le=100),
    cursor: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    pg = await conn.fetchrow("SELECT is_private FROM prayer_groups WHERE id = $1", group_id)
    if pg is None:
        raise HTTPException(status_code=404, detail="Prayer group not found")

    if pg["is_private"]:
        membership = await conn.fetchrow(
            "SELECT id FROM prayer_group_members WHERE group_id = $1 AND user_id = $2 AND status = 'member'",
            group_id,
            current_user["id"],
        )
        if membership is None:
            raise HTTPException(status_code=403, detail="This is a private group")

    cursor_dt = datetime.fromisoformat(cursor) if cursor else datetime.now(timezone.utc)
    rows = await conn.fetch(
        f"""
        {_POST_SELECT}
        WHERE p.author_id IN (
            SELECT user_id FROM prayer_group_members
            WHERE group_id = $2 AND status = 'member'
        )
        AND p.created_at < $3
        GROUP BY p.id, u.id, par.id
        ORDER BY p.created_at DESC
        LIMIT $4
        """,
        current_user["id"],
        group_id,
        cursor_dt,
        limit,
    )
    posts = [_build_post(dict(r)) for r in rows]
    next_cursor = posts[-1].created_at.isoformat() if len(posts) == limit else None
    return FeedResponse(posts=posts, next_cursor=next_cursor)
