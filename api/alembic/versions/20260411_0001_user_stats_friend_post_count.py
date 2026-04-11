"""Add friend_count and post_count to user_stats view

Revision ID: 0009
Revises: 0008
Create Date: 2026-04-11
"""
from typing import Sequence, Union
from alembic import op

revision: str = "0009"
down_revision: Union[str, None] = "0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE OR REPLACE VIEW user_stats AS
        SELECT
            u.id,
            COUNT(DISTINCT CASE WHEN pgm.status = 'member' THEN pgm.group_id END) AS prayer_group_count,
            0::bigint AS friend_count,
            0::bigint AS post_count
        FROM users u
        LEFT JOIN prayer_group_members pgm ON pgm.user_id = u.id
        GROUP BY u.id
    """)


def downgrade() -> None:
    op.execute("""
        CREATE OR REPLACE VIEW user_stats AS
        SELECT
            u.id,
            COUNT(DISTINCT CASE WHEN pgm.status = 'member' THEN pgm.group_id END) AS prayer_group_count
        FROM users u
        LEFT JOIN prayer_group_members pgm ON pgm.user_id = u.id
        GROUP BY u.id
    """)
