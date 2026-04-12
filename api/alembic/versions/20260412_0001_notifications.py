"""notifications: device tokens, mutes, user preferences

Revision ID: 0003
Revises: 0002
Create Date: 2026-04-12
"""

from alembic import op

revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # FCM device tokens
    op.execute("""
        CREATE TABLE IF NOT EXISTS user_device_tokens (
            id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token      TEXT NOT NULL,
            platform   TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (user_id, token)
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_udt_user ON user_device_tokens (user_id);")

    # Per-group notification mutes
    op.execute("""
        CREATE TABLE IF NOT EXISTS group_notification_mutes (
            user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            group_id UUID NOT NULL REFERENCES prayer_groups(id) ON DELETE CASCADE,
            PRIMARY KEY (user_id, group_id)
        );
    """)

    # User-level notification preferences
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE;")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_group_messages BOOLEAN NOT NULL DEFAULT TRUE;")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_friend_requests BOOLEAN NOT NULL DEFAULT TRUE;")


def downgrade() -> None:
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS notify_friend_requests;")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS notify_group_messages;")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS push_notifications_enabled;")
    op.execute("DROP TABLE IF EXISTS group_notification_mutes;")
    op.execute("DROP TABLE IF EXISTS user_device_tokens;")
