from datetime import datetime
from typing import Literal, Optional

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
    mass_schedule: Optional[str] = None
    website: Optional[str] = None
    member_count: int = 0
    group_count: int = 0
    is_parish_admin: bool = False
    created_at: datetime


class ParishesResponse(BaseModel):
    parishes: list[ParishResponse]


class ParishUpdate(BaseModel):
    website: Optional[str] = None
    mass_schedule: Optional[str] = None
    cover_photo_url: Optional[str] = None


ParishPostStatus = Literal["Pending", "Posted", "Deleted", "Rejected"]


class ParishPostAuthor(BaseModel):
    id: str
    username: str
    display_name: str
    avatar_url: Optional[str] = None


class ParishPostCreate(BaseModel):
    content: str
    is_announcement: bool = False


class ParishPostUpdate(BaseModel):
    content: str


class ParishPostResponse(BaseModel):
    id: str
    parish_id: str
    author: ParishPostAuthor
    content: str
    status: ParishPostStatus
    is_announcement: bool = False
    created_at: datetime
    reactions: dict[str, int] = {}
    user_reactions: list[str] = []
    comment_count: int = 0


class ParishPostsResponse(BaseModel):
    posts: list[ParishPostResponse]
    next_cursor: Optional[str] = None


class ReactionResponse(BaseModel):
    reactions: dict[str, int]
    user_reactions: list[str]


# ─── Comments ──────────────────────────────────────────────────────────────────

class ParishCommentCreate(BaseModel):
    content: str
    reply_to_id: Optional[str] = None


class ParishCommentUpdate(BaseModel):
    content: str


class ParishCommentResponse(BaseModel):
    id: str
    post_id: str
    author: ParishPostAuthor
    content: str
    status: ParishPostStatus
    reply_to_id: Optional[str] = None
    reply_to_author: Optional[ParishPostAuthor] = None
    created_at: datetime
    updated_at: datetime
    reactions: dict[str, int] = {}
    user_reactions: list[str] = []


class ParishCommentsResponse(BaseModel):
    comments: list[ParishCommentResponse]
    total_count: int
    next_cursor: Optional[str] = None
