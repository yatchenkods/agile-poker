"""Estimate schemas"""

from datetime import datetime
from pydantic import BaseModel, Field


class EstimateCreate(BaseModel):
    """Estimate creation schema"""

    session_id: int
    issue_id: int
    story_points: int = Field(..., ge=1)
    user_id: int

    class Config:
        json_schema_extra = {
            "example": {
                "session_id": 1,
                "issue_id": 1,
                "story_points": 8,
                "user_id": 1,
            }
        }


class EstimateResponse(BaseModel):
    """Estimate response schema"""

    id: int
    issue_id: int
    user_id: int
    story_points: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EstimateSummary(BaseModel):
    """Estimate summary for an issue"""

    issue_id: int
    total_estimates: int
    avg_points: float
    min_points: int
    max_points: int
    is_consensus: bool  # True if all within 2 points
    estimates: dict  # {user_id: story_points}
