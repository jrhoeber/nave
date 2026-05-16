from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator


class GroupMessageAuthor(BaseModel):
    id: str
    username: str
    display_name: str
    avatar_url: Optional[str] = None


class GroupMessageCreate(BaseModel):
    content: Optional[str] = None
    image_id: Optional[str] = None

    @field_validator("content")
    @classmethod
    def content_not_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                return None
            if len(v) > 2000:
                raise ValueError("Message content cannot exceed 2000 characters")
        return v

    def model_post_init(self, __context: object) -> None:
        if self.content is None and self.image_id is None:
            raise ValueError("A message must have content or an image")


class GroupMessageResponse(BaseModel):
    id: str
    group_id: str
    author: GroupMessageAuthor
    content: Optional[str] = None
    image_url: Optional[str] = None
    reaction_count: int = 0
    user_reacted: bool = False
    created_at: datetime


class GroupMessagesResponse(BaseModel):
    messages: list[GroupMessageResponse]
    next_cursor: Optional[str] = None


class ReactionToggleResponse(BaseModel):
    reaction_count: int
    user_reacted: bool
