from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator


class GroupMessageAuthor(BaseModel):
    id: str
    username: str
    display_name: str
    avatar_url: Optional[str] = None


class MessageReactionSummary(BaseModel):
    emoji: str
    count: int
    user_reacted: bool


class GroupMessageCreate(BaseModel):
    content: str

    @field_validator("content")
    @classmethod
    def content_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Message content cannot be empty")
        if len(v) > 2000:
            raise ValueError("Message content cannot exceed 2000 characters")
        return v


class GroupMessageResponse(BaseModel):
    id: str
    group_id: str
    author: GroupMessageAuthor
    content: str
    reactions: list[MessageReactionSummary] = []
    created_at: datetime


class GroupMessagesResponse(BaseModel):
    messages: list[GroupMessageResponse]
    next_cursor: Optional[str] = None


class AddReactionBody(BaseModel):
    emoji: str

    @field_validator("emoji")
    @classmethod
    def valid_emoji(cls, v: str) -> str:
        allowed = {"👍", "🙏", "❤️", "😂", "😮", "🥲"}
        if v not in allowed:
            raise ValueError(f"Emoji must be one of: {', '.join(sorted(allowed))}")
        return v
