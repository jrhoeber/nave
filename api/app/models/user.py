from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel


class FirebaseAuthRequest(BaseModel):
    id_token: str
    source: str = "app"  # "app" | "web"


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    username: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    parish_id: Optional[str] = None
    diocese: Optional[str] = None
    location: Optional[str] = None
    birthday: Optional[date] = None


class MutualFriendBrief(BaseModel):
    id: str
    display_name: str
    avatar_url: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    username: str
    display_name: str
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    parish_id: Optional[str] = None
    parish: Optional[str] = None   # parish name, joined from parishes table
    parish_city: Optional[str] = None
    parish_cover_photo_url: Optional[str] = None
    diocese: Optional[str] = None
    location: Optional[str] = None
    birthday: Optional[date] = None
    friend_count: int = 0
    prayer_group_count: int = 0
    created_at: datetime
    is_friend: bool = False
    is_pending_friend: bool = False
    # Populated only on GET /users/{id}
    mutual_friend_count: int = 0
    mutual_friends: list[MutualFriendBrief] = []
    shared_group_count: int = 0
    friendship_created_at: Optional[datetime] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    is_new_user: bool = False
    is_admin: bool = False
