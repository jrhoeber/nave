"""posts: replace prayer_group_id with parish_id

Revision ID: 0005
Revises: 0004
Create Date: 2025-04-05
"""
from typing import Sequence, Union
from alembic import op

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE posts ADD COLUMN IF NOT EXISTS parish_id UUID REFERENCES parishes(id) ON DELETE SET NULL"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_posts_parish ON posts (parish_id)"
    )
    op.execute("ALTER TABLE posts DROP COLUMN IF EXISTS prayer_group_id")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_posts_parish")
    op.execute("ALTER TABLE posts DROP COLUMN IF EXISTS parish_id")
    op.execute(
        "ALTER TABLE posts ADD COLUMN IF NOT EXISTS prayer_group_id UUID REFERENCES prayer_groups(id) ON DELETE SET NULL"
    )
