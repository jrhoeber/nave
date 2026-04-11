"""Add image_url to group_messages

Revision ID: 0011
Revises: 0010
Create Date: 2026-04-11
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0011"
down_revision: Union[str, None] = "0010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add image_url column
    op.execute("ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS image_url TEXT")
    # Drop the NOT NULL constraint on content so photo-only messages are allowed
    op.execute("ALTER TABLE group_messages ALTER COLUMN content DROP NOT NULL")
    # Ensure at least one of content or image_url is present
    op.execute(
        "ALTER TABLE group_messages ADD CONSTRAINT group_messages_content_or_image "
        "CHECK (content IS NOT NULL OR image_url IS NOT NULL)"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE group_messages DROP CONSTRAINT IF EXISTS group_messages_content_or_image")
    op.execute("ALTER TABLE group_messages ALTER COLUMN content SET NOT NULL")
    op.execute("ALTER TABLE group_messages DROP COLUMN IF EXISTS image_url")
