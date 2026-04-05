from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator


class UserSignUp(BaseModel):
    username: str
    display_name: str
    email: EmailStr
    password: str
    parish_id: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("username")
    @classmethod
    def username_format(cls, v: str) -> str:
        if not v.replace("_", "").replace(".", "").isalnum():
            raise ValueError("Username may only contain letters, numbers, underscores, and dots")
        return v.lower()


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    parish_id: Optional[str] = None
    diocese: Optional[str] = None
    location: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    username: str
    display_name: str
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    parish_id: Optional[str] = None
    parish: Optional[str] = None   # parish name, joined from parishes table
    diocese: Optional[str] = None
    location: Optional[str] = None
    friend_count: int = 0
    prayer_group_count: int = 0
    post_count: int = 0
    created_at: datetime
    is_friend: Optional[bool] = None
    is_pending_friend: Optional[bool] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
