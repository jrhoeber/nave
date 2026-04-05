from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel

from app.models.user import UserResponse

NotificationType = Literal[
    "friend_request", "friend_accepted",
    "post_like", "post_comment",
    "prayer_group_invite", "prayer_group_post",
    "prayer_received",
]


class NotificationResponse(BaseModel):
    id: str
    type: NotificationType
    actor: UserResponse
    message: str
    is_read: bool
    target_id: Optional[str] = None
    created_at: datetime


class NotificationsResponse(BaseModel):
    notifications: list[NotificationResponse]
    unread_count: int
    next_cursor: Optional[str] = None


class MarkReadRequest(BaseModel):
    notification_ids: Optional[list[str]] = None
    all: bool = False
