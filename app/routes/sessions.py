"""Planning Poker session routes"""

import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.session import SessionCreate, SessionResponse, SessionDetailResponse, SessionUpdate
from app.services.session_service import SessionService
from app.services.jira_service import JiraService
from app.services.issue_service import IssueService
from app.utils.security import get_current_user
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter()
session_service = SessionService()
jira_service = JiraService()
issue_service = IssueService()


class ImportIssuesRequest(BaseModel):
    """Request schema for importing issues to a session"""
    issue_keys: List[str]

    class Config:
        json_schema_extra = {
            "example": {
                "issue_keys": ["DEVOPS-123", "DEVOPS-456"]
            }
        }


class FailedIssue(BaseModel):
    """Failed import issue info"""
    key: str
    reason: str
    details: str = ""


class ImportIssuesResponse(BaseModel):
    """Response for importing issues"""
    status: str
    imported_count: int
    failed_count: int
    message: str
    failed_issues: List[FailedIssue] = []


@router.post("/", response_model=SessionResponse)
async def create_session(
    session_data: SessionCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new Planning Poker session"""
    session = session_service.create_session(db, session_data, current_user.id)
    return session


@router.get("/", response_model=List[SessionResponse])
async def list_sessions(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    """List all sessions"""
    sessions = session_service.get_sessions(db, skip=skip, limit=limit)
    return sessions


@router.get("/{session_id}", response_model=SessionDetailResponse)
async def get_session(session_id: int, db: Session = Depends(get_db)):
    """Get session details with participants and issues"""
    session = session_service.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return session


@router.put("/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: int,
    session_data: SessionUpdate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update session details (name, description, project_key)"""
    session = session_service.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    
    if session.created_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only session creator can update",
        )
    
    updated_session = session_service.update_session(db, session_id, session_data)
    return updated_session


@router.delete("/{session_id}")
async def delete_session(
    session_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Delete a session and all its associated data
    
    Only the session creator can delete the session.
    Deletes all issues, estimates, and participants associated with the session.
    """
    session = session_service.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    
    if session.created_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only session creator can delete",
        )
    
    try:
        logger.info(f"Deleting session {session_id}")
        
        # Delete all issues associated with the session
        from app.models.issue import Issue
        db.query(Issue).filter(Issue.session_id == session_id).delete()
        
        # Delete the session itself
        db.delete(session)
        db.commit()
        
        logger.info(f"Session {session_id} deleted successfully")
        return {"message": "Session deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting session {session_id}: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting session",
        )


@router.post("/{session_id}/import-issues", response_model=ImportIssuesResponse)
async def import_issues_to_session(
    session_id: int,
    request: ImportIssuesRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Import issues from Jira and add them to the session

    Args:
        session_id: Session ID
        issue_keys: List of Jira issue keys (e.g., ['DEVOPS-123'])

    Returns:
        Status of import with counts and detailed error info
    """
    # Verify session exists and user is creator
    session = session_service.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    
    if session.created_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only session creator can add issues",
        )

    # Validate input
    if not request.issue_keys or len(request.issue_keys) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one issue key is required",
        )

    logger.info(f"Import request for session {session_id}: {request.issue_keys}")

    # Check Jira connection
    if not jira_service.validate_connection():
        logger.error("Jira connection validation failed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cannot connect to Jira. Please check configuration.",
        )

    try:
        logger.info(f"Importing {len(request.issue_keys)} issues to session {session_id}")
        
        # Fetch issues from Jira
        logger.debug(f"Calling jira_service.get_issues_by_keys with keys: {request.issue_keys}")
        successful_issues, failed_issues = jira_service.get_issues_by_keys(request.issue_keys)
        
        logger.info(
            f"JiraService returned {len(successful_issues)} successful, "
            f"{len(failed_issues)} failed issues"
        )
        
        # Add successful issues to session
        from app.models.issue import Issue
        
        imported_count = 0
        processed_keys = set()
        
        for jira_issue in successful_issues:
            try:
                issue_key = jira_issue.get("key", "").upper().strip()
                
                if not issue_key:
                    logger.warning(f"Issue has no key: {jira_issue}")
                    failed_issues.append({
                        "key": "UNKNOWN",
                        "reason": "Missing issue key",
                        "details": "The fetched issue has no key field"
                    })
                    continue
                
                if issue_key in processed_keys:
                    logger.debug(f"Issue {issue_key} already processed in this import")
                    continue
                    
                processed_keys.add(issue_key)
                
                # Check if issue already exists in this session
                existing_issue = db.query(Issue).filter(
                    Issue.session_id == session_id,
                    Issue.jira_key == issue_key
                ).first()
                
                if existing_issue:
                    logger.debug(f"Issue {issue_key} already exists in session {session_id}")
                    imported_count += 1
                    continue
                
                # Validate issue data
                title = jira_issue.get("title", "").strip()
                if not title:
                    logger.warning(f"Issue {issue_key} has no title")
                    failed_issues.append({
                        "key": issue_key,
                        "reason": "Missing issue title",
                        "details": "The issue has no summary/title"
                    })
                    continue
                
                # Create new issue
                new_issue = Issue(
                    session_id=session_id,
                    jira_key=issue_key,
                    title=title,
                    description=jira_issue.get("description", ""),
                    issue_type=jira_issue.get("issue_type", ""),
                )
                db.add(new_issue)
                db.flush()
                imported_count += 1
                logger.info(f"Added issue {issue_key} (ID: {new_issue.id}) to session {session_id}")
                
            except Exception as e:
                logger.error(
                    f"Error adding issue {jira_issue.get('key', 'UNKNOWN')}: {e}",
                    exc_info=True
                )
                failed_issues.append({
                    "key": jira_issue.get("key", "UNKNOWN"),
                    "reason": "Database error",
                    "details": str(e)[:100]
                })
                continue
        
        db.commit()
        logger.info(
            f"Successfully imported {imported_count} issue(s) to session {session_id}, "
            f"{len(failed_issues)} failed"
        )
        
        # Build failed issues response
        failed_issues_response = [
            FailedIssue(
                key=issue["key"],
                reason=issue.get("reason", "Unknown error"),
                details=issue.get("details", "")
            )
            for issue in failed_issues
        ]
        
        return ImportIssuesResponse(
            status="success" if imported_count > 0 else "partial" if len(failed_issues) > 0 else "error",
            imported_count=imported_count,
            failed_count=len(failed_issues),
            message=f"Imported {imported_count} issue(s)" + 
                   (f" ({len(failed_issues)} failed)" if failed_issues else ""),
            failed_issues=failed_issues_response
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error importing issues to session {session_id}: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error importing issues: {str(e)}",
        )


@router.delete("/{session_id}/issues/{issue_id}")
async def remove_issue_from_session(
    session_id: int,
    issue_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Remove an issue from a session

    Args:
        session_id: Session ID
        issue_id: Issue ID to remove

    Returns:
        Success message
    """
    # Verify session exists and user is creator
    session = session_service.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    
    if session.created_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only session creator can remove issues",
        )

    # Verify issue exists
    issue = issue_service.get_issue(db, issue_id)
    if not issue or issue.session_id != session_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found in this session")

    try:
        logger.info(f"Removing issue {issue_id} from session {session_id}")
        db.delete(issue)
        db.commit()
        return {"message": "Issue removed successfully"}
    except Exception as e:
        logger.error(f"Error removing issue: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error removing issue",
        )


@router.post("/{session_id}/close", response_model=SessionResponse)
async def close_session(
    session_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Close a session"""
    session = session_service.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    
    if session.created_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only session creator can close",
        )
    
    closed_session = session_service.close_session(db, session_id)
    return closed_session


@router.post("/{session_id}/users/{user_id}")
async def add_user_to_session(
    session_id: int,
    user_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add user to session"""
    session = session_service.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    
    session_service.add_user_to_session(db, session_id, user_id)
    return {"message": "User added to session"}


@router.delete("/{session_id}/users/{user_id}")
async def remove_user_from_session(
    session_id: int,
    user_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove user from session"""
    session = session_service.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    
    session_service.remove_user_from_session(db, session_id, user_id)
    return {"message": "User removed from session"}
