from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel


class ParishResponse(BaseModel):
    id: str
    name: str
    street_address: Optional[str] = None
    city: str
    state: str
    postal_code: Optional[str] = None
    diocese: str
    established: Optional[int] = None
    avatar_url: Optional[str] = None
    cover_photo_url: Optional[str] = None
    mass_schedule: Optional[list[Any]] = None
    member_count: int = 0
    created_at: datetime


class ParishesResponse(BaseModel):
    parishes: list[ParishResponse]


ParishPostStatus = Literal["Pending", "Posted", "Deleted", "Rejected"]


class ParishPostAuthor(BaseModel):
    id: str
    username: str
    display_name: str
    avatar_url: Optional[str] = None


class ParishPostCreate(BaseModel):
    content: str


class ParishPostUpdate(BaseModel):
    content: str


class ParishPostResponse(BaseModel):
    id: str
    parish_id: str
    author: ParishPostAuthor
    content: str
    status: ParishPostStatus
    created_at: datetime
    reactions: dict[str, int] = {}
    user_reactions: list[str] = []


class ParishPostsResponse(BaseModel):
    posts: list[ParishPostResponse]
    next_cursor: Optional[str] = None


class ReactionResponse(BaseModel):
    reactions: dict[str, int]
    user_reactions: list[str]
