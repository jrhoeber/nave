"""initial schema

Revision ID: 0001
Revises:
Create Date: 2025-04-04

NOTE: If your database already has the schema applied (created via schema.sql),
do NOT run this migration. Instead, stamp the database at this revision:

    alembic stamp 0001

This tells Alembic the schema is in place without re-running DDL.
Only run `alembic upgrade head` on a fresh database.
"""
from typing import Sequence, Union
from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Users ────────────────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            username      TEXT NOT NULL UNIQUE,
            display_name  TEXT NOT NULL,
            email         TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            bio           TEXT,
            avatar_url    TEXT,
            parish        TEXT,
            diocese       TEXT,
            location      TEXT,
            created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_users_username ON users (username)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_users_email    ON users (email)")

    # ── Parishes ─────────────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS parishes (
            id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name       TEXT NOT NULL,
            city       TEXT NOT NULL,
            state      TEXT NOT NULL,
            diocese    TEXT NOT NULL,
            avatar_url TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_parishes_name    ON parishes USING GIN (to_tsvector('english', name))")
    op.execute("CREATE INDEX IF NOT EXISTS idx_parishes_state   ON parishes (state)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_parishes_diocese ON parishes (diocese)")

    # ── Prayer Groups ─────────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS prayer_groups (
            id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name             TEXT NOT NULL,
            description      TEXT NOT NULL,
            category         TEXT NOT NULL
                                 CHECK (category IN (
                                     'rosary', 'scripture_study', 'mens_group',
                                     'womens_group', 'youth', 'young_adults',
                                     'families', 'devotional', 'general'
                                 )),
            avatar_url       TEXT,
            is_private       BOOLEAN NOT NULL DEFAULT FALSE,
            admin_id         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
            parish           TEXT,
            diocese          TEXT,
            meeting_schedule TEXT,
            created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_prayer_groups_admin    ON prayer_groups (admin_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_prayer_groups_category ON prayer_groups (category)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_prayer_groups_name     ON prayer_groups USING GIN (to_tsvector('english', name))")

    # ── Prayer Group Members ──────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS prayer_group_members (
            id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            group_id   UUID NOT NULL REFERENCES prayer_groups(id) ON DELETE CASCADE,
            user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            status     TEXT NOT NULL DEFAULT 'member'
                           CHECK (status IN ('pending', 'member')),
            joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (group_id, user_id)
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_pgm_group ON prayer_group_members (group_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_pgm_user  ON prayer_group_members (user_id)")

    # ── User Stats View ───────────────────────────────────────────────────────
    op.execute("""
        CREATE OR REPLACE VIEW user_stats AS
        SELECT
            u.id,
            COUNT(DISTINCT CASE WHEN pgm.status = 'member' THEN pgm.group_id END) AS prayer_group_count
        FROM users u
        LEFT JOIN prayer_group_members pgm ON pgm.user_id = u.id
        GROUP BY u.id
    """)


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS user_stats")
    op.execute("DROP TABLE IF EXISTS prayer_group_members")
    op.execute("DROP TABLE IF EXISTS prayer_groups")
    op.execute("DROP TABLE IF EXISTS parishes")
    op.execute("DROP TABLE IF EXISTS users")
