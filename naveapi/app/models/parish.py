from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ParishResponse(BaseModel):
    id: str
    name: str
    city: str
    state: str
    diocese: str
    avatar_url: Optional[str] = None
    member_count: int = 0
    created_at: datetime


class ParishesResponse(BaseModel):
    parishes: list[ParishResponse]
