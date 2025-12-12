"""Planning Poker Session model"""

from datetime import datetime
from enum import Enum
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, Table, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class SessionStatus(str, Enum):
    """Session status enumeration"""

    ACTIVE = "active"
    CLOSED = "closed"
    PAUSED = "paused"


# Association table for many-to-many relationship (participants)
session_users = Table(
    "session_users",
    Base.metadata,
    Column("session_id", Integer, ForeignKey("sessions.id", ondelete="CASCADE"), primary_key=True),
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
)

# Association table for many-to-many relationship (estimators)
session_estimators = Table(
    "session_estimators",
    Base.metadata,
    Column("session_id", Integer, ForeignKey("sessions.id", ondelete="CASCADE"), primary_key=True),
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
)


class Session(Base):
    """Planning Poker session entity"""

    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    project_key = Column(String(50), nullable=True)  # Jira project key
    status = Column(String(20), default=SessionStatus.ACTIVE, nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    closed_at = Column(DateTime, nullable=True)

    # Relationships
    participants = relationship(
        "User",
        secondary=session_users,
        back_populates="sessions",
        cascade="all",
    )
    estimators = relationship(
        "User",
        secondary=session_estimators,
        backref="estimating_sessions",
        foreign_keys=[session_estimators.c.session_id, session_estimators.c.user_id],
        cascade="all",
    )
    issues = relationship("Issue", back_populates="session", cascade="all, delete-orphan")
    created_by = relationship("User", foreign_keys=[created_by_id])

    def __repr__(self) -> str:
        return f"<Session(id={self.id}, name='{self.name}', status='{self.status}')>"
