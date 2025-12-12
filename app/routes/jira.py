"""Jira integration routes"""

import logging
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import List

from app.services.jira_service import JiraService

logger = logging.getLogger(__name__)
router = APIRouter()
jira_service = JiraService()


class ImportByKeysRequest(BaseModel):
    """Import issues by keys request schema"""
    issue_keys: List[str]

    class Config:
        json_schema_extra = {
            "example": {
                "issue_keys": ["DEVOPS-123", "DEVOPS-456", "DEVOPS-789"],
            }
        }


class Issue(BaseModel):
    """Issue schema"""
    key: str
    title: str
    description: str = ""
    issue_type: str = ""


class ImportByKeysResponse(BaseModel):
    """Import by keys response schema"""
    status: str
    issues: List[Issue]
    count: int
    failed_count: int = 0
    failed_keys: List[str] = []


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
                message="Jira not configured. Please set JIRA_URL, JIRA_USERNAME, and JIRA_API_TOKEN environment variables.",
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


@router.post("/import-by-keys", response_model=ImportByKeysResponse)
async def import_issues_by_keys(request: ImportByKeysRequest):
    """
    Import issues from Jira by their keys

    Args:
        issue_keys: List of Jira issue keys (e.g., ['DEVOPS-123', 'DEVOPS-456'])

    Returns:
        List of imported issues with their details
    """
    logger.info(f"Received import request for {len(request.issue_keys)} issue(s)")
    
    # Validate input
    if not request.issue_keys or len(request.issue_keys) == 0:
        logger.warning("No issue keys provided")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one issue key is required",
        )

    # Check Jira connection
    logger.info("Validating Jira connection")
    if not jira_service.validate_connection():
        logger.error("Jira connection validation failed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cannot connect to Jira. Please check Jira configuration (JIRA_URL, JIRA_USERNAME, JIRA_API_TOKEN). Use /jira/test-connection to diagnose.",
        )

    try:
        # Get issues by keys
        logger.info(f"Importing {len(request.issue_keys)} issue(s): {request.issue_keys}")
        issues = jira_service.get_issues_by_keys(request.issue_keys)

        # Calculate failed keys
        successful_keys = {issue['key'].upper() for issue in issues}
        failed_keys = [
            key.upper() for key in request.issue_keys 
            if key.upper() not in successful_keys
        ]
        failed_count = len(failed_keys)

        logger.info(f"Successfully imported {len(issues)} out of {len(request.issue_keys)} issue(s)")
        
        if failed_count > 0:
            logger.warning(f"Failed to import {failed_count} issue(s): {failed_keys}")

        return ImportByKeysResponse(
            status="success" if len(issues) > 0 else "partial",
            issues=issues,
            count=len(issues),
            failed_count=failed_count,
            failed_keys=failed_keys,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error importing issues by keys: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error importing issues: {str(e)}",
        )
