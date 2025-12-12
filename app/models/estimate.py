"""User estimate model"""

from datetime import datetime
from sqlalchemy import Column, Integer, DateTime, ForeignKey, UniqueConstraint, Boolean
from sqlalchemy.orm import relationship

from app.database import Base


class Estimate(Base):
    """User estimate for an issue"""

    __tablename__ = "estimates"
    __table_args__ = (
        UniqueConstraint("issue_id", "user_id", name="uq_issue_user_estimate"),
    )

    id = Column(Integer, primary_key=True, index=True)
    issue_id = Column(Integer, ForeignKey("issues.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    story_points = Column(Integer, nullable=False)  # 1, 2, 4, 8, 16
    is_joker = Column(Boolean, default=False, nullable=False)  # True if Joker card (J)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    issue = relationship("Issue", back_populates="estimates")
    user = relationship("User", back_populates="estimates")

    def __repr__(self) -> str:
        if self.is_joker:
            return f"<Estimate(id={self.id}, issue_id={self.issue_id}, user_id={self.user_id}, joker=True)>"
        return f"<Estimate(id={self.id}, issue_id={self.issue_id}, user_id={self.user_id}, points={self.story_points})>"
