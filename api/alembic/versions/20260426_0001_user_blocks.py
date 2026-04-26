"""user_blocks: add block relationships

Revision ID: 0007
Revises: 0006
Create Date: 2026-04-26
"""

from alembic import op

revision = '0007'
down_revision = '0006'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS user_blocks (
            blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (blocker_id, blocked_id),
            CHECK (blocker_id != blocked_id)
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks (blocker_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks (blocked_id)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS user_blocks")
