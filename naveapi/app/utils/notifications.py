import asyncpg


async def create_notification(
    conn: asyncpg.Connection,
    *,
    user_id: str,
    actor_id: str,
    type: str,
    message: str,
    target_id: str | None = None,
) -> None:
    """Insert a notification row. No-op if user_id == actor_id."""
    if user_id == actor_id:
        return
    await conn.execute(
        """
        INSERT INTO notifications (user_id, actor_id, type, message, target_id)
        VALUES ($1, $2, $3, $4, $5)
        """,
        user_id,
        actor_id,
        type,
        message,
        target_id,
    )


async def create_group_notifications(
    conn: asyncpg.Connection,
    *,
    group_id: str,
    actor_id: str,
    type: str,
    message: str,
    target_id: str | None = None,
) -> None:
    """Insert a notification for every member of a prayer group (excluding the actor)."""
    await conn.execute(
        """
        INSERT INTO notifications (user_id, actor_id, type, message, target_id)
        SELECT user_id, $1, $2, $3, $4
        FROM prayer_group_members
        WHERE group_id = $5
          AND user_id <> $1
          AND status = 'member'
        """,
        actor_id,
        type,
        message,
        target_id,
        group_id,
    )
