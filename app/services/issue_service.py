"""Issue service business logic"""

from sqlalchemy.orm import Session
from app.models.issue import Issue
from app.schemas.issue import IssueCreate


class IssueService:
    """Issue business logic"""

    @staticmethod
    def create_issue(db: Session, issue_data: IssueCreate) -> Issue:
        """Create a new issue"""
        db_issue = Issue(**issue_data.dict())
        db.add(db_issue)
        db.commit()
        db.refresh(db_issue)
        return db_issue

    @staticmethod
    def get_issue(db: Session, issue_id: int) -> Issue:
        """Get issue by ID"""
        return db.query(Issue).filter(Issue.id == issue_id).first()

    @staticmethod
    def get_issues(
        db: Session,
        session_id: int = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[Issue]:
        """Get list of issues"""
        query = db.query(Issue)
        
        if session_id:
            query = query.filter(Issue.session_id == session_id)
        
        return query.offset(skip).limit(limit).all()

    @staticmethod
    def get_issue_by_jira_key(db: Session, jira_key: str) -> Issue:
        """Get issue by Jira key"""
        return db.query(Issue).filter(Issue.jira_key == jira_key).first()
