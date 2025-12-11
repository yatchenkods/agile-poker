#!/usr/bin/env python
"""Seed database with example data"""

from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.session import Session as SessionModel
from app.models.issue import Issue
from app.utils.security import hash_password


def seed_database():
    """Seed database with example data"""
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    try:
        # Create users
        users = [
            User(
                email="alice@example.com",
                full_name="Alice Developer",
                hashed_password=hash_password("password123"),
            ),
            User(
                email="bob@example.com",
                full_name="Bob Developer",
                hashed_password=hash_password("password123"),
            ),
            User(
                email="charlie@example.com",
                full_name="Charlie Developer",
                hashed_password=hash_password("password123"),
            ),
        ]
        db.add_all(users)
        db.commit()
        print("Created users")
        
        # Create session
        session = SessionModel(
            name="Sprint 45 Planning",
            description="Q4 2024 Sprint Planning",
            project_key="PROJ",
            created_by_id=users[0].id,
        )
        session.participants = users
        db.add(session)
        db.commit()
        print("Created session")
        
        # Create issues
        issues = [
            Issue(
                session_id=session.id,
                jira_key="PROJ-123",
                title="Implement user authentication",
                description="Add JWT-based authentication",
            ),
            Issue(
                session_id=session.id,
                jira_key="PROJ-124",
                title="Add email notifications",
                description="Send email notifications for important events",
            ),
            Issue(
                session_id=session.id,
                jira_key="PROJ-125",
                title="Improve UI responsiveness",
                description="Make the UI more responsive on mobile devices",
            ),
        ]
        db.add_all(issues)
        db.commit()
        print("Created issues")
        
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
