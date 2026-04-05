"""Reusable SQL query helpers."""

# Inline user stats columns — embed in SELECT alongside the users table
USER_STATS_COLS = """
    COALESCE(us.friend_count, 0)       AS friend_count,
    COALESCE(us.prayer_group_count, 0) AS prayer_group_count,
    COALESCE(us.post_count, 0)         AS post_count
"""

# JOIN clause to attach user_stats view
USER_STATS_JOIN = "LEFT JOIN user_stats us ON us.id = {alias}.id"


def friendship_flags_sql(current_user_id: str, alias: str = "u") -> str:
    """Returns SQL expressions for is_friend and is_pending_friend given a current user."""
    return f"""
        EXISTS (
            SELECT 1 FROM friendships f
            WHERE f.status = 'accepted'
              AND ((f.requester_id = '{current_user_id}' AND f.addressee_id = {alias}.id)
                OR (f.addressee_id = '{current_user_id}' AND f.requester_id = {alias}.id))
        ) AS is_friend,
        EXISTS (
            SELECT 1 FROM friendships f
            WHERE f.status = 'pending'
              AND f.requester_id = '{current_user_id}'
              AND f.addressee_id = {alias}.id
        ) AS is_pending_friend
    """


POST_REACTION_COLS = """
    COUNT(DISTINCT pr_like.id) FILTER (WHERE pr_like.type = 'like') AS like_count,
    COUNT(DISTINCT pr_pray.id) FILTER (WHERE pr_pray.type = 'pray') AS prayer_count,
    COUNT(DISTINCT c.id)                                             AS comment_count,
    BOOL_OR(pr_like.user_id = $1)                                   AS is_liked,
    BOOL_OR(pr_pray.user_id = $1)                                   AS is_praying
"""

POST_REACTION_JOINS = """
    LEFT JOIN post_reactions pr_like ON pr_like.post_id = p.id AND pr_like.type = 'like'
    LEFT JOIN post_reactions pr_pray ON pr_pray.post_id = p.id AND pr_pray.type = 'pray'
    LEFT JOIN comments c ON c.post_id = p.id
"""
