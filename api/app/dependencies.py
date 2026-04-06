import logging

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.auth import decode_access_token
from app.database import get_db

logger = logging.getLogger("nave.auth")

bearer_scheme = HTTPBearer()
optional_bearer_scheme = HTTPBearer(auto_error=False)


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


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(optional_bearer_scheme),
    conn=Depends(get_db),
) -> dict | None:
    if credentials is None:
        return None
    try:
        user_id = decode_access_token(credentials.credentials)
        row = await conn.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
        return dict(row) if row else None
    except ValueError as exc:
        logger.debug("Optional auth token invalid: %s", exc)
        return None
