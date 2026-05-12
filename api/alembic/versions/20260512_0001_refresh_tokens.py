"""refresh_tokens: rotating refresh tokens + per-user revocation counter

Adds:
- users.token_version (bumped to revoke all sessions for a user)
- refresh_tokens table with hashed tokens, family tracking for reuse detection,
  rotation pointer, and per-row revocation timestamp

Revision ID: 0024
Revises: 0023
Create Date: 2026-05-12
"""

from alembic import op


revision = '0024'
down_revision = '0023'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 0
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token_hash    TEXT NOT NULL UNIQUE,
            family_id     UUID NOT NULL,
            created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            last_used_at  TIMESTAMPTZ,
            expires_at    TIMESTAMPTZ NOT NULL,
            revoked_at    TIMESTAMPTZ,
            rotated_to    UUID,
            user_agent    TEXT,
            ip            INET
        )
        """
    )

    op.execute("CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id   ON refresh_tokens (user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family_id ON refresh_tokens (family_id)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS refresh_tokens")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS token_version")
