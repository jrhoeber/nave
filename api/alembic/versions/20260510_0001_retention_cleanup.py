"""retention_cleanup: schema changes to support data retention sweeps

- moderation_queue: detach FK on user_id (CASCADE -> SET NULL) and add
  account_deleted_at so rows survive account deletion for the +1 year
  retention window
- Add indexes on the timestamp columns each sweep filters on so batched
  DELETEs stay fast as tables grow

Revision ID: 0022
Revises: 0021
Create Date: 2026-05-10
"""

from alembic import op


revision = '0022'
down_revision = '0021'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE moderation_queue "
        "DROP CONSTRAINT IF EXISTS moderation_queue_user_id_fkey"
    )
    op.execute(
        "ALTER TABLE moderation_queue "
        "ADD CONSTRAINT moderation_queue_user_id_fkey "
        "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL"
    )
    op.execute(
        "ALTER TABLE moderation_queue ALTER COLUMN user_id DROP NOT NULL"
    )
    op.execute(
        "ALTER TABLE moderation_queue "
        "ADD COLUMN IF NOT EXISTS account_deleted_at TIMESTAMPTZ"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_mq_account_deleted "
        "ON moderation_queue (account_deleted_at) "
        "WHERE account_deleted_at IS NOT NULL"
    )

    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_user_reports_closed "
        "ON user_reports (reviewed_at) "
        "WHERE status IN ('reviewed', 'dismissed')"
    )

    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_notifications_created_at "
        "ON notifications (created_at)"
    )

    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_udt_updated_at "
        "ON user_device_tokens (updated_at)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_udt_updated_at")
    op.execute("DROP INDEX IF EXISTS idx_notifications_created_at")
    op.execute("DROP INDEX IF EXISTS idx_user_reports_closed")
    op.execute("DROP INDEX IF EXISTS idx_mq_account_deleted")
    op.execute(
        "ALTER TABLE moderation_queue DROP COLUMN IF EXISTS account_deleted_at"
    )
    op.execute(
        "ALTER TABLE moderation_queue "
        "DROP CONSTRAINT IF EXISTS moderation_queue_user_id_fkey"
    )
    op.execute(
        "ALTER TABLE moderation_queue "
        "ADD CONSTRAINT moderation_queue_user_id_fkey "
        "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE"
    )
    op.execute(
        "ALTER TABLE moderation_queue ALTER COLUMN user_id SET NOT NULL"
    )
