import logging

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.auth import decode_access_token
from app.database import get_db

logger = logging.getLogger("nave.auth")

bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    conn=Depends(get_db),
) -> dict:
    try:
        user_id = decode_access_token(credentials.credentials)
    except ValueError as exc:
        logger.warning("Token validation failed: %s", exc)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    row = await conn.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
    if row is None:
        logger.warning("Authenticated token references unknown user_id=%s", user_id)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return dict(row)


async def is_parish_admin(conn, user_id: str, parish_id: str) -> bool:
    """Returns True if the user is a parish admin for this parish, or a global app admin."""
    row = await conn.fetchrow(
        """
        SELECT 1 FROM parish_admins WHERE parish_id = $1 AND user_id = $2
        UNION ALL
        SELECT 1 FROM app_admins WHERE user_id = $2
        LIMIT 1
        """,
        parish_id,
        user_id,
    )
    return row is not None
