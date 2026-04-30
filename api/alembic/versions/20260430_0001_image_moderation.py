"""image_moderation: extend moderation_queue for image content

Adds image_url and image_result columns to moderation_queue and makes content
nullable so image-only queue entries don't require placeholder text.

Revision ID: 0011
Revises: 0010
Create Date: 2026-04-30
"""

from alembic import op

revision = '0011'
down_revision = '0010'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE moderation_queue
            ALTER COLUMN content DROP NOT NULL,
            ADD COLUMN IF NOT EXISTS image_url    TEXT,
            ADD COLUMN IF NOT EXISTS image_result JSONB;
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE moderation_queue
            DROP COLUMN IF EXISTS image_result,
            DROP COLUMN IF EXISTS image_url,
            ALTER COLUMN content SET NOT NULL;
    """)
