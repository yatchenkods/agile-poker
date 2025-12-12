"""Estimate schemas"""

from datetime import datetime
from pydantic import BaseModel, Field, field_validator


class EstimateCreate(BaseModel):
    """Estimate creation schema"""

    session_id: int
    issue_id: int
    story_points: int = Field(..., ge=0)  # Allow 0 for Joker
    user_id: int
    is_joker: bool = Field(default=False, description="True if user selected Joker (J) card")

    @field_validator('story_points')
    @classmethod
    def validate_story_points(cls, v, info):
        """Validate that story_points is valid based on is_joker flag"""
        is_joker = info.data.get('is_joker', False)
        
        if is_joker:
            # For Joker, story_points must be 0
            if v != 0:
                raise ValueError('story_points must be 0 when is_joker is True')
        else:
            # For normal estimates, story_points must be >= 1
            if v < 1:
                raise ValueError('story_points must be greater than or equal to 1')
        
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "session_id": 1,
                "issue_id": 1,
                "story_points": 8,
                "user_id": 1,
                "is_joker": False,
            }
        }


class EstimateResponse(BaseModel):
    """Estimate response schema"""

    id: int
    issue_id: int
    user_id: int
    story_points: int
    is_joker: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EstimateSummary(BaseModel):
    """Estimate summary for an issue"""

    issue_id: int
    total_estimates: int  # Total including Joker votes
    valid_estimates: int  # Only non-Joker estimates
    avg_points: float
    min_points: int
    max_points: int
    is_consensus: bool  # True if all non-Joker estimates within 2 points
    estimates: dict  # {user_id: {"points": int, "is_joker": bool}}
    joker_count: int  # Number of Joker votes
