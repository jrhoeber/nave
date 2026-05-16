"""pending_message_images: server-issued ID for moderated group-message uploads

Decouples the GCS object_name from the client. Upload returns an opaque id;
send_message references that id, server resolves to object_name and verifies
ownership before persisting.

Revision ID: 0025
Revises: 0024
Create Date: 2026-05-13
"""

from alembic import op


revision = '0025'
down_revision = '0024'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS pending_message_images (
            id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            group_id      UUID NOT NULL REFERENCES prayer_groups(id) ON DELETE CASCADE,
            user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            object_name   TEXT NOT NULL,
            content_type  TEXT NOT NULL,
            created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            consumed_at   TIMESTAMPTZ
        )
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_pmi_unconsumed "
        "ON pending_message_images (created_at) WHERE consumed_at IS NULL"
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS pending_message_images")
