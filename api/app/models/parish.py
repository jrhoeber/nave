from datetime import datetime
from typing import Optional

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
    member_count: int = 0
    created_at: datetime


class ParishesResponse(BaseModel):
    parishes: list[ParishResponse]
