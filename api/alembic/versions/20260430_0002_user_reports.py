"""user_reports: add user content reporting table

Allows users to report posts and group messages for admin review.
One report per user per content item (unique constraint).

Revision ID: 0012
Revises: 0011
Create Date: 2026-04-30
"""

from alembic import op

revision = '0012'
down_revision = '0011'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS user_reports (
            id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            reporter_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            content_type   TEXT NOT NULL CHECK (content_type IN ('post', 'group_message')),
            content_id     UUID NOT NULL,
            reason         TEXT NOT NULL CHECK (reason IN (
                               'spam', 'harassment', 'hate_speech',
                               'inappropriate', 'misinformation', 'other'
                           )),
            notes          TEXT,
            status         TEXT NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'reviewed', 'dismissed')),
            reviewer_id    UUID REFERENCES users(id) ON DELETE SET NULL,
            reviewed_at    TIMESTAMPTZ,
            reviewer_notes TEXT,
            created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (reporter_id, content_type, content_id)
        );

        CREATE INDEX IF NOT EXISTS idx_user_reports_status
            ON user_reports (status, created_at)
            WHERE status = 'pending';

        CREATE INDEX IF NOT EXISTS idx_user_reports_content
            ON user_reports (content_type, content_id);
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS user_reports;")
