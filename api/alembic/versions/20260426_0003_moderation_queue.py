"""moderation_queue: add moderation queue table

Revision ID: 0009
Revises: 0008
Create Date: 2026-04-26
"""

from alembic import op

revision = '0009'
down_revision = '0008'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS moderation_queue (
            id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            content       TEXT NOT NULL,
            context_type  TEXT NOT NULL,
            content_id    UUID,
            final_action  TEXT NOT NULL,
            layer1_result JSONB,
            layer2_result JSONB,
            status        TEXT NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'approved', 'rejected')),
            reviewer_id   UUID REFERENCES users(id),
            reviewed_at   TIMESTAMPTZ,
            reviewer_notes TEXT,
            created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_mq_status_created
            ON moderation_queue (status, created_at)
            WHERE status = 'pending';
    """)


def downgrade() -> None:
    op.execute("""
        DROP INDEX IF EXISTS idx_mq_status_created;
        DROP TABLE IF EXISTS moderation_queue;
    """)
