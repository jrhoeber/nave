from typing import Literal, Optional

from pydantic import BaseModel, Field


class ReportCreate(BaseModel):
    content_type: Literal["post", "group_message", "comment"]
    content_id: str
    reason: Literal[
        "spam", "harassment", "hate_speech",
        "inappropriate", "misinformation", "other",
    ]
    notes: Optional[str] = Field(None, max_length=500)


class ReportDecision(BaseModel):
    decision: Literal["reviewed", "dismissed"]
    notes: Optional[str] = None
    remove_content: bool = False
