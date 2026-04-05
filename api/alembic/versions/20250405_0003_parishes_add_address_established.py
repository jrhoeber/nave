"""parishes add address and established

Revision ID: 0003
Revises: 0002
Create Date: 2025-04-05
"""
from typing import Sequence, Union
from alembic import op

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE parishes ADD COLUMN IF NOT EXISTS street_address TEXT")
    op.execute("ALTER TABLE parishes ADD COLUMN IF NOT EXISTS postal_code TEXT")
    op.execute("ALTER TABLE parishes ADD COLUMN IF NOT EXISTS established SMALLINT")


def downgrade() -> None:
    op.execute("ALTER TABLE parishes DROP COLUMN IF EXISTS established")
    op.execute("ALTER TABLE parishes DROP COLUMN IF EXISTS postal_code")
    op.execute("ALTER TABLE parishes DROP COLUMN IF EXISTS street_address")
