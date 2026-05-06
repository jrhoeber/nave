from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.utils.storage import _ALLOWED_CONTENT_TYPES, _MAX_AVATAR_BYTES, delete_object, get_avatar_signed_url, get_signed_url, upload_group_avatar
from app.models.prayer_group import (
    PrayerGroupCreate,
    PrayerGroupResponse,
    PrayerGroupUpdate,
    PrayerGroupsResponse,
)
from app.models.user import UserResponse

router = APIRouter()

_GCS_PATH_PREFIX = "avatars/"


def _resolve_avatar(raw: str | None) -> str | None:
    if raw and raw.startswith(_GCS_PATH_PREFIX):
        return get_avatar_signed_url(raw)
    return raw


def _build_admin(row: dict) -> UserResponse:
    return UserResponse(
        id=str(row["admin_id"]),
        username=row["admin_username"],
        display_name=row["admin_display_name"],
        avatar_url=_resolve_avatar(row.get("admin_avatar_url")),
        created_at=row["admin_created_at"],
    )


def _resolve_group_avatar(raw: str | None) -> str | None:
    if raw and raw.startswith("group-avatars/"):
        return get_signed_url(raw)
    return raw or None


def _build_group(row: dict) -> PrayerGroupResponse:
    return PrayerGroupResponse(
        id=str(row["id"]),
        name=row["name"],
        description=row["description"],
        category=row["category"],
        avatar_url=_resolve_group_avatar(row.get("avatar_url")),
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
    parish_name: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
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

    if parish_name:
        params.append(parish_name)
        extra_where += f" AND pg.parish ILIKE ${len(params)}"

    if search:
        params.append(f"%{search}%")
        extra_where += f" AND pg.name ILIKE ${len(params)}"

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


@router.get("/invitations", response_model=dict)
async def list_my_invitations(
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    rows = await conn.fetch(
        """
        SELECT
            gi.id AS invitation_id,
            gi.created_at AS invited_at,
            pg.id, pg.name, pg.description, pg.category, pg.avatar_url,
            pg.is_private, pg.created_at,
            pg.parish, pg.diocese, pg.meeting_schedule,
            u.id AS admin_id, u.username AS admin_username,
            u.display_name AS admin_display_name,
            u.avatar_url AS admin_avatar_url,
            u.created_at AS admin_created_at,
            inv.id AS inviter_id,
            inv.display_name AS inviter_display_name,
            inv.avatar_url AS inviter_avatar_url,
            COUNT(DISTINCT pgm.id) FILTER (WHERE pgm.status = 'member') AS member_count
        FROM group_invitations gi
        JOIN prayer_groups pg ON pg.id = gi.group_id
        JOIN users u ON u.id = pg.admin_id
        JOIN users inv ON inv.id = gi.invited_by
        LEFT JOIN prayer_group_members pgm ON pgm.group_id = pg.id
        WHERE gi.user_id = $1 AND gi.status = 'pending'
        GROUP BY gi.id, pg.id, u.id, inv.id
        ORDER BY gi.created_at DESC
        """,
        current_user["id"],
    )
    invitations = []
    for r in rows:
        invitations.append({
            "id": str(r["invitation_id"]),
            "group": {
                "id": str(r["id"]),
                "name": r["name"],
                "description": r["description"],
                "category": r["category"],
                "avatar_url": _resolve_group_avatar(r.get("avatar_url")),
                "member_count": r.get("member_count", 0) or 0,
                "is_private": r["is_private"],
                "admin": {
                    "id": str(r["admin_id"]),
                    "username": r["admin_username"],
                    "display_name": r["admin_display_name"],
                    "avatar_url": _resolve_avatar(r.get("admin_avatar_url")),
                    "created_at": r["admin_created_at"].isoformat(),
                },
                "parish": r.get("parish"),
                "diocese": r.get("diocese"),
                "meeting_schedule": r.get("meeting_schedule"),
                "created_at": r["created_at"].isoformat(),
            },
            "invited_by": {
                "id": str(r["inviter_id"]),
                "display_name": r["inviter_display_name"],
                "avatar_url": _resolve_avatar(r.get("inviter_avatar_url")),
            },
            "invited_at": r["invited_at"].isoformat(),
        })
    return {"invitations": invitations}


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
    await conn.execute(
        "INSERT INTO prayer_group_members (group_id, user_id, status) VALUES ($1,$2,$3)",
        group_id,
        current_user["id"],
        new_status,
    )
    return {"status": new_status}


@router.delete("/{group_id}", response_model=dict)
async def delete_group(
    group_id: str,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    pg = await conn.fetchrow("SELECT admin_id FROM prayer_groups WHERE id = $1", group_id)
    if pg is None:
        raise HTTPException(status_code=404, detail="Prayer group not found")
    if str(pg["admin_id"]) != str(current_user["id"]):
        raise HTTPException(status_code=403, detail="Only the group admin can delete this group")
    await conn.execute("DELETE FROM prayer_groups WHERE id = $1", group_id)
    return {"success": True}


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


@router.get("/{group_id}/members", response_model=dict)
async def list_group_members(
    group_id: str,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    pg = await conn.fetchrow("SELECT id FROM prayer_groups WHERE id = $1", group_id)
    if pg is None:
        raise HTTPException(status_code=404, detail="Prayer group not found")
    rows = await conn.fetch(
        """
        SELECT u.id, u.username, u.display_name, u.avatar_url, u.created_at,
               pgm.status, pgm.joined_at
        FROM prayer_group_members pgm
        JOIN users u ON u.id = pgm.user_id
        WHERE pgm.group_id = $1 AND pgm.status = 'member'
        ORDER BY pgm.joined_at ASC
        """,
        group_id,
    )
    members = [
        {
            "id": str(r["id"]),
            "username": r["username"],
            "display_name": r["display_name"],
            "avatar_url": _resolve_avatar(r.get("avatar_url")),
            "joined_at": r["joined_at"].isoformat(),
        }
        for r in rows
    ]
    return {"members": members}


@router.get("/{group_id}/members/pending", response_model=dict)
async def list_pending_members(
    group_id: str,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    pg = await conn.fetchrow("SELECT admin_id FROM prayer_groups WHERE id = $1", group_id)
    if pg is None:
        raise HTTPException(status_code=404, detail="Prayer group not found")
    if str(pg["admin_id"]) != str(current_user["id"]):
        raise HTTPException(status_code=403, detail="Only the group admin can view pending requests")
    rows = await conn.fetch(
        """
        SELECT u.id, u.username, u.display_name, u.avatar_url, pgm.joined_at
        FROM prayer_group_members pgm
        JOIN users u ON u.id = pgm.user_id
        WHERE pgm.group_id = $1 AND pgm.status = 'pending'
        ORDER BY pgm.joined_at ASC
        """,
        group_id,
    )
    members = [
        {
            "id": str(r["id"]),
            "username": r["username"],
            "display_name": r["display_name"],
            "avatar_url": _resolve_avatar(r.get("avatar_url")),
            "requested_at": r["joined_at"].isoformat(),
        }
        for r in rows
    ]
    return {"members": members}


@router.get("/{group_id}/invitations/pending", response_model=dict)
async def list_pending_invitations(
    group_id: str,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    pg = await conn.fetchrow("SELECT admin_id FROM prayer_groups WHERE id = $1", group_id)
    if pg is None:
        raise HTTPException(status_code=404, detail="Prayer group not found")
    if str(pg["admin_id"]) != str(current_user["id"]):
        raise HTTPException(status_code=403, detail="Only the group admin can view pending invitations")
    rows = await conn.fetch(
        """
        SELECT gi.id AS invitation_id, u.id, u.username, u.display_name, u.avatar_url,
               inv.display_name AS inviter_display_name, gi.created_at
        FROM group_invitations gi
        JOIN users u ON u.id = gi.user_id
        JOIN users inv ON inv.id = gi.invited_by
        WHERE gi.group_id = $1 AND gi.status = 'awaiting_approval'
        ORDER BY gi.created_at ASC
        """,
        group_id,
    )
    invitations = [
        {
            "invitation_id": str(r["invitation_id"]),
            "id": str(r["id"]),
            "username": r["username"],
            "display_name": r["display_name"],
            "avatar_url": _resolve_avatar(r.get("avatar_url")),
            "inviter_display_name": r["inviter_display_name"],
            "requested_at": r["created_at"].isoformat(),
        }
        for r in rows
    ]
    return {"invitations": invitations}


@router.post("/{group_id}/invitations/{user_id}/approve", response_model=dict)
async def approve_invitation(
    group_id: str,
    user_id: str,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    pg = await conn.fetchrow("SELECT admin_id, name FROM prayer_groups WHERE id = $1", group_id)
    if pg is None:
        raise HTTPException(status_code=404, detail="Prayer group not found")
    if str(pg["admin_id"]) != str(current_user["id"]):
        raise HTTPException(status_code=403, detail="Only the admin can approve invitations")

    result = await conn.execute(
        "UPDATE group_invitations SET status = 'pending' WHERE group_id = $1 AND user_id = $2 AND status = 'awaiting_approval'",
        group_id,
        user_id,
    )
    if result == "UPDATE 0":
        raise HTTPException(status_code=404, detail="Pending invitation not found")

    # Notify the invitee that their invitation is ready to accept
    from app.utils.inbox import enqueue
    await enqueue(
        conn,
        user_ids=[user_id],
        type_="group_invite",
        entity_id=group_id,
        actor_id=current_user["id"],
        dedup_key=f"group_invite:{group_id}",
        payload={"group_name": pg["name"]},
        title="Group Invitation",
        body=f"You've been invited to join {pg['name']}",
        push_data={"type": "group_invite", "groupId": group_id, "groupName": pg["name"]},
    )

    return {"status": "pending"}


@router.post("/{group_id}/invitations/{user_id}/decline-approval", response_model=dict)
async def decline_invitation_approval(
    group_id: str,
    user_id: str,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    pg = await conn.fetchrow("SELECT admin_id FROM prayer_groups WHERE id = $1", group_id)
    if pg is None:
        raise HTTPException(status_code=404, detail="Prayer group not found")
    if str(pg["admin_id"]) != str(current_user["id"]):
        raise HTTPException(status_code=403, detail="Only the admin can decline invitations")

    result = await conn.execute(
        "DELETE FROM group_invitations WHERE group_id = $1 AND user_id = $2 AND status = 'awaiting_approval'",
        group_id,
        user_id,
    )
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Pending invitation not found")
    return {"success": True}


@router.post("/{group_id}/members/{user_id}", response_model=dict)
async def invite_member(
    group_id: str,
    user_id: str,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    pg = await conn.fetchrow("SELECT admin_id, is_private, name FROM prayer_groups WHERE id = $1", group_id)
    if pg is None:
        raise HTTPException(status_code=404, detail="Prayer group not found")

    # Caller must be a member of the group
    caller_mem = await conn.fetchrow(
        "SELECT status FROM prayer_group_members WHERE group_id = $1 AND user_id = $2 AND status = 'member'",
        group_id,
        current_user["id"],
    )
    if not caller_mem:
        raise HTTPException(status_code=403, detail="You must be a member to invite others")

    # Check user isn't already a member
    existing_member = await conn.fetchrow(
        "SELECT status FROM prayer_group_members WHERE group_id = $1 AND user_id = $2",
        group_id,
        user_id,
    )
    if existing_member:
        raise HTTPException(status_code=409, detail=f"Already {existing_member['status']}")

    # Check user isn't already invited
    existing_invite = await conn.fetchrow(
        "SELECT status FROM group_invitations WHERE group_id = $1 AND user_id = $2 AND status IN ('pending', 'awaiting_approval')",
        group_id,
        user_id,
    )
    if existing_invite:
        raise HTTPException(status_code=409, detail="Already invited")

    is_admin = str(pg["admin_id"]) == str(current_user["id"])
    needs_approval = pg["is_private"] and not is_admin
    invite_status = "awaiting_approval" if needs_approval else "pending"

    await conn.execute(
        "INSERT INTO group_invitations (group_id, user_id, invited_by, status) VALUES ($1, $2, $3, $4)",
        group_id,
        user_id,
        current_user["id"],
        invite_status,
    )

    from app.utils.inbox import enqueue
    if needs_approval:
        inviter_row = await conn.fetchrow("SELECT display_name FROM users WHERE id = $1", current_user["id"])
        invitee_row = await conn.fetchrow("SELECT display_name FROM users WHERE id = $1", user_id)
        if inviter_row and invitee_row:
            await enqueue(
                conn,
                user_ids=[str(pg["admin_id"])],
                type_="group_approval_needed",
                entity_id=group_id,
                actor_id=current_user["id"],
                dedup_key=f"group_approval:{group_id}:{user_id}",
                payload={
                    "group_name": pg["name"],
                    "inviter_name": inviter_row["display_name"],
                    "invitee_name": invitee_row["display_name"],
                    "invitee_id": user_id,
                },
                title="Invite Approval Needed",
                body=f"{inviter_row['display_name']} wants to invite {invitee_row['display_name']} to {pg['name']}",
                push_data={"type": "group_approval_needed", "groupId": group_id, "groupName": pg["name"]},
            )
    else:
        await enqueue(
            conn,
            user_ids=[user_id],
            type_="group_invite",
            entity_id=group_id,
            actor_id=current_user["id"],
            dedup_key=f"group_invite:{group_id}",
            payload={"group_name": pg["name"]},
            title="Group Invitation",
            body=f"You've been invited to join {pg['name']}",
            push_data={"type": "group_invite", "groupId": group_id, "groupName": pg["name"]},
        )

    return {"status": "invited"}


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

    from app.utils.inbox import enqueue
    await enqueue(
        conn,
        user_ids=[user_id],
        type_="group_approved",
        entity_id=group_id,
        actor_id=current_user["id"],
        dedup_key=f"group_approved:{group_id}",
        payload={"group_name": pg["name"]},
        title="Welcome to the group!",
        body=f"You've been approved to join {pg['name']}",
        push_data={"type": "group_approved", "groupId": group_id, "groupName": pg["name"]},
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


@router.post("/{group_id}/invitations/accept", response_model=dict)
async def accept_invitation(
    group_id: str,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    invitation = await conn.fetchrow(
        "SELECT id FROM group_invitations WHERE group_id = $1 AND user_id = $2 AND status = 'pending'",
        group_id,
        current_user["id"],
    )
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")

    async with conn.transaction():
        await conn.execute(
            "INSERT INTO prayer_group_members (group_id, user_id, status) VALUES ($1, $2, 'member') ON CONFLICT (group_id, user_id) DO NOTHING",
            group_id,
            current_user["id"],
        )
        await conn.execute(
            "UPDATE group_invitations SET status = 'accepted' WHERE id = $1",
            invitation["id"],
        )

    return {"status": "member"}


@router.post("/{group_id}/invitations/decline", response_model=dict)
async def decline_invitation(
    group_id: str,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    result = await conn.execute(
        "DELETE FROM group_invitations WHERE group_id = $1 AND user_id = $2 AND status = 'pending'",
        group_id,
        current_user["id"],
    )
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Invitation not found")
    return {"success": True}


@router.post("/{group_id}/avatar", response_model=PrayerGroupResponse)
async def upload_group_avatar_endpoint(
    group_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    pg = await conn.fetchrow("SELECT admin_id FROM prayer_groups WHERE id = $1", group_id)
    if pg is None:
        raise HTTPException(status_code=404, detail="Prayer group not found")
    if str(pg["admin_id"]) != str(current_user["id"]):
        raise HTTPException(status_code=403, detail="Only the group admin can upload an avatar")
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
                               context_type="image_group_avatar")

    previous_row = await conn.fetchrow(
        "SELECT avatar_url FROM prayer_groups WHERE id = $1",
        group_id,
    )
    previous_object = previous_row["avatar_url"] if previous_row else None

    object_name = upload_group_avatar(file_bytes, group_id, content_type)

    if not get_signed_url(object_name):
        # Don't persist if we can't generate a signed URL — clients have no way to fetch the image.
        raise HTTPException(status_code=500, detail="Failed to generate signed URL for group avatar")

    await conn.execute(
        "UPDATE prayer_groups SET avatar_url = $1, updated_at = NOW() WHERE id = $2",
        object_name,
        group_id,
    )

    delete_object(previous_object)
    row = await conn.fetchrow(
        f"{_GROUP_SELECT} WHERE pg.id = $2 GROUP BY pg.id, u.id",
        current_user["id"],
        group_id,
    )
    return _build_group(dict(row))


@router.delete("/{group_id}/avatar", response_model=PrayerGroupResponse)
async def remove_group_avatar(
    group_id: str,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    pg = await conn.fetchrow("SELECT admin_id FROM prayer_groups WHERE id = $1", group_id)
    if pg is None:
        raise HTTPException(status_code=404, detail="Prayer group not found")
    if str(pg["admin_id"]) != str(current_user["id"]):
        raise HTTPException(status_code=403, detail="Only the group admin can remove the avatar")

    previous_row = await conn.fetchrow(
        "SELECT avatar_url FROM prayer_groups WHERE id = $1",
        group_id,
    )
    previous_object = previous_row["avatar_url"] if previous_row else None

    await conn.execute(
        "UPDATE prayer_groups SET avatar_url = NULL, updated_at = NOW() WHERE id = $1",
        group_id,
    )

    delete_object(previous_object)
    row = await conn.fetchrow(
        f"{_GROUP_SELECT} WHERE pg.id = $2 GROUP BY pg.id, u.id",
        current_user["id"],
        group_id,
    )
    return _build_group(dict(row))
