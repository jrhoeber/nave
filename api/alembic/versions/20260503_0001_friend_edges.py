"""friend_edges: denormalized edge table for fast mutual-friend lookups

Each accepted friendship is stored as two rows (A,B) and (B,A).
Backfills from existing accepted friendships.

Revision ID: 0014
Revises: 0013
Create Date: 2026-05-03
"""

from alembic import op

revision = '0014'
down_revision = '0013'


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS friend_edges (
            user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            friend_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            PRIMARY KEY (user_id, friend_id)
        );
    """)

    # Backfill from existing accepted friendships
    op.execute("""
        INSERT INTO friend_edges (user_id, friend_id)
        SELECT requester_id, addressee_id FROM friendships WHERE status = 'accepted'
        UNION ALL
        SELECT addressee_id, requester_id FROM friendships WHERE status = 'accepted'
        ON CONFLICT DO NOTHING;
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS friend_edges;")
