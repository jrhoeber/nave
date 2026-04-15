"""mass_schedule: convert from JSONB to TEXT

Revision ID: 0005
Revises: 0004
Create Date: 2026-04-15
"""

from alembic import op

revision = '0005'
down_revision = '0004'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        ALTER TABLE parishes
        ALTER COLUMN mass_schedule TYPE TEXT
        USING mass_schedule::text
    """)


def downgrade():
    op.execute("""
        ALTER TABLE parishes
        ALTER COLUMN mass_schedule TYPE JSONB
        USING mass_schedule::jsonb
    """)
