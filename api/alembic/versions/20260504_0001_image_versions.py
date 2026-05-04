"""Add image version columns for cache busting

Revision ID: 0017
Revises: 0016
Create Date: 2026-05-04
"""

from alembic import op


revision = '0017'
down_revision = '0016'


def upgrade():
    op.execute("ALTER TABLE parishes ADD COLUMN IF NOT EXISTS cover_photo_version BIGINT")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_version BIGINT")
    op.execute("ALTER TABLE prayer_groups ADD COLUMN IF NOT EXISTS avatar_version BIGINT")


def downgrade():
    op.execute("ALTER TABLE prayer_groups DROP COLUMN IF EXISTS avatar_version")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS avatar_version")
    op.execute("ALTER TABLE parishes DROP COLUMN IF EXISTS cover_photo_version")
