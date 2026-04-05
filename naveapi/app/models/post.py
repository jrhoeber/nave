from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel

from app.models.user import UserResponse

PostType = Literal["general", "prayer_request", "testimony", "event", "scripture"]


class PrayerGroupBrief(BaseModel):
    id: str
    name: str
    avatar_url: Optional[str] = None


class PostCreate(BaseModel):
    type: PostType
    content: str
    image_url: Optional[str] = None
    prayer_group_id: Optional[str] = None


class PostResponse(BaseModel):
    id: str
    author: UserResponse
    type: PostType
    content: str
    image_url: Optional[str] = None
    like_count: int = 0
    comment_count: int = 0
    prayer_count: int = 0
    is_liked: bool = False
    is_praying: bool = False
    created_at: datetime
    prayer_group: Optional[PrayerGroupBrief] = None


class CommentCreate(BaseModel):
    content: str


class CommentUpdate(BaseModel):
    content: str


class CommentResponse(BaseModel):
    id: str
    author: UserResponse
    content: str
    like_count: int = 0
    is_liked: bool = False
    created_at: datetime


class FeedResponse(BaseModel):
    posts: list[PostResponse]
    next_cursor: Optional[str] = None


class CommentsResponse(BaseModel):
    comments: list[CommentResponse]
    next_cursor: Optional[str] = None
