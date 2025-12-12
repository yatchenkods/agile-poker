"""Issue (Jira task) model"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Float, Boolean
from sqlalchemy.orm import relationship

from app.database import Base


class Issue(Base):
    """Issue entity (Jira issue)"""

    __tablename__ = "issues"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False, index=True)
    jira_key = Column(String(50), nullable=False, index=True)  # e.g., PROJ-123
    jira_url = Column(String(512), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    story_points = Column(Integer, nullable=True)  # Final estimated story points
    story_points_before = Column(Integer, nullable=True)  # Previous story points
    is_estimated = Column(Boolean, default=False)  # Flag if final estimate was set
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    session = relationship("Session", back_populates="issues")
    estimates = relationship("Estimate", back_populates="issue", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Issue(id={self.id}, jira_key='{self.jira_key}', points={self.story_points})>"
