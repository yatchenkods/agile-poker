"""Jira integration routes"""

import logging
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import List

from app.services.jira_service import JiraService

logger = logging.getLogger(__name__)
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


class ConnectionTestResponse(BaseModel):
    """Connection test response schema"""
    status: str
    message: str
    configured: bool
    connected: bool
    details: dict = {}


@router.get("/test-connection", response_model=ConnectionTestResponse)
async def test_jira_connection():
    """
    Test Jira connection and configuration
    
    Returns:
        Connection status and diagnostic information
    """
    try:
        # Check configuration
        configured = bool(
            jira_service.jira_url and 
            jira_service.jira_username and 
            jira_service.jira_api_token
        )
        
        if not configured:
            return ConnectionTestResponse(
                status="error",
                message="Jira not configured. Please set JIRA_BASE_URL, JIRA_USERNAME, and JIRA_API_TOKEN environment variables.",
                configured=False,
                connected=False,
                details={
                    "jira_url_set": bool(jira_service.jira_url),
                    "jira_username_set": bool(jira_service.jira_username),
                    "jira_api_token_set": bool(jira_service.jira_api_token),
                }
            )
        
        # Test connection
        is_connected = jira_service.validate_connection()
        
        if is_connected:
            return ConnectionTestResponse(
                status="success",
                message="Successfully connected to Jira!",
                configured=True,
                connected=True,
                details={
                    "jira_url": jira_service.jira_url,
                    "jira_username": jira_service.jira_username,
                }
            )
        else:
            return ConnectionTestResponse(
                status="error",
                message="Failed to connect to Jira. Please check your credentials and URL.",
                configured=True,
                connected=False,
                details={
                    "jira_url": jira_service.jira_url,
                    "jira_username": jira_service.jira_username,
                    "possible_issues": [
                        "Invalid API token or password",
                        "Incorrect Jira URL",
                        "User doesn't have API access",
                        "Jira instance is unreachable",
                    ]
                }
            )
    
    except Exception as e:
        logger.error(f"Error testing Jira connection: {e}", exc_info=True)
        return ConnectionTestResponse(
            status="error",
            message=f"Error testing Jira connection: {str(e)}",
            configured=False,
            connected=False,
            details={"error": str(e)}
        )


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
    logger.info(f"Received import request for project {request.project_key}, sprint {request.sprint_name}")
    
    # Validate input
    if not request.project_key or not request.sprint_name:
        logger.warning("Missing required parameters: project_key or sprint_name")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both project_key and sprint_name are required",
        )

    # Check Jira connection
    logger.info("Validating Jira connection")
    if not jira_service.validate_connection():
        logger.error("Jira connection validation failed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cannot connect to Jira. Please check Jira configuration (JIRA_BASE_URL, JIRA_USERNAME, JIRA_API_TOKEN). Use /jira/test-connection to diagnose.",
        )

    try:
        # Get issues from sprint
        logger.info(f"Importing issues from sprint: project={request.project_key}, sprint={request.sprint_name}")
        issues = jira_service.get_sprint_issues(
            request.project_key.upper(),
            request.sprint_name
        )

        if not issues:
            logger.warning(f"No issues found in sprint '{request.sprint_name}' for project '{request.project_key}'")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No issues found in sprint '{request.sprint_name}' for project '{request.project_key}'. Please check the project key and sprint name. Use /jira/test-connection to verify Jira connection.",
            )

        logger.info(f"Successfully imported {len(issues)} issues")
        return ImportSprintResponse(
            status="success",
            issues=issues,
            count=len(issues)
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error importing sprint: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error importing sprint: {str(e)}",
        )
