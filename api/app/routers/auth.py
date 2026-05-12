import re
import random
import string
import logging
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.auth import (
    create_access_token,
    generate_refresh_token,
    hash_refresh_token,
)
from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import (
    FirebaseAuthRequest,
    LogoutRequest,
    RefreshRequest,
    RefreshResponse,
    TokenResponse,
    UserResponse,
)
from app.utils.firebase import verify_firebase_token
from app.utils.storage import get_avatar_signed_url, get_signed_url

router = APIRouter()
logger = logging.getLogger("nave.auth")

_GCS_PATH_PREFIX = "avatars/"


def _resolve_avatar_url(raw: str | None) -> str | None:
    if raw and raw.startswith(_GCS_PATH_PREFIX):
        return get_avatar_signed_url(raw)
    return raw


def _resolve_parish_cover(raw: str | None) -> str | None:
    if not raw:
        return None
    if raw.startswith("http"):
        return raw
    return get_signed_url(raw)


def _build_user_response(row: dict) -> UserResponse:
    return UserResponse(
        id=str(row["id"]),
        username=row["username"],
        display_name=row["display_name"],
        bio=row.get("bio"),
        avatar_url=_resolve_avatar_url(row.get("avatar_url")),
        parish_id=str(row["parish_id"]) if row.get("parish_id") else None,
        parish=row.get("parish_name"),
        parish_cover_photo_url=_resolve_parish_cover(row.get("parish_cover_photo_url")),
        diocese=row.get("diocese"),
        location=row.get("location"),
        birthday=row.get("birthday"),
        friend_count=row.get("friend_count", 0),
        prayer_group_count=row.get("prayer_group_count", 0),
        created_at=row["created_at"],
    )


def _generate_base_username(display_name: str) -> str:
    base = re.sub(r'[^a-z0-9_]', '', display_name.lower().replace(' ', '_').replace('-', '_'))
    return base[:20] if base else 'user'


async def _find_unique_username(conn, display_name: str) -> str:
    base = _generate_base_username(display_name)
    username = base
    for _ in range(10):
        exists = await conn.fetchrow("SELECT 1 FROM users WHERE username = $1", username)
        if not exists:
            return username
        suffix = ''.join(random.choices(string.digits, k=4))
        username = f"{base[:15]}_{suffix}"
    # Fallback: UUID-based username
    return 'user_' + ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))


def _client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


async def _issue_refresh_token(
    conn,
    user_id: str,
    *,
    family_id: uuid.UUID | None = None,
    user_agent: str | None = None,
    ip: str | None = None,
) -> str:
    """Insert a new refresh-token row and return the plaintext token."""
    plaintext, token_hash = generate_refresh_token()
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    await conn.execute(
        """
        INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at, user_agent, ip)
        VALUES ($1, $2, $3, $4, $5, $6)
        """,
        user_id,
        token_hash,
        family_id or uuid.uuid4(),
        expires_at,
        user_agent,
        ip,
    )
    return plaintext


async def _build_token_response(
    conn,
    row: dict,
    *,
    is_new_user: bool,
    request: Request,
) -> TokenResponse:
    access_token, expires_in = create_access_token(str(row["id"]), int(row["token_version"]))
    refresh_token = await _issue_refresh_token(
        conn,
        str(row["id"]),
        user_agent=request.headers.get("user-agent"),
        ip=_client_ip(request),
    )
    is_admin = bool(await conn.fetchval(
        "SELECT 1 FROM app_admins WHERE user_id = $1", row["id"]
    ))
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        access_token_expires_in=expires_in,
        user=_build_user_response(dict(row)),
        is_new_user=is_new_user,
        is_admin=is_admin,
    )


@router.post("/firebase", response_model=TokenResponse, status_code=status.HTTP_200_OK)
async def firebase_auth(body: FirebaseAuthRequest, request: Request, conn=Depends(get_db)):
    """
    Exchange a Firebase ID token for an app access token + refresh token.
    Creates the user if they don't exist yet.
    """
    try:
        claims = verify_firebase_token(body.id_token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    firebase_uid: str = claims["uid"]
    email: str | None = claims.get("email")
    firebase_real_name: str | None = claims.get("name")
    firebase_avatar: str | None = claims.get("picture")
    username_seed: str = firebase_real_name or (email.split("@")[0] if email else "user")
    display_name_value: str = firebase_real_name or ""

    row = await conn.fetchrow(
        """
        SELECT u.*, p.name AS parish_name, p.cover_photo_url AS parish_cover_photo_url,
               COALESCE(us.friend_count,0) AS friend_count,
               COALESCE(us.prayer_group_count,0) AS prayer_group_count,
               COALESCE(us.post_count,0) AS post_count
        FROM users u
        LEFT JOIN parishes p ON p.id = u.parish_id
        LEFT JOIN user_stats us ON us.id = u.id
        WHERE u.firebase_uid = $1
        """,
        firebase_uid,
    )

    is_new_user = False

    if row is None and body.source == "web":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No account found. Download the Nave app to create an account.",
        )

    if row is None:
        is_new_user = True
        username = await _find_unique_username(conn, username_seed)
        avatar_url = firebase_avatar if firebase_avatar and firebase_avatar.startswith("http") else None

        row = await conn.fetchrow(
            """
            INSERT INTO users (firebase_uid, username, display_name, email, avatar_url)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            """,
            firebase_uid,
            username,
            display_name_value,
            email,
            avatar_url,
        )
        row = dict(row)
        row.update({"friend_count": 0, "prayer_group_count": 0, "post_count": 0, "parish_name": None})

    return await _build_token_response(conn, dict(row), is_new_user=is_new_user, request=request)


@router.post("/refresh", response_model=RefreshResponse, status_code=status.HTTP_200_OK)
async def refresh(body: RefreshRequest, request: Request, conn=Depends(get_db)):
    """
    Exchange a refresh token for a new access token + rotated refresh token.

    Reuse of an already-rotated refresh token revokes the entire family — that
    signals the family is compromised (the attacker presented a stolen token
    that the legitimate client has already replaced).
    """
    token_hash = hash_refresh_token(body.refresh_token)
    row = await conn.fetchrow(
        """
        SELECT rt.*, u.token_version
        FROM refresh_tokens rt
        JOIN users u ON u.id = rt.user_id
        WHERE rt.token_hash = $1
        """,
        token_hash,
    )

    if row is None:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    now = datetime.now(timezone.utc)

    if row["revoked_at"] is not None:
        # Reuse detection: a previously-rotated token came back. Revoke the family.
        await conn.execute(
            """
            UPDATE refresh_tokens
            SET revoked_at = NOW()
            WHERE family_id = $1 AND revoked_at IS NULL
            """,
            row["family_id"],
        )
        logger.warning("Refresh-token reuse detected, family revoked: user_id=%s family_id=%s", row["user_id"], row["family_id"])
        raise HTTPException(status_code=401, detail="Refresh token reused; session revoked")

    if row["expires_at"] <= now:
        raise HTTPException(status_code=401, detail="Refresh token expired")

    # Rotate: mark old revoked, issue new with same family_id.
    new_plaintext, new_hash = generate_refresh_token()
    new_expires_at = now + timedelta(days=settings.refresh_token_expire_days)
    new_id = await conn.fetchval(
        """
        INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at, user_agent, ip)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
        """,
        row["user_id"],
        new_hash,
        row["family_id"],
        new_expires_at,
        request.headers.get("user-agent"),
        _client_ip(request),
    )
    await conn.execute(
        "UPDATE refresh_tokens SET revoked_at = NOW(), rotated_to = $1, last_used_at = NOW() WHERE id = $2",
        new_id,
        row["id"],
    )

    access_token, expires_in = create_access_token(str(row["user_id"]), int(row["token_version"]))
    return RefreshResponse(
        access_token=access_token,
        refresh_token=new_plaintext,
        access_token_expires_in=expires_in,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(body: LogoutRequest, conn=Depends(get_db)):
    """Revoke a single refresh token (this device). Idempotent — always returns 204."""
    token_hash = hash_refresh_token(body.refresh_token)
    await conn.execute(
        "UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL",
        token_hash,
    )


@router.post("/logout-all", status_code=status.HTTP_204_NO_CONTENT)
async def logout_all(current_user: dict = Depends(get_current_user), conn=Depends(get_db)):
    """Invalidate every session for the current user (all devices)."""
    async with conn.transaction():
        await conn.execute(
            "UPDATE users SET token_version = token_version + 1 WHERE id = $1",
            current_user["id"],
        )
        await conn.execute(
            "UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL",
            current_user["id"],
        )


@router.get("/me", response_model=UserResponse)
async def me(current_user: dict = Depends(get_current_user), conn=Depends(get_db)):
    row = await conn.fetchrow(
        """
        SELECT u.*, p.name AS parish_name, p.cover_photo_url AS parish_cover_photo_url,
               COALESCE(us.friend_count,0) AS friend_count,
               COALESCE(us.prayer_group_count,0) AS prayer_group_count,
               COALESCE(us.post_count,0) AS post_count
        FROM users u
        LEFT JOIN parishes p ON p.id = u.parish_id
        LEFT JOIN user_stats us ON us.id = u.id
        WHERE u.id = $1
        """,
        current_user["id"],
    )
    return _build_user_response(dict(row))
