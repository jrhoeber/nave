"""Rename scripture_study category to bible_study and remove rosary/youth

Revision ID: 0015
Revises: 0014
Create Date: 2026-05-03
"""

from alembic import op

revision = '0015'
down_revision = '0014'


def upgrade():
    op.execute("ALTER TABLE prayer_groups DROP CONSTRAINT IF EXISTS prayer_groups_category_check")
    op.execute("UPDATE prayer_groups SET category = 'bible_study' WHERE category = 'scripture_study'")
    op.execute("UPDATE prayer_groups SET category = 'general' WHERE category IN ('rosary', 'youth')")
    op.execute("""
        ALTER TABLE prayer_groups ADD CONSTRAINT prayer_groups_category_check
            CHECK (category IN (
                'bible_study', 'mens_group', 'womens_group',
                'young_adults', 'families', 'devotional', 'general'
            ))
    """)


def downgrade():
    op.execute("UPDATE prayer_groups SET category = 'scripture_study' WHERE category = 'bible_study'")
    op.execute("""
        ALTER TABLE prayer_groups DROP CONSTRAINT IF EXISTS prayer_groups_category_check;
        ALTER TABLE prayer_groups ADD CONSTRAINT prayer_groups_category_check
            CHECK (category IN (
                'rosary', 'scripture_study', 'mens_group', 'womens_group',
                'youth', 'young_adults', 'families', 'devotional', 'general'
            ));
    """)
