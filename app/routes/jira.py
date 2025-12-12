"""Jira integration routes"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import List

from app.services.jira_service import JiraService

router = APIRouter()
jira_service = JiraService()


class ImportSprintRequest(BaseModel):
    """Import sprint request schema"""
    project_key: str
    sprint_name: str

    class Config:
        json_schema_extra = {
            "example": {
                "project_key": "PROJ",
                "sprint_name": "Sprint 1",
            }
        }


class Issue(BaseModel):
    """Issue schema"""
    key: str
    title: str
    description: str = ""
    issue_type: str = ""


class ImportSprintResponse(BaseModel):
    """Import sprint response schema"""
    status: str
    issues: List[Issue]
    count: int


@router.post("/import-sprint", response_model=ImportSprintResponse)
async def import_sprint(request: ImportSprintRequest):
    """
    Import issues from a Jira sprint

    Query Parameters:
    - project_key: Jira project key (e.g., 'PROJ')
    - sprint_name: Sprint name (e.g., 'Sprint 1')

    Returns:
        List of issues from the sprint
    """
    # Validate input
    if not request.project_key or not request.sprint_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both project_key and sprint_name are required",
        )

    # Check Jira connection
    if not jira_service.validate_connection():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cannot connect to Jira. Please check Jira configuration (JIRA_URL, JIRA_USERNAME, JIRA_API_TOKEN)",
        )

    try:
        # Get issues from sprint
        issues = jira_service.get_sprint_issues(
            request.project_key.upper(),
            request.sprint_name
        )

        if not issues:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No issues found in sprint '{request.sprint_name}' for project '{request.project_key}'. Please check the project key and sprint name.",
            )

        return ImportSprintResponse(
            status="success",
            issues=issues,
            count=len(issues)
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error importing sprint: {str(e)}",
        )
