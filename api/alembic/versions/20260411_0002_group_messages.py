"""Add group_messages and group_message_reactions tables

Revision ID: 0010
Revises: 0009
Create Date: 2026-04-11
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0010"
down_revision: Union[str, None] = "0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS group_messages (
            id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            group_id   UUID NOT NULL REFERENCES prayer_groups(id) ON DELETE CASCADE,
            user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            content    TEXT NOT NULL CHECK (char_length(content) <= 2000),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_gm_group_created ON group_messages (group_id, created_at DESC)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_gm_user ON group_messages (user_id)")
    op.execute("""
        CREATE TABLE IF NOT EXISTS group_message_reactions (
            message_id UUID NOT NULL REFERENCES group_messages(id) ON DELETE CASCADE,
            user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            emoji      VARCHAR(10) NOT NULL
                           CHECK (emoji IN ('👍', '🙏', '❤️', '😂', '😮', '🥲')),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (message_id, user_id, emoji)
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_gmr_message ON group_message_reactions (message_id)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS group_message_reactions")
    op.execute("DROP TABLE IF EXISTS group_messages")
