-- Nave API - Database Schema
-- Run once against Neon: psql $DATABASE_URL -f schema.sql

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username      TEXT NOT NULL UNIQUE,
    display_name  TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    bio           TEXT,
    avatar_url    TEXT,
    parish        TEXT,
    diocese       TEXT,
    location      TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
CREATE INDEX IF NOT EXISTS idx_users_email    ON users (email);

-- ============================================================
-- PARISHES
-- ============================================================
CREATE TABLE IF NOT EXISTS parishes (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name             TEXT NOT NULL,
    city             TEXT NOT NULL,
    state            TEXT NOT NULL,
    diocese          TEXT NOT NULL,
    avatar_url       TEXT,
    cover_photo_url  TEXT,
    mass_schedule    JSONB,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parishes_name    ON parishes USING GIN (to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_parishes_state   ON parishes (state);
CREATE INDEX IF NOT EXISTS idx_parishes_diocese ON parishes (diocese);

-- ============================================================
-- PRAYER GROUPS
-- ============================================================
CREATE TABLE IF NOT EXISTS prayer_groups (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name             TEXT NOT NULL,
    description      TEXT NOT NULL,
    category         TEXT NOT NULL
                         CHECK (category IN (
                             'rosary', 'scripture_study', 'mens_group',
                             'womens_group', 'youth', 'young_adults',
                             'families', 'devotional', 'general'
                         )),
    avatar_url       TEXT,
    is_private       BOOLEAN NOT NULL DEFAULT FALSE,
    admin_id         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    parish           TEXT,
    diocese          TEXT,
    meeting_schedule TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prayer_groups_admin    ON prayer_groups (admin_id);
CREATE INDEX IF NOT EXISTS idx_prayer_groups_category ON prayer_groups (category);
CREATE INDEX IF NOT EXISTS idx_prayer_groups_name     ON prayer_groups USING GIN (to_tsvector('english', name));

-- ============================================================
-- PRAYER GROUP MEMBERSHIPS
-- status: pending (awaiting approval) | member
-- ============================================================
CREATE TABLE IF NOT EXISTS prayer_group_members (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id   UUID NOT NULL REFERENCES prayer_groups(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status     TEXT NOT NULL DEFAULT 'member'
                   CHECK (status IN ('pending', 'member')),
    joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_pgm_group ON prayer_group_members (group_id);
CREATE INDEX IF NOT EXISTS idx_pgm_user  ON prayer_group_members (user_id);

-- ============================================================
-- USER STATS VIEW
-- ============================================================
CREATE OR REPLACE VIEW user_stats AS
SELECT
    u.id,
    COUNT(DISTINCT CASE WHEN pgm.status = 'member' THEN pgm.group_id END) AS prayer_group_count
FROM users u
LEFT JOIN prayer_group_members pgm ON pgm.user_id = u.id
GROUP BY u.id;
