from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel

from app.models.user import UserResponse

PrayerGroupCategory = Literal[
    "bible_study", "mens_group", "womens_group",
    "young_adults", "families", "devotional", "general"
]


class PrayerGroupCreate(BaseModel):
    name: str
    description: str
    category: PrayerGroupCategory
    is_private: bool = False
    parish: Optional[str] = None
    diocese: Optional[str] = None
    meeting_schedule: Optional[str] = None
    avatar_url: Optional[str] = None


class PrayerGroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[PrayerGroupCategory] = None
    is_private: Optional[bool] = None
    parish: Optional[str] = None
    diocese: Optional[str] = None
    meeting_schedule: Optional[str] = None
    avatar_url: Optional[str] = None


class PrayerGroupResponse(BaseModel):
    id: str
    name: str
    description: str
    category: PrayerGroupCategory
    avatar_url: Optional[str] = None
    member_count: int = 0
    post_count: int = 0
    is_private: bool
    is_member: bool = False
    is_pending_approval: bool = False
    admin: UserResponse
    parish: Optional[str] = None
    diocese: Optional[str] = None
    meeting_schedule: Optional[str] = None
    created_at: datetime


class PrayerGroupsResponse(BaseModel):
    groups: list[PrayerGroupResponse]
    next_cursor: Optional[str] = None
