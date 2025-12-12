"""Jira integration service"""

import requests
from typing import List, Dict, Optional
from app.config import settings


class JiraService:
    """Service for Jira integration"""

    def __init__(self):
        self.jira_url = settings.jira_url
        self.jira_username = settings.jira_username
        self.jira_api_token = settings.jira_api_token
        self.auth = (self.jira_username, self.jira_api_token) if self.jira_username and self.jira_api_token else None

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
            # First, get all sprints for the project
            sprints = self._get_project_sprints(project_key)
            if not sprints:
                return []

            # Find sprint by name
            sprint = next(
                (s for s in sprints if s.get('name', '').lower() == sprint_name.lower()),
                None
            )

            if not sprint:
                return []

            sprint_id = sprint.get('id')

            # Get issues in sprint
            issues = self._get_sprint_issues_by_id(sprint_id, project_key)
            return issues

        except Exception as e:
            print(f"Error fetching sprint issues: {e}")
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
            # Get board ID first
            boards_url = f"{self.jira_url}/rest/agile/1.0/board"
            params = {'projectKey': project_key}
            response = requests.get(
                boards_url,
                params=params,
                auth=self.auth,
                timeout=10
            )
            response.raise_for_status()

            boards = response.json().get('values', [])
            if not boards:
                return []

            board_id = boards[0]['id']

            # Get sprints for board
            sprints_url = f"{self.jira_url}/rest/agile/1.0/board/{board_id}/sprint"
            response = requests.get(
                sprints_url,
                auth=self.auth,
                timeout=10
            )
            response.raise_for_status()

            return response.json().get('values', [])

        except Exception as e:
            print(f"Error fetching sprints: {e}")
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
                'jql': f'project={project_key}'
            }
            response = requests.get(
                issues_url,
                params=params,
                auth=self.auth,
                timeout=10
            )
            response.raise_for_status()

            issues_data = response.json().get('issues', [])
            issues = []

            for issue in issues_data:
                issues.append({
                    'key': issue.get('key', ''),
                    'title': issue.get('fields', {}).get('summary', ''),
                    'description': issue.get('fields', {}).get('description', ''),
                    'issue_type': issue.get('fields', {}).get('issuetype', {}).get('name', ''),
                })

            return issues

        except Exception as e:
            print(f"Error fetching sprint issues: {e}")
            return []

    def validate_connection(self) -> bool:
        """
        Validate Jira connection

        Returns:
            True if connection is valid
        """
        try:
            if not self.auth:
                return False

            url = f"{self.jira_url}/rest/api/2/myself"
            response = requests.get(
                url,
                auth=self.auth,
                timeout=5
            )
            return response.status_code == 200

        except Exception:
            return False
