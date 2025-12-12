"""Session schemas"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.user import UserResponse
from app.schemas.issue import IssueResponse


class SessionCreate(BaseModel):
    """Session creation schema"""

    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    project_key: Optional[str] = None


class SessionUpdate(BaseModel):
    """Session update schema"""

    name: Optional[str] = None
    description: Optional[str] = None


class SessionResponse(BaseModel):
    """Session response schema"""

    id: int
    name: str
    description: Optional[str]
    project_key: Optional[str]
    status: str
    created_by_id: int
    created_at: datetime
    updated_at: datetime
    closed_at: Optional[datetime]
    participant_count: int = 0
    issue_count: int = 0
    estimator_count: int = 0

    class Config:
        from_attributes = True


class SessionDetailResponse(SessionResponse):
    """Detailed session with participants, estimators and issues"""

    participants: List[UserResponse] = []
    estimators: List[UserResponse] = []
    issues: List[IssueResponse] = []
