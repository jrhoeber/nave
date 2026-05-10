"""drop_emoji_reactions: collapse multi-emoji reactions to a single heart

The app has only ever surfaced a heart for reactions, so the per-emoji
columns and CHECK constraints on the three reaction tables are dead weight.
This migration:

- Deduplicates each (parent_id, user_id) pair to a single row
- Drops the emoji/reaction column and its CHECK constraint
- Re-establishes the primary key without the emoji column

Revision ID: 0023
Revises: 0022
Create Date: 2026-05-10
"""

from alembic import op


revision = '0023'
down_revision = '0022'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # parish_post_reactions
    op.execute(
        """
        DELETE FROM parish_post_reactions
        WHERE ctid NOT IN (
            SELECT MIN(ctid) FROM parish_post_reactions
            GROUP BY post_id, user_id
        )
        """
    )
    op.execute("ALTER TABLE parish_post_reactions DROP CONSTRAINT IF EXISTS parish_post_reactions_pkey")
    op.execute("ALTER TABLE parish_post_reactions DROP CONSTRAINT IF EXISTS parish_post_reactions_reaction_check")
    op.execute("ALTER TABLE parish_post_reactions DROP COLUMN IF EXISTS reaction")
    op.execute("ALTER TABLE parish_post_reactions ADD PRIMARY KEY (post_id, user_id)")

    # parish_post_comment_reactions
    op.execute(
        """
        DELETE FROM parish_post_comment_reactions
        WHERE ctid NOT IN (
            SELECT MIN(ctid) FROM parish_post_comment_reactions
            GROUP BY comment_id, user_id
        )
        """
    )
    op.execute("ALTER TABLE parish_post_comment_reactions DROP CONSTRAINT IF EXISTS parish_post_comment_reactions_pkey")
    op.execute("ALTER TABLE parish_post_comment_reactions DROP CONSTRAINT IF EXISTS parish_post_comment_reactions_reaction_check")
    op.execute("ALTER TABLE parish_post_comment_reactions DROP COLUMN IF EXISTS reaction")
    op.execute("ALTER TABLE parish_post_comment_reactions ADD PRIMARY KEY (comment_id, user_id)")

    # group_message_reactions
    op.execute(
        """
        DELETE FROM group_message_reactions
        WHERE ctid NOT IN (
            SELECT MIN(ctid) FROM group_message_reactions
            GROUP BY message_id, user_id
        )
        """
    )
    op.execute("ALTER TABLE group_message_reactions DROP CONSTRAINT IF EXISTS group_message_reactions_pkey")
    op.execute("ALTER TABLE group_message_reactions DROP CONSTRAINT IF EXISTS group_message_reactions_emoji_check")
    op.execute("ALTER TABLE group_message_reactions DROP COLUMN IF EXISTS emoji")
    op.execute("ALTER TABLE group_message_reactions ADD PRIMARY KEY (message_id, user_id)")


def downgrade() -> None:
    # Restore the emoji/reaction columns with a default heart for any existing rows
    op.execute("ALTER TABLE parish_post_reactions DROP CONSTRAINT IF EXISTS parish_post_reactions_pkey")
    op.execute("ALTER TABLE parish_post_reactions ADD COLUMN reaction TEXT NOT NULL DEFAULT '❤️' CHECK (reaction IN ('👍', '🙏', '❤️'))")
    op.execute("ALTER TABLE parish_post_reactions ADD PRIMARY KEY (post_id, user_id, reaction)")

    op.execute("ALTER TABLE parish_post_comment_reactions DROP CONSTRAINT IF EXISTS parish_post_comment_reactions_pkey")
    op.execute("ALTER TABLE parish_post_comment_reactions ADD COLUMN reaction TEXT NOT NULL DEFAULT '❤️' CHECK (reaction IN ('👍', '🙏', '❤️'))")
    op.execute("ALTER TABLE parish_post_comment_reactions ADD PRIMARY KEY (comment_id, user_id, reaction)")

    op.execute("ALTER TABLE group_message_reactions DROP CONSTRAINT IF EXISTS group_message_reactions_pkey")
    op.execute("ALTER TABLE group_message_reactions ADD COLUMN emoji VARCHAR(10) NOT NULL DEFAULT '❤️' CHECK (emoji IN ('👍', '🙏', '❤️', '😂', '😮', '🥲'))")
    op.execute("ALTER TABLE group_message_reactions ADD PRIMARY KEY (message_id, user_id, emoji)")
