"""parish_admin: website column, parish_admins table, announcement posts

Revision ID: 0004
Revises: 0003
Create Date: 2026-04-14
"""

from alembic import op

revision = '0004'
down_revision = '0003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add website column to parishes
    op.execute("ALTER TABLE parishes ADD COLUMN IF NOT EXISTS website TEXT;")

    # Parish admins junction table
    op.execute("""
        CREATE TABLE IF NOT EXISTS parish_admins (
            parish_id  UUID NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
            user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (parish_id, user_id)
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_parish_admins_parish ON parish_admins (parish_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_parish_admins_user   ON parish_admins (user_id);")

    # Announcement flag on parish posts
    op.execute(
        "ALTER TABLE parish_posts ADD COLUMN IF NOT EXISTS is_announcement BOOLEAN NOT NULL DEFAULT FALSE;"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE parish_posts DROP COLUMN IF EXISTS is_announcement;")
    op.execute("DROP TABLE IF EXISTS parish_admins;")
    op.execute("ALTER TABLE parishes DROP COLUMN IF EXISTS website;")
