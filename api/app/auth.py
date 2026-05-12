import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from app.config import settings

ACCESS_TOKEN_TYPE = "access"


def create_access_token(user_id: str, token_version: int) -> tuple[str, int]:
    """Return (jwt, expires_in_seconds)."""
    expires_in = settings.access_token_expire_minutes * 60
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=expires_in)).timestamp()),
        "tv": token_version,
        "typ": ACCESS_TOKEN_TYPE,
    }
    token = jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)
    return token, expires_in


def decode_access_token(token: str) -> tuple[str, int]:
    """Returns (user_id, token_version). Raises ValueError on any failure."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError:
        raise ValueError("Invalid token")
    if payload.get("typ") != ACCESS_TOKEN_TYPE:
        raise ValueError("Invalid token type")
    user_id = payload.get("sub")
    tv = payload.get("tv")
    if user_id is None or tv is None:
        raise ValueError("Invalid token")
    return user_id, int(tv)


def generate_refresh_token() -> tuple[str, str]:
    """Returns (plaintext, sha256_hex_hash)."""
    plaintext = secrets.token_urlsafe(48)
    return plaintext, hash_refresh_token(plaintext)


def hash_refresh_token(plaintext: str) -> str:
    return hashlib.sha256(plaintext.encode("utf-8")).hexdigest()
