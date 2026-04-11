from pydantic import BaseModel


class FriendRequestCreate(BaseModel):
    addressee_id: str


class FriendRequestUpdate(BaseModel):
    status: str  # "accepted" or "rejected"
