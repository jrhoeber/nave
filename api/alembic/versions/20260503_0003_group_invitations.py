"""Add group_invitations table

Revision ID: 0016
Revises: 0015
Create Date: 2026-05-03
"""

from alembic import op

revision = '0016'
down_revision = '0015'


def upgrade():
    op.execute("""
        CREATE TABLE group_invitations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            group_id UUID NOT NULL REFERENCES prayer_groups(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'awaiting_approval')),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (group_id, user_id)
        )
    """)


def downgrade():
    op.execute("DROP TABLE IF EXISTS group_invitations")
