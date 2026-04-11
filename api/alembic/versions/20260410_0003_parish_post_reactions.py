"""Add parish_post_reactions table

Revision ID: 0008
Revises: 0007
Create Date: 2026-04-10
"""
from typing import Sequence, Union
from alembic import op

revision: str = "0008"
down_revision: Union[str, None] = "0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS parish_post_reactions (
            post_id    UUID NOT NULL REFERENCES parish_posts(id) ON DELETE CASCADE,
            user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            reaction   TEXT NOT NULL CHECK (reaction IN ('👍', '🙏', '❤️')),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (post_id, user_id, reaction)
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_parish_post_reactions_post ON parish_post_reactions (post_id)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS parish_post_reactions")
