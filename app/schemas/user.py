"""User schemas"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    """User creation schema"""

    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=8, max_length=100)


class UserUpdate(BaseModel):
    """User update schema"""

    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None


class UserResponse(BaseModel):
    """User response schema"""

    id: int
    email: str
    full_name: str
    is_active: bool
    is_admin: bool
    avatar_url: Optional[str]
    bio: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class UserStats(BaseModel):
    """User statistics"""

    user_id: int
    email: str
    full_name: str
    total_estimates: int
    avg_estimation_accuracy: float
    participated_sessions: int
