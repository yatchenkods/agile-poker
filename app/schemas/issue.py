"""Issue schemas"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class IssueCreate(BaseModel):
    """Issue creation schema"""

    session_id: int
    jira_key: str = Field(..., max_length=50)
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    jira_url: Optional[str] = None


class IssueResponse(BaseModel):
    """Issue response schema"""

    id: int
    session_id: int
    jira_key: str
    title: str
    description: Optional[str]
    story_points: Optional[int]
    story_points_before: Optional[int]
    is_estimated: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class JiraIssueImport(BaseModel):
    """Jira issue import schema"""

    project_key: str
    query: Optional[str] = None  # JQL query for filtering
    max_results: int = Field(default=50, ge=1, le=100)
