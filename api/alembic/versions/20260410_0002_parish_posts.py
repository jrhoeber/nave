"""Add parish_posts table

Revision ID: 0007
Revises: 0006
Create Date: 2026-04-10
"""
from typing import Sequence, Union
from alembic import op

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS parish_posts (
            id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            parish_id  UUID NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
            user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            content    TEXT NOT NULL,
            status     TEXT NOT NULL DEFAULT 'Posted'
                           CHECK (status IN ('Pending', 'Posted', 'Deleted', 'Rejected')),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_parish_posts_parish ON parish_posts (parish_id, created_at DESC)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_parish_posts_user ON parish_posts (user_id)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS parish_posts")
