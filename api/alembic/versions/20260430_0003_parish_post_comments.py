"""parish_post_comments: add comments and comment reactions for parish posts

Adds parish_post_comments table (flat replies via reply_to_id),
parish_post_comment_reactions table (same 3 emojis as post reactions),
and extends user_reports to accept 'comment' content type.

Revision ID: 0013
Revises: 0012
Create Date: 2026-04-30
"""

from alembic import op

revision = '0013'
down_revision = '0012'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS parish_post_comments (
            id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            post_id      UUID NOT NULL REFERENCES parish_posts(id) ON DELETE CASCADE,
            user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            reply_to_id  UUID REFERENCES parish_post_comments(id) ON DELETE CASCADE,
            content      TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 1000),
            status       TEXT NOT NULL DEFAULT 'Posted'
                             CHECK (status IN ('Pending', 'Posted', 'Deleted', 'Rejected')),
            created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_ppc_post_created
            ON parish_post_comments (post_id, created_at ASC);

        CREATE INDEX IF NOT EXISTS idx_ppc_user
            ON parish_post_comments (user_id);

        CREATE TABLE IF NOT EXISTS parish_post_comment_reactions (
            comment_id UUID NOT NULL REFERENCES parish_post_comments(id) ON DELETE CASCADE,
            user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            reaction   TEXT NOT NULL CHECK (reaction IN ('\U0001f44d', '\U0001f64f', '\u2764\ufe0f')),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (comment_id, user_id, reaction)
        );

        CREATE INDEX IF NOT EXISTS idx_ppcr_comment
            ON parish_post_comment_reactions (comment_id);
    """)

    # Extend user_reports content_type to include 'comment'
    op.execute("""
        ALTER TABLE user_reports
            DROP CONSTRAINT IF EXISTS user_reports_content_type_check;

        ALTER TABLE user_reports
            ADD CONSTRAINT user_reports_content_type_check
            CHECK (content_type IN ('post', 'group_message', 'comment'));
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE user_reports
            DROP CONSTRAINT IF EXISTS user_reports_content_type_check;

        ALTER TABLE user_reports
            ADD CONSTRAINT user_reports_content_type_check
            CHECK (content_type IN ('post', 'group_message'));
    """)
    op.execute("DROP TABLE IF EXISTS parish_post_comment_reactions;")
    op.execute("DROP TABLE IF EXISTS parish_post_comments;")
