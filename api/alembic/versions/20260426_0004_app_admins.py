"""app_admins: add app-level admin table

Revision ID: 0010
Revises: 0009
Create Date: 2026-04-26
"""

from alembic import op

revision = '0010'
down_revision = '0009'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS app_admins (
            user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
            granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (user_id)
        );
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS app_admins;")
