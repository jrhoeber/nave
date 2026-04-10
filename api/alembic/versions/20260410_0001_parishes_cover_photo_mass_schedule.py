"""parishes add cover_photo_url and mass_schedule

Revision ID: 0006
Revises: 0005
Create Date: 2026-04-10
"""
from typing import Sequence, Union
from alembic import op

revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE parishes ADD COLUMN IF NOT EXISTS cover_photo_url TEXT")
    op.execute("ALTER TABLE parishes ADD COLUMN IF NOT EXISTS mass_schedule JSONB")


def downgrade() -> None:
    op.execute("ALTER TABLE parishes DROP COLUMN IF EXISTS mass_schedule")
    op.execute("ALTER TABLE parishes DROP COLUMN IF EXISTS cover_photo_url")
