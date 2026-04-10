"""Reusable SQL query helpers."""

# Inline user stats columns — embed in SELECT alongside the users table
USER_STATS_COLS = """
    COALESCE(us.prayer_group_count, 0) AS prayer_group_count
"""

# JOIN clause to attach user_stats view
USER_STATS_JOIN = "LEFT JOIN user_stats us ON us.id = {alias}.id"
