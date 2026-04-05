"""users parish fk

Revision ID: 0002
Revises: 0001
Create Date: 2025-04-05

Change users.parish from a free-text column to a UUID FK referencing parishes.
Existing text values are dropped (no automatic mapping is possible).
"""
from typing import Sequence, Union
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS parish")
    op.execute("""
        ALTER TABLE users
        ADD COLUMN parish_id UUID REFERENCES parishes(id) ON DELETE SET NULL
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_users_parish ON users (parish_id)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_users_parish")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS parish_id")
    op.execute("ALTER TABLE users ADD COLUMN parish TEXT")
