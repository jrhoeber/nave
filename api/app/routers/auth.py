import re
import random
import string
import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import create_access_token
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import FirebaseAuthRequest, TokenResponse, UserResponse
from app.utils.firebase import verify_firebase_token
from app.utils.storage import get_avatar_signed_url

router = APIRouter()
logger = logging.getLogger("nave.auth")

_GCS_PATH_PREFIX = "avatars/"


def _resolve_avatar_url(raw: str | None) -> str | None:
    if raw and raw.startswith(_GCS_PATH_PREFIX):
        return get_avatar_signed_url(raw)
    return raw


def _build_user_response(row: dict) -> UserResponse:
    return UserResponse(
        id=str(row["id"]),
        username=row["username"],
        display_name=row["display_name"],
        bio=row.get("bio"),
        avatar_url=_resolve_avatar_url(row.get("avatar_url")),
        parish_id=str(row["parish_id"]) if row.get("parish_id") else None,
        parish=row.get("parish_name"),
        diocese=row.get("diocese"),
        location=row.get("location"),
        birthday=row.get("birthday"),
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


@router.post("/firebase", response_model=TokenResponse, status_code=status.HTTP_200_OK)
async def firebase_auth(body: FirebaseAuthRequest, conn=Depends(get_db)):
    """
    Exchange a Firebase ID token for an app JWT.
    Creates the user if they don't exist yet.
    """
    try:
        claims = verify_firebase_token(body.id_token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    firebase_uid: str = claims["uid"]
    email: str | None = claims.get("email")
    firebase_display_name: str = claims.get("name") or (email.split("@")[0] if email else "user")
    firebase_avatar: str | None = claims.get("picture")

    # Try to find existing user by firebase_uid
    row = await conn.fetchrow(
        """
        SELECT u.*, p.name AS parish_name,
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

    if row is None and email:
        # Try to link an existing account by email (migration path)
        row = await conn.fetchrow(
            """
            SELECT u.*, p.name AS parish_name,
                   COALESCE(us.friend_count,0) AS friend_count,
                   COALESCE(us.prayer_group_count,0) AS prayer_group_count,
                   COALESCE(us.post_count,0) AS post_count
            FROM users u
            LEFT JOIN parishes p ON p.id = u.parish_id
            LEFT JOIN user_stats us ON us.id = u.id
            WHERE u.email = $1
            """,
            email,
        )
        if row is not None:
            # Link firebase_uid to existing account
            await conn.execute(
                "UPDATE users SET firebase_uid = $1, updated_at = NOW() WHERE id = $2",
                firebase_uid,
                row["id"],
            )
            row = dict(row)
            row["firebase_uid"] = firebase_uid

    if row is None and body.source == "web":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No account found. Download the Nave app to create an account.",
        )

    if row is None:
        # Create new user
        is_new_user = True
        username = await _find_unique_username(conn, firebase_display_name)
        avatar_url = firebase_avatar if firebase_avatar and firebase_avatar.startswith("http") else None

        row = await conn.fetchrow(
            """
            INSERT INTO users (firebase_uid, username, display_name, email, avatar_url)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            """,
            firebase_uid,
            username,
            firebase_display_name,
            email,
            avatar_url,
        )
        row = dict(row)
        row.update({"friend_count": 0, "prayer_group_count": 0, "post_count": 0, "parish_name": None})

    token = create_access_token(str(row["id"]))
    is_admin = bool(await conn.fetchval(
        "SELECT 1 FROM app_admins WHERE user_id = $1", row["id"]
    ))
    return TokenResponse(
        access_token=token,
        user=_build_user_response(dict(row)),
        is_new_user=is_new_user,
        is_admin=is_admin,
    )


@router.get("/me", response_model=UserResponse)
async def me(current_user: dict = Depends(get_current_user), conn=Depends(get_db)):
    row = await conn.fetchrow(
        """
        SELECT u.*, p.name AS parish_name,
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
