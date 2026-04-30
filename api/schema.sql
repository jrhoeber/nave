-- Nave API - Database Schema
-- Run once against Neon: psql $DATABASE_URL -f schema.sql

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid              TEXT UNIQUE,
    username                  TEXT NOT NULL UNIQUE,
    display_name              TEXT NOT NULL,
    email                     TEXT UNIQUE,
    password_hash             TEXT,
    bio                       TEXT,
    avatar_url                TEXT,
    birthday                  DATE,
    parish_id                 UUID,
    diocese                   TEXT,
    location                  TEXT,
    push_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    notify_group_messages     BOOLEAN NOT NULL DEFAULT TRUE,
    notify_friend_requests    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
    mass_schedule    TEXT,
    website          TEXT,
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
    content         TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'Posted'
                        CHECK (status IN ('Pending', 'Posted', 'Deleted', 'Rejected')),
    is_announcement BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
-- PARISH ADMINS
-- ============================================================
CREATE TABLE IF NOT EXISTS parish_admins (
    parish_id  UUID NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (parish_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_parish_admins_parish ON parish_admins (parish_id);
CREATE INDEX IF NOT EXISTS idx_parish_admins_user   ON parish_admins (user_id);

-- ============================================================
-- APP ADMINS
-- ============================================================
CREATE TABLE IF NOT EXISTS app_admins (
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id)
);

-- ============================================================
-- GROUP MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS group_messages (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id   UUID NOT NULL REFERENCES prayer_groups(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content    TEXT CHECK (char_length(content) <= 2000),
    image_url  TEXT,
    moderation_status TEXT CHECK (moderation_status IN ('pending', 'approved', 'rejected')) DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT group_messages_content_or_image CHECK (content IS NOT NULL OR image_url IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_gm_group_created ON group_messages (group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gm_user          ON group_messages (user_id);
CREATE INDEX IF NOT EXISTS idx_gm_moderation_status ON group_messages (moderation_status) WHERE moderation_status IS NOT NULL;

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
-- PUSH NOTIFICATION DEVICE TOKENS
-- ============================================================
CREATE TABLE IF NOT EXISTS user_device_tokens (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      TEXT NOT NULL,
    platform   TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_udt_user ON user_device_tokens (user_id);

-- ============================================================
-- GROUP NOTIFICATION MUTES
-- ============================================================
CREATE TABLE IF NOT EXISTS group_notification_mutes (
    user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES prayer_groups(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, group_id)
);

-- ============================================================
-- FRIENDSHIPS
-- ============================================================
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

CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships (requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships (addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status    ON friendships (status);

-- ============================================================
-- USER BLOCKS
-- ============================================================
CREATE TABLE IF NOT EXISTS user_blocks (
    blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (blocker_id, blocked_id),
    CHECK (blocker_id != blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks (blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks (blocked_id);

-- ============================================================
-- MODERATION QUEUE
-- ============================================================
CREATE TABLE IF NOT EXISTS moderation_queue (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content        TEXT,                      -- NULL for image-only entries
    context_type   TEXT NOT NULL,
    content_id     UUID,
    final_action   TEXT NOT NULL,
    layer1_result  JSONB,
    layer2_result  JSONB,
    image_url      TEXT,                      -- GCS object name of flagged image
    image_result   JSONB,                     -- SafeSearch scores and action
    status         TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewer_id    UUID REFERENCES users(id),
    reviewed_at    TIMESTAMPTZ,
    reviewer_notes TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mq_status_created
    ON moderation_queue (status, created_at)
    WHERE status = 'pending';

-- ============================================================
-- USER REPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS user_reports (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_type   TEXT NOT NULL CHECK (content_type IN ('post', 'group_message')),
    content_id     UUID NOT NULL,
    reason         TEXT NOT NULL CHECK (reason IN (
                       'spam', 'harassment', 'hate_speech',
                       'inappropriate', 'misinformation', 'other'
                   )),
    notes          TEXT,
    status         TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'reviewed', 'dismissed')),
    reviewer_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at    TIMESTAMPTZ,
    reviewer_notes TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (reporter_id, content_type, content_id)
);

CREATE INDEX IF NOT EXISTS idx_user_reports_status
    ON user_reports (status, created_at)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_user_reports_content
    ON user_reports (content_type, content_id);

-- ============================================================
-- USER STATS VIEW
-- ============================================================
CREATE OR REPLACE VIEW user_stats AS
SELECT
    u.id,
    COUNT(DISTINCT CASE WHEN pgm.status = 'member' THEN pgm.group_id END) AS prayer_group_count,
    COUNT(DISTINCT CASE WHEN f.status = 'accepted' THEN f.id END) AS friend_count,
    0::bigint AS post_count
FROM users u
LEFT JOIN prayer_group_members pgm ON pgm.user_id = u.id
LEFT JOIN friendships f
    ON f.status = 'accepted'
    AND (f.requester_id = u.id OR f.addressee_id = u.id)
GROUP BY u.id;
