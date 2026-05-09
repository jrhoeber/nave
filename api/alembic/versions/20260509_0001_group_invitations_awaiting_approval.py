"""Add awaiting_approval to group_invitations.status CHECK

Revision ID: 0020
Revises: 0019
Create Date: 2026-05-09
"""

from alembic import op

revision = '0020'
down_revision = '0019'


def upgrade():
    op.execute("ALTER TABLE group_invitations DROP CONSTRAINT IF EXISTS group_invitations_status_check")
    op.execute(
        "ALTER TABLE group_invitations ADD CONSTRAINT group_invitations_status_check "
        "CHECK (status IN ('pending', 'accepted', 'declined', 'awaiting_approval'))"
    )


def downgrade():
    op.execute("ALTER TABLE group_invitations DROP CONSTRAINT IF EXISTS group_invitations_status_check")
    op.execute(
        "ALTER TABLE group_invitations ADD CONSTRAINT group_invitations_status_check "
        "CHECK (status IN ('pending', 'accepted', 'declined'))"
    )
