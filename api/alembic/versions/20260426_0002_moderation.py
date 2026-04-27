"""moderation: add moderation_status to group_messages

Revision ID: 0008
Revises: 0007
Create Date: 2026-04-26
"""

from alembic import op

revision = '0008'
down_revision = '0007'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE group_messages
            ADD COLUMN IF NOT EXISTS moderation_status TEXT
                CHECK (moderation_status IN ('pending', 'approved', 'rejected'))
                DEFAULT NULL;

        CREATE INDEX IF NOT EXISTS idx_gm_moderation_status
            ON group_messages (moderation_status)
            WHERE moderation_status IS NOT NULL;
    """)


def downgrade() -> None:
    op.execute("""
        DROP INDEX IF EXISTS idx_gm_moderation_status;
        ALTER TABLE group_messages DROP COLUMN IF EXISTS moderation_status;
    """)
