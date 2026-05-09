"""Replace group_invitations UNIQUE(group_id, user_id) with a partial
unique index on active invites only, so re-inviting a user after a prior
accepted/declined invitation is allowed.

Revision ID: 0021
Revises: 0020
Create Date: 2026-05-09
"""

from alembic import op

revision = '0021'
down_revision = '0020'


def upgrade():
    op.execute("ALTER TABLE group_invitations DROP CONSTRAINT IF EXISTS group_invitations_group_id_user_id_key")
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS group_invitations_active_unique "
        "ON group_invitations (group_id, user_id) "
        "WHERE status IN ('pending', 'awaiting_approval')"
    )


def downgrade():
    op.execute("DROP INDEX IF EXISTS group_invitations_active_unique")
    op.execute(
        "ALTER TABLE group_invitations "
        "ADD CONSTRAINT group_invitations_group_id_user_id_key UNIQUE (group_id, user_id)"
    )
