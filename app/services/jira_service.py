"""Jira integration service"""

import requests
import logging
from typing import List, Dict
from app.config import settings

logger = logging.getLogger(__name__)


class JiraService:
    """Service for Jira integration"""

    def __init__(self):
        self.jira_url = settings.jira_url
        self.jira_username = settings.jira_username
        self.jira_api_token = settings.jira_api_token
        self.auth = (
            (self.jira_username, self.jira_api_token)
            if self.jira_username and self.jira_api_token
            else None
        )

        logger.debug("JiraService initialized with URL: %s", self.jira_url)
        logger.debug("JiraService auth configured: %s", bool(self.auth))

    def get_sprints_for_project(self, project_key: str) -> List[Dict]:
        """
        Get all sprints for a project with board information

        Args:
            project_key: Jira project key (e.g., 'PROJ')

        Returns:
            List of sprints with board_id
        """
        try:
            logger.info("Getting all sprints for project %s", project_key)
            sprints = self._get_project_sprints(project_key)
            return sprints
        except Exception as e:
            logger.error("Error getting sprints for project: %s", e, exc_info=True)
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
            logger.info(
                "Fetching issues for project %s, sprint %s",
                project_key,
                sprint_name,
            )

            # First, get all sprints for the project
            sprints = self._get_project_sprints(project_key)
            if not sprints:
                logger.warning("No sprints found for project %s", project_key)
                return []

            logger.debug(
                "Found %d sprints for project %s", len(sprints), project_key
            )
            sprint_descriptions = [
                f"{s.get('name')} (board {s.get('board_id')})" for s in sprints
            ]
            logger.debug("Sprints: %s", sprint_descriptions)

            # Find sprint by name (case-insensitive)
            sprint = next(
                (
                    s
                    for s in sprints
                    if s.get("name", "").lower() == sprint_name.lower()
                ),
                None,
            )

            if not sprint:
                logger.warning(
                    "Sprint '%s' not found in project %s",
                    sprint_name,
                    project_key,
                )
                available = [s.get("name") for s in sprints]
                logger.info("Available sprints: %s", available)
                return []

            sprint_id = sprint.get("id")
            board_id = sprint.get("board_id")
            logger.debug(
                "Found sprint '%s' with ID %s on board %s",
                sprint_name,
                sprint_id,
                board_id,
            )

            # Get issues in sprint
            issues = self._get_sprint_issues_by_id(sprint_id, project_key)
            logger.info(
                "Fetched %d issues from sprint '%s'",
                len(issues),
                sprint_name,
            )
            return issues

        except Exception as e:
            logger.error("Error fetching sprint issues: %s", e, exc_info=True)
            return []

    def _get_project_sprints(self, project_key: str) -> List[Dict]:
        """
        Get all sprints for a project by checking all boards for that project

        Args:
            project_key: Jira project key

        Returns:
            List of sprints with board information
        """
        try:
            logger.debug("Getting sprints for project %s", project_key)

            # Get all boards for the project
            all_sprints: List[Dict] = []
            boards_url = f"{self.jira_url}/rest/agile/1.0/board"

            # Use projectKey to filter boards by project
            params = {"projectKey": project_key, "maxResults": 50}

            logger.debug(
                "Requesting boards for project %s from %s",
                project_key,
                boards_url,
            )
            response = requests.get(
                boards_url,
                params=params,
                auth=self.auth,
                timeout=10,
            )
            response.raise_for_status()

            boards_data = response.json()
            boards = boards_data.get("values", [])
            logger.info(
                "Found %d board(s) for project %s",
                len(boards),
                project_key,
            )

            board_descriptions = [
                f"{b.get('name')} (id: {b.get('id')}, type: {b.get('type')})"
                for b in boards
            ]
            logger.debug("Boards: %s", board_descriptions)

            if not boards:
                logger.warning("No boards found for project %s", project_key)
                return []

            # Get sprints from each board (they should all be for this project)
            for board in boards:
                board_id = board.get("id")
                board_name = board.get("name")
                board_type = board.get("type")
                logger.debug(
                    "Processing board %s (%s, type: %s)",
                    board_id,
                    board_name,
                    board_type,
                )

                try:
                    sprints = self._get_board_sprints(board_id)
                    logger.info(
                        "Found %d sprint(s) on board %s",
                        len(sprints),
                        board_name,
                    )

                    # Add board_id to each sprint
                    for sprint in sprints:
                        sprint["board_id"] = board_id

                    all_sprints.extend(sprints)
                except Exception as e:
                    logger.warning(
                        "Error fetching sprints for board %s: %s",
                        board_id,
                        e,
                    )
                    continue

            logger.info(
                "Total sprints found for project %s: %d",
                project_key,
                len(all_sprints),
            )
            if all_sprints:
                sprint_names = [
                    f"{s.get('name')} (state: {s.get('state')})"
                    for s in all_sprints
                ]
                logger.debug("Available sprints: %s", sprint_names)

            return all_sprints

        except requests.exceptions.RequestException as e:
            logger.error("HTTP error fetching sprints: %s", e, exc_info=True)
            return []
        except Exception as e:
            logger.error("Error fetching sprints: %s", e, exc_info=True)
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
            params = {"maxResults": 50}

            logger.debug("Requesting sprints from %s", sprints_url)

            response = requests.get(
                sprints_url,
                params=params,
                auth=self.auth,
                timeout=10,
            )
            response.raise_for_status()

            sprints = response.json().get("values", [])
            logger.debug("Found %d sprints on board %s", len(sprints), board_id)

            for sprint in sprints:
                logger.debug(
                    "  Sprint: %s (id: %s, state: %s)",
                    sprint.get("name"),
                    sprint.get("id"),
                    sprint.get("state"),
                )

            return sprints

        except requests.exceptions.RequestException as e:
            logger.warning(
                "Error fetching sprints for board %s: %s", board_id, e
            )
            return []
        except Exception as e:
            logger.warning(
                "Unexpected error fetching sprints for board %s: %s",
                board_id,
                e,
            )
            return []

    def _get_sprint_issues_by_id(
        self, sprint_id: int, project_key: str
    ) -> List[Dict]:
        """
        Get issues for a specific sprint

        Args:
            sprint_id: Sprint ID
            project_key: Jira project key (for filtering)

        Returns:
            List of issues
        """
        try:
            issues_url = (
                f"{self.jira_url}/rest/agile/1.0/sprint/{sprint_id}/issue"
            )
            params = {"maxResults": 100}

            logger.debug("Requesting issues from sprint %s", sprint_id)
            response = requests.get(
                issues_url,
                params=params,
                auth=self.auth,
                timeout=10,
            )
            response.raise_for_status()

            issues_data = response.json().get("issues", [])
            logger.debug(
                "Found %d total issues in sprint %s",
                len(issues_data),
                sprint_id,
            )

            issues: List[Dict] = []
            skipped_count = 0

            for issue in issues_data:
                # Filter by project key to ensure we only get issues from this project
                issue_key = issue.get("key", "")

                if not issue_key.startswith(project_key + "-"):
                    logger.debug(
                        "Skipping issue %s - belongs to different project (expected %s-*)",
                        issue_key,
                        project_key,
                    )
                    skipped_count += 1
                    continue

                issue_obj = {
                    "key": issue_key,
                    "title": issue.get("fields", {}).get("summary", ""),
                    "description": issue.get("fields", {})
                    .get("description", ""),
                    "issue_type": issue.get("fields", {})
                    .get("issuetype", {})
                    .get("name", ""),
                }
                issues.append(issue_obj)
                logger.debug(
                    "Parsed issue: %s - %s", issue_obj["key"], issue_obj["title"]
                )

            logger.info(
                "Sprint %s: %d issues for project %s, %d issues from other projects skipped",
                sprint_id,
                len(issues),
                project_key,
                skipped_count,
            )
            return issues

        except requests.exceptions.RequestException as e:
            logger.error(
                "HTTP error fetching sprint issues: %s", e, exc_info=True
            )
            return []
        except Exception as e:
            logger.error("Error fetching sprint issues: %s", e, exc_info=True)
            return []

    def validate_connection(self) -> bool:
        """
        Validate Jira connection

        Returns:
            True if connection is valid
        """
        try:
            if not self.auth:
                logger.error(
                    "Jira authentication not configured (missing username or API token)"
                )
                return False

            if not self.jira_url:
                logger.error("Jira URL not configured")
                return False

            url = f"{self.jira_url}/rest/api/2/myself"
            logger.debug("Validating Jira connection to %s", url)

            response = requests.get(
                url,
                auth=self.auth,
                timeout=5,
            )

            if response.status_code == 200:
                user_data = response.json()
                logger.info(
                    "Jira connection successful. User: %s",
                    user_data.get("emailAddress"),
                )
                return True
            else:
                logger.error(
                    "Jira connection failed with status %s: %s",
                    response.status_code,
                    response.text,
                )
                return False

        except requests.exceptions.Timeout:
            logger.error(
                "Jira connection timeout - cannot reach %s", self.jira_url
            )
            return False
        except requests.exceptions.ConnectionError:
            logger.error(
                "Jira connection error - cannot reach %s", self.jira_url
            )
            return False
        except requests.exceptions.RequestException as e:
            logger.error("Jira HTTP error: %s", e, exc_info=True)
            return False
        except Exception as e:
            logger.error(
                "Unexpected error validating Jira connection: %s",
                e,
                exc_info=True,
            )
            return False
