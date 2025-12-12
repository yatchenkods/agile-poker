"""Jira integration service"""

import requests
import logging
from typing import List, Dict, Optional
from app.config import settings

logger = logging.getLogger(__name__)


class JiraService:
    """Service for Jira integration"""

    def __init__(self):
        self.jira_url = settings.jira_base_url
        self.jira_username = settings.jira_username
        self.jira_api_token = settings.jira_api_token
        self.auth = (self.jira_username, self.jira_api_token) if self.jira_username and self.jira_api_token else None
        
        logger.debug(f"JiraService initialized with URL: {self.jira_url}")
        logger.debug(f"JiraService auth configured: {bool(self.auth)}")

    def get_sprint_issues(self, project_key: str, sprint_name: str) -> List[Dict]:
        """
        Get issues from a specific sprint in Jira

        Args:
            project_key: Jira project key (e.g., 'PROJ')
            sprint_name: Sprint name (e.g., 'Sprint 1')

        Returns:
            List of issues with keys and titles
        """
        try:
            logger.info(f"Fetching issues for project {project_key}, sprint {sprint_name}")
            
            # First, get all sprints for the project
            sprints = self._get_project_sprints(project_key)
            if not sprints:
                logger.warning(f"No sprints found for project {project_key}")
                return []

            # Find sprint by name
            sprint = next(
                (s for s in sprints if s.get('name', '').lower() == sprint_name.lower()),
                None
            )

            if not sprint:
                logger.warning(f"Sprint '{sprint_name}' not found in project {project_key}")
                logger.debug(f"Available sprints: {[s.get('name') for s in sprints]}")
                return []

            sprint_id = sprint.get('id')
            logger.debug(f"Found sprint {sprint_name} with ID {sprint_id}")

            # Get issues in sprint
            issues = self._get_sprint_issues_by_id(sprint_id, project_key)
            logger.info(f"Fetched {len(issues)} issues from sprint {sprint_name}")
            return issues

        except Exception as e:
            logger.error(f"Error fetching sprint issues: {e}", exc_info=True)
            return []

    def _get_project_sprints(self, project_key: str) -> List[Dict]:
        """
        Get all sprints for a project

        Args:
            project_key: Jira project key

        Returns:
            List of sprints
        """
        try:
            logger.debug(f"Getting boards for project {project_key}")
            
            # Get board ID first
            boards_url = f"{self.jira_url}/rest/agile/1.0/board"
            params = {'projectKey': project_key}
            
            logger.debug(f"Requesting boards from {boards_url} with params {params}")
            response = requests.get(
                boards_url,
                params=params,
                auth=self.auth,
                timeout=10
            )
            response.raise_for_status()

            boards = response.json().get('values', [])
            logger.debug(f"Found {len(boards)} boards for project {project_key}")
            
            if not boards:
                logger.warning(f"No boards found for project {project_key}")
                return []

            board_id = boards[0]['id']
            logger.debug(f"Using board ID {board_id}")

            # Get sprints for board
            sprints_url = f"{self.jira_url}/rest/agile/1.0/board/{board_id}/sprint"
            logger.debug(f"Requesting sprints from {sprints_url}")
            
            response = requests.get(
                sprints_url,
                auth=self.auth,
                timeout=10
            )
            response.raise_for_status()

            sprints = response.json().get('values', [])
            logger.debug(f"Found {len(sprints)} sprints for board {board_id}")
            return sprints

        except requests.exceptions.RequestException as e:
            logger.error(f"HTTP error fetching sprints: {e}", exc_info=True)
            return []
        except Exception as e:
            logger.error(f"Error fetching sprints: {e}", exc_info=True)
            return []

    def _get_sprint_issues_by_id(self, sprint_id: int, project_key: str) -> List[Dict]:
        """
        Get issues for a specific sprint

        Args:
            sprint_id: Sprint ID
            project_key: Jira project key

        Returns:
            List of issues
        """
        try:
            issues_url = f"{self.jira_url}/rest/agile/1.0/sprint/{sprint_id}/issue"
            params = {
                'maxResults': 100,
            }
            
            logger.debug(f"Requesting issues from {issues_url}")
            response = requests.get(
                issues_url,
                params=params,
                auth=self.auth,
                timeout=10
            )
            response.raise_for_status()

            issues_data = response.json().get('issues', [])
            logger.debug(f"Found {len(issues_data)} issues in sprint {sprint_id}")
            
            issues = []
            for issue in issues_data:
                issue_obj = {
                    'key': issue.get('key', ''),
                    'title': issue.get('fields', {}).get('summary', ''),
                    'description': issue.get('fields', {}).get('description', ''),
                    'issue_type': issue.get('fields', {}).get('issuetype', {}).get('name', ''),
                }
                issues.append(issue_obj)
                logger.debug(f"Parsed issue: {issue_obj['key']} - {issue_obj['title']}")

            return issues

        except requests.exceptions.RequestException as e:
            logger.error(f"HTTP error fetching sprint issues: {e}", exc_info=True)
            return []
        except Exception as e:
            logger.error(f"Error fetching sprint issues: {e}", exc_info=True)
            return []

    def validate_connection(self) -> bool:
        """
        Validate Jira connection

        Returns:
            True if connection is valid
        """
        try:
            if not self.auth:
                logger.error("Jira authentication not configured (missing username or API token)")
                return False

            if not self.jira_url:
                logger.error("Jira URL not configured")
                return False

            url = f"{self.jira_url}/rest/api/2/myself"
            logger.debug(f"Validating Jira connection to {url}")
            
            response = requests.get(
                url,
                auth=self.auth,
                timeout=5
            )
            
            if response.status_code == 200:
                user_data = response.json()
                logger.info(f"Jira connection successful. User: {user_data.get('emailAddress')}")
                return True
            else:
                logger.error(f"Jira connection failed with status {response.status_code}: {response.text}")
                return False

        except requests.exceptions.Timeout:
            logger.error(f"Jira connection timeout - cannot reach {self.jira_url}")
            return False
        except requests.exceptions.ConnectionError:
            logger.error(f"Jira connection error - cannot reach {self.jira_url}")
            return False
        except requests.exceptions.RequestException as e:
            logger.error(f"Jira HTTP error: {e}", exc_info=True)
            return False
        except Exception as e:
            logger.error(f"Unexpected error validating Jira connection: {e}", exc_info=True)
            return False
