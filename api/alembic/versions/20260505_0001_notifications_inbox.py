"""Notifications inbox table for type-agnostic unread/badge tracking

Revision ID: 0019
Revises: 0018
Create Date: 2026-05-05
"""

from alembic import op


revision = '0019'
down_revision = '0018'


def upgrade():
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS notifications (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            type        TEXT NOT NULL,
            entity_id   UUID NULL,
            actor_id    UUID NULL REFERENCES users(id) ON DELETE SET NULL,
            payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
            dedup_key   TEXT NULL,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            read_at     TIMESTAMPTZ NULL
        )
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS notifications_user_unread "
        "ON notifications (user_id, created_at DESC) WHERE read_at IS NULL"
    )
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS notifications_unread_dedup "
        "ON notifications (user_id, dedup_key) "
        "WHERE read_at IS NULL AND dedup_key IS NOT NULL"
    )


def downgrade():
    op.execute("DROP TABLE IF EXISTS notifications")
