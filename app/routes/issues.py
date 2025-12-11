"""Issue routes"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.issue import IssueCreate, IssueResponse, JiraIssueImport
from app.services.issue_service import IssueService
from app.services.jira_service import JiraService
from app.utils.security import get_current_user

router = APIRouter()
issue_service = IssueService()
jira_service = JiraService()


@router.post("/", response_model=IssueResponse)
async def create_issue(
    issue_data: IssueCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new issue"""
    issue = issue_service.create_issue(db, issue_data)
    return issue


@router.get("/", response_model=List[IssueResponse])
async def list_issues(
    session_id: int = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """List issues with optional filtering"""
    issues = issue_service.get_issues(db, session_id=session_id, skip=skip, limit=limit)
    return issues


@router.get("/{issue_id}", response_model=IssueResponse)
async def get_issue(issue_id: int, db: Session = Depends(get_db)):
    """Get issue details"""
    issue = issue_service.get_issue(db, issue_id)
    if not issue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")
    return issue


@router.post("/sync-jira")
async def sync_jira_issues(
    import_data: JiraIssueImport,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Sync issues from Jira"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can sync Jira issues",
        )
    
    try:
        issues = await jira_service.import_issues(db, import_data)
        return {"imported": len(issues), "issues": issues}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to sync Jira issues: {str(e)}",
        )
