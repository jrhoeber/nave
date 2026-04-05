from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import create_access_token, hash_password, verify_password
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import TokenResponse, UserResponse, UserLogin, UserSignUp

router = APIRouter()


def _build_user_response(row: dict) -> UserResponse:
    return UserResponse(
        id=str(row["id"]),
        username=row["username"],
        display_name=row["display_name"],
        bio=row.get("bio"),
        avatar_url=row.get("avatar_url"),
        parish=row.get("parish"),
        diocese=row.get("diocese"),
        location=row.get("location"),
        friend_count=row.get("friend_count", 0),
        prayer_group_count=row.get("prayer_group_count", 0),
        post_count=row.get("post_count", 0),
        created_at=row["created_at"],
    )


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(body: UserSignUp, conn=Depends(get_db)):
    existing = await conn.fetchrow(
        "SELECT id FROM users WHERE email = $1 OR username = $2",
        body.email,
        body.username,
    )
    if existing:
        raise HTTPException(status_code=409, detail="Email or username already in use")

    row = await conn.fetchrow(
        """
        INSERT INTO users (username, display_name, email, password_hash, parish)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        """,
        body.username,
        body.display_name,
        body.email,
        hash_password(body.password),
        body.parish,
    )
    user_dict = dict(row)
    user_dict.update({"friend_count": 0, "prayer_group_count": 0, "post_count": 0})
    token = create_access_token(str(row["id"]))
    return TokenResponse(access_token=token, user=_build_user_response(user_dict))


@router.post("/login", response_model=TokenResponse)
async def login(body: UserLogin, conn=Depends(get_db)):
    row = await conn.fetchrow(
        """
        SELECT u.*, COALESCE(us.friend_count,0) AS friend_count,
               COALESCE(us.prayer_group_count,0) AS prayer_group_count,
               COALESCE(us.post_count,0) AS post_count
        FROM users u
        LEFT JOIN user_stats us ON us.id = u.id
        WHERE u.email = $1
        """,
        body.email,
    )
    if row is None or not verify_password(body.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(str(row["id"]))
    return TokenResponse(access_token=token, user=_build_user_response(dict(row)))


@router.get("/me", response_model=UserResponse)
async def me(current_user: dict = Depends(get_current_user), conn=Depends(get_db)):
    row = await conn.fetchrow(
        """
        SELECT u.*, COALESCE(us.friend_count,0) AS friend_count,
               COALESCE(us.prayer_group_count,0) AS prayer_group_count,
               COALESCE(us.post_count,0) AS post_count
        FROM users u
        LEFT JOIN user_stats us ON us.id = u.id
        WHERE u.id = $1
        """,
        current_user["id"],
    )
    return _build_user_response(dict(row))
