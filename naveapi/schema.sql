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
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL,
    city       TEXT NOT NULL,
    state      TEXT NOT NULL,
    diocese    TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parishes_name    ON parishes USING GIN (to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_parishes_state   ON parishes (state);
CREATE INDEX IF NOT EXISTS idx_parishes_diocese ON parishes (diocese);

-- ============================================================
-- FRIENDSHIPS
-- requester_id sends the request to addressee_id
-- status: pending | accepted
-- ============================================================
CREATE TABLE IF NOT EXISTS friendships (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status       TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'accepted')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (requester_id, addressee_id),
    CHECK (requester_id <> addressee_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships (requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships (addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status    ON friendships (status);

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
-- POSTS
-- ============================================================
CREATE TABLE IF NOT EXISTS posts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            TEXT NOT NULL
                        CHECK (type IN (
                            'general', 'prayer_request', 'testimony',
                            'event', 'scripture'
                        )),
    content         TEXT NOT NULL,
    image_url       TEXT,
    prayer_group_id UUID REFERENCES prayer_groups(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_author       ON posts (author_id);
CREATE INDEX IF NOT EXISTS idx_posts_prayer_group ON posts (prayer_group_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at   ON posts (created_at DESC);

-- ============================================================
-- POST REACTIONS (like | pray)
-- ============================================================
CREATE TABLE IF NOT EXISTS post_reactions (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       TEXT NOT NULL CHECK (type IN ('like', 'pray')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (post_id, user_id, type)
);

CREATE INDEX IF NOT EXISTS idx_post_reactions_post ON post_reactions (post_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_user ON post_reactions (user_id);

-- ============================================================
-- COMMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS comments (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content    TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_post    ON comments (post_id);
CREATE INDEX IF NOT EXISTS idx_comments_author  ON comments (author_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments (created_at ASC);

-- ============================================================
-- COMMENT LIKES
-- ============================================================
CREATE TABLE IF NOT EXISTS comment_likes (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_likes_comment ON comment_likes (comment_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       TEXT NOT NULL CHECK (type IN (
                   'friend_request', 'friend_accepted',
                   'post_like', 'post_comment',
                   'prayer_group_invite', 'prayer_group_post',
                   'prayer_received'
               )),
    message    TEXT NOT NULL,
    is_read    BOOLEAN NOT NULL DEFAULT FALSE,
    target_id  UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user    ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread  ON notifications (user_id) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications (created_at DESC);

-- ============================================================
-- USER STATS VIEW
-- ============================================================
CREATE OR REPLACE VIEW user_stats AS
SELECT
    u.id,
    COUNT(DISTINCT CASE
        WHEN f.status = 'accepted' THEN
            CASE WHEN f.requester_id = u.id THEN f.addressee_id ELSE f.requester_id END
    END) AS friend_count,
    COUNT(DISTINCT CASE WHEN pgm.status = 'member' THEN pgm.group_id END) AS prayer_group_count,
    COUNT(DISTINCT p.id) AS post_count
FROM users u
LEFT JOIN friendships f
    ON (f.requester_id = u.id OR f.addressee_id = u.id)
LEFT JOIN prayer_group_members pgm ON pgm.user_id = u.id
LEFT JOIN posts p ON p.author_id = u.id
GROUP BY u.id;
