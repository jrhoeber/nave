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
    parish_id     UUID,
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
    street_address   TEXT,
    city             TEXT NOT NULL,
    state            TEXT NOT NULL,
    postal_code      TEXT,
    diocese          TEXT NOT NULL,
    established      INTEGER,
    avatar_url       TEXT,
    cover_photo_url  TEXT,
    mass_schedule    JSONB,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parishes_name_trgm ON parishes USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_parishes_name      ON parishes USING GIN (to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_parishes_state     ON parishes (state);
CREATE INDEX IF NOT EXISTS idx_parishes_diocese   ON parishes (diocese);

ALTER TABLE users
    ADD CONSTRAINT fk_users_parish
    FOREIGN KEY (parish_id) REFERENCES parishes(id) ON DELETE SET NULL;

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
-- PARISH POSTS
-- ============================================================
CREATE TABLE IF NOT EXISTS parish_posts (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parish_id  UUID NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content    TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'Posted'
                   CHECK (status IN ('Pending', 'Posted', 'Deleted', 'Rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parish_posts_parish ON parish_posts (parish_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_parish_posts_user   ON parish_posts (user_id);

-- ============================================================
-- PARISH POST REACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS parish_post_reactions (
    post_id    UUID NOT NULL REFERENCES parish_posts(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction   TEXT NOT NULL CHECK (reaction IN ('👍', '🙏', '❤️')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (post_id, user_id, reaction)
);

CREATE INDEX IF NOT EXISTS idx_parish_post_reactions_post ON parish_post_reactions (post_id);

-- ============================================================
-- GROUP MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS group_messages (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id   UUID NOT NULL REFERENCES prayer_groups(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content    TEXT CHECK (char_length(content) <= 2000),
    image_url  TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT group_messages_content_or_image CHECK (content IS NOT NULL OR image_url IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_gm_group_created ON group_messages (group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gm_user          ON group_messages (user_id);

-- ============================================================
-- GROUP MESSAGE REACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS group_message_reactions (
    message_id UUID NOT NULL REFERENCES group_messages(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji      VARCHAR(10) NOT NULL
                   CHECK (emoji IN ('👍', '🙏', '❤️', '😂', '😮', '🥲')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_gmr_message ON group_message_reactions (message_id);

-- ============================================================
-- USER STATS VIEW
-- ============================================================
CREATE OR REPLACE VIEW user_stats AS
SELECT
    u.id,
    COUNT(DISTINCT CASE WHEN pgm.status = 'member' THEN pgm.group_id END) AS prayer_group_count,
    0::bigint AS friend_count,
    0::bigint AS post_count
FROM users u
LEFT JOIN prayer_group_members pgm ON pgm.user_id = u.id
GROUP BY u.id;
