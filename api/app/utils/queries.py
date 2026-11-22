"""Reusable SQL query helpers."""


def like_contains(term: str) -> str:
    """Return an ILIKE pattern that matches ``term`` as a literal substring.

    Escapes LIKE metacharacters so user input like ``_`` or ``%`` can't act as a
    wildcard (e.g. ``q=_`` matching every row). Relies on Postgres's default
    LIKE escape character, backslash.
    """
    escaped = term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"
