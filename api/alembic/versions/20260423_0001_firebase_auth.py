"""firebase_auth: add firebase_uid, birthday; make password_hash and email nullable

Revision ID: 0006
Revises: 0005
Create Date: 2026-04-23
"""

from alembic import op

revision = '0006'
down_revision = '0005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS firebase_uid TEXT;")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_users_firebase_uid ON users (firebase_uid);")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS birthday DATE;")
    op.execute("ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;")
    op.execute("ALTER TABLE users ALTER COLUMN email DROP NOT NULL;")


def downgrade() -> None:
    op.execute("ALTER TABLE users ALTER COLUMN email SET NOT NULL;")
    op.execute("ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;")
    op.execute("DROP INDEX IF EXISTS uq_users_firebase_uid;")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS birthday;")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS firebase_uid;")
