"""Jira integration service"""

import requests
import logging
from typing import List, Dict, Optional
from app.config import settings

logger = logging.getLogger(__name__)


class JiraService:
    """Service for Jira integration"""

    def __init__(self):
        self.jira_url = settings.jira_url
        self.jira_username = settings.jira_username
        self.jira_api_token = settings.jira_api_token
        self.auth = (self.jira_username, self.jira_api_token) if self.jira_username and self.jira_api_token else None
        
        logger.debug(f"JiraService initialized with URL: {self.jira_url}")
        logger.debug(f"JiraService auth configured: {bool(self.auth)}")

    def get_sprints_for_project(self, project_key: str) -> List[Dict]:
        """
        Get all sprints for a project with board information

        Args:
            project_key: Jira project key (e.g., 'PROJ')

        Returns:
            List of sprints with board_id
        """
        try:
            logger.info(f"Getting all sprints for project {project_key}")
            sprints = self._get_project_sprints(project_key)
            return sprints
        except Exception as e:
            logger.error(f"Error getting sprints for project: {e}", exc_info=True)
            return []

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

            # Find sprint by name (case-insensitive)
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
        Get all sprints for a project by checking all boards

        Args:
            project_key: Jira project key

        Returns:
            List of sprints with board information
        """
        try:
            logger.debug(f"Getting sprints for project {project_key}")
            
            # Try to get all boards for the project
            all_sprints = []
            boards_url = f"{self.jira_url}/rest/agile/1.0/board"
            params = {'projectKey': project_key, 'maxResults': 50}
            
            logger.debug(f"Requesting boards from {boards_url}")
            response = requests.get(
                boards_url,
                params=params,
                auth=self.auth,
                timeout=10
            )
            response.raise_for_status()

            boards = response.json().get('values', [])
            logger.info(f"Found {len(boards)} board(s) for project {project_key}")
            
            if not boards:
                logger.warning(f"No boards found for project {project_key}")
                return []

            # Get sprints from each board
            for board in boards:
                board_id = board.get('id')
                board_name = board.get('name')
                board_type = board.get('type')
                logger.debug(f"Processing board {board_id} ({board_name}, type: {board_type})")
                
                try:
                    sprints = self._get_board_sprints(board_id)
                    logger.info(f"Found {len(sprints)} sprint(s) on board {board_name}")
                    
                    # Add board_id to each sprint
                    for sprint in sprints:
                        sprint['board_id'] = board_id
                    
                    all_sprints.extend(sprints)
                except Exception as e:
                    logger.warning(f"Error fetching sprints for board {board_id}: {e}")
                    continue
            
            logger.info(f"Total sprints found: {len(all_sprints)}")
            if all_sprints:
                logger.debug(f"Available sprints: {[s.get('name') for s in all_sprints]}")
            
            return all_sprints

        except requests.exceptions.RequestException as e:
            logger.error(f"HTTP error fetching sprints: {e}", exc_info=True)
            return []
        except Exception as e:
            logger.error(f"Error fetching sprints: {e}", exc_info=True)
            return []

    def _get_board_sprints(self, board_id: int) -> List[Dict]:
        """
        Get sprints for a specific board

        Args:
            board_id: Board ID

        Returns:
            List of sprints
        """
        try:
            sprints_url = f"{self.jira_url}/rest/agile/1.0/board/{board_id}/sprint"
            params = {'maxResults': 50}
            
            logger.debug(f"Requesting sprints from {sprints_url}")
            
            response = requests.get(
                sprints_url,
                params=params,
                auth=self.auth,
                timeout=10
            )
            response.raise_for_status()

            sprints = response.json().get('values', [])
            logger.debug(f"Found {len(sprints)} sprints on board {board_id}")
            return sprints

        except requests.exceptions.RequestException as e:
            logger.warning(f"Error fetching sprints for board {board_id}: {e}")
            return []
        except Exception as e:
            logger.warning(f"Unexpected error fetching sprints for board {board_id}: {e}")
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
                # Filter by project key to ensure we only get issues from this project
                issue_key = issue.get('key', '')
                if not issue_key.startswith(project_key + '-'):
                    logger.debug(f"Skipping issue {issue_key} - not in project {project_key}")
                    continue
                
                issue_obj = {
                    'key': issue_key,
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
