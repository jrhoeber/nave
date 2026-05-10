"""Data retention sweeper.

Run as a Cloud Run Job (`python -m app.retention.sweep`) on a daily
Cloud Scheduler trigger. Each policy is a small function that DELETEs
in bounded batches so transactions stay short and the run is safely
re-entrant if it fails partway through.

Policies:
- moderation_queue:    purge ≥1 year after account_deleted_at
- user_reports:        purge ≥90 days after case closure (reviewed/dismissed)
- notifications:       purge ≥90 days after creation
- user_device_tokens:  purge after 180 days of inactivity
"""
import asyncio
import logging
import time

import asyncpg

from app.config import settings


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("nave.retention")


BATCH_SIZE = 1000
MAX_BATCHES = 10_000


async def _batched_delete(
    conn: asyncpg.Connection,
    table: str,
    where_sql: str,
    *params,
) -> int:
    """Delete rows matching `where_sql` in chunks of BATCH_SIZE.

    Each batch is its own transaction (implicit via single execute) so
    locks are short-lived even when the total deletion is large.
    Returns the total rows deleted.
    """
    total = 0
    sql = (
        f"DELETE FROM {table} WHERE id IN ("
        f"  SELECT id FROM {table} WHERE {where_sql} LIMIT {BATCH_SIZE}"
        f")"
    )
    for _ in range(MAX_BATCHES):
        result = await conn.execute(sql, *params)
        # asyncpg returns "DELETE <n>"
        deleted = int(result.split()[-1])
        total += deleted
        if deleted < BATCH_SIZE:
            break
    else:
        logger.warning(
            "%s: hit MAX_BATCHES (%d) cap; will resume next run",
            table,
            MAX_BATCHES,
        )
    return total


async def sweep_moderation_records(conn: asyncpg.Connection) -> int:
    return await _batched_delete(
        conn,
        "moderation_queue",
        "account_deleted_at IS NOT NULL "
        "AND account_deleted_at < NOW() - INTERVAL '1 year'",
    )


async def sweep_reported_content(conn: asyncpg.Connection) -> int:
    return await _batched_delete(
        conn,
        "user_reports",
        "status IN ('reviewed', 'dismissed') "
        "AND reviewed_at < NOW() - INTERVAL '90 days'",
    )


async def sweep_notifications(conn: asyncpg.Connection) -> int:
    return await _batched_delete(
        conn,
        "notifications",
        "created_at < NOW() - INTERVAL '90 days'",
    )


async def sweep_device_tokens(conn: asyncpg.Connection) -> int:
    return await _batched_delete(
        conn,
        "user_device_tokens",
        "updated_at < NOW() - INTERVAL '180 days'",
    )


SWEEPS = [
    ("moderation_records", sweep_moderation_records),
    ("reported_content", sweep_reported_content),
    ("notifications", sweep_notifications),
    ("device_tokens", sweep_device_tokens),
]


async def run() -> None:
    pool = await asyncpg.create_pool(settings.database_url, min_size=1, max_size=2)
    try:
        async with pool.acquire() as conn:
            for name, fn in SWEEPS:
                start = time.perf_counter()
                try:
                    deleted = await fn(conn)
                except Exception:
                    logger.exception("sweep %s failed", name)
                    continue
                duration_ms = (time.perf_counter() - start) * 1000
                logger.info(
                    "sweep %s: deleted=%d duration_ms=%.1f",
                    name,
                    deleted,
                    duration_ms,
                )
    finally:
        await pool.close()


if __name__ == "__main__":
    asyncio.run(run())
