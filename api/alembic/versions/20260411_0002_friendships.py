"""friendships table

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-11
"""

from alembic import op

revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS friendships (
            id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            addressee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            status       TEXT NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'accepted', 'rejected')),
            created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (requester_id, addressee_id),
            CHECK (requester_id != addressee_id)
        );
    """)

    op.execute("CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships (requester_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships (addressee_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_friendships_status    ON friendships (status);")

    # Rebuild user_stats to count real accepted friends
    op.execute("DROP VIEW IF EXISTS user_stats;")
    op.execute("""
        CREATE OR REPLACE VIEW user_stats AS
        SELECT
            u.id,
            COUNT(DISTINCT CASE WHEN pgm.status = 'member' THEN pgm.group_id END) AS prayer_group_count,
            COUNT(DISTINCT CASE
                WHEN f.status = 'accepted' THEN f.id
            END) AS friend_count,
            0::bigint AS post_count
        FROM users u
        LEFT JOIN prayer_group_members pgm ON pgm.user_id = u.id
        LEFT JOIN friendships f
            ON f.status = 'accepted'
            AND (f.requester_id = u.id OR f.addressee_id = u.id)
        GROUP BY u.id;
    """)


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS user_stats;")
    op.execute("DROP TABLE IF EXISTS friendships;")
    op.execute("""
        CREATE OR REPLACE VIEW user_stats AS
        SELECT
            u.id,
            COUNT(DISTINCT CASE WHEN pgm.status = 'member' THEN pgm.group_id END) AS prayer_group_count,
            0::bigint AS friend_count,
            0::bigint AS post_count
        FROM users u
        LEFT JOIN prayer_group_members pgm ON pgm.user_id = u.id
        GROUP BY u.id;
    """)
