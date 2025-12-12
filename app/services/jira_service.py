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

    def get_issues_by_keys(self, issue_keys: List[str]) -> List[Dict]:
        """
        Get issues from Jira by their keys

        Args:
            issue_keys: List of Jira issue keys (e.g., ['DEVOPS-123', 'DEVOPS-456'])

        Returns:
            List of issues with keys and titles
        """
        if not issue_keys:
            logger.warning("No issue keys provided")
            return []

        try:
            logger.info("Fetching %d issues by keys: %s", len(issue_keys), issue_keys)
            
            # Validate and normalize keys
            normalized_keys = [key.upper().strip() for key in issue_keys if key.strip()]
            if not normalized_keys:
                logger.warning("No valid issue keys after normalization")
                return []

            # Fetch each issue individually (more reliable than JQL for exact keys)
            issues: List[Dict] = []
            failed_keys = []

            for key in normalized_keys:
                try:
                    issue = self._get_single_issue(key)
                    if issue:
                        issues.append(issue)
                        logger.debug("Successfully fetched issue: %s", key)
                    else:
                        failed_keys.append(key)
                        logger.warning("Issue not found: %s", key)
                except Exception as e:
                    failed_keys.append(key)
                    logger.warning("Error fetching issue %s: %s", key, e)

            if failed_keys:
                logger.warning(
                    "Failed to fetch %d issue(s): %s",
                    len(failed_keys),
                    failed_keys,
                )

            logger.info(
                "Successfully fetched %d out of %d issue(s)",
                len(issues),
                len(normalized_keys),
            )
            return issues

        except Exception as e:
            logger.error("Error fetching issues by keys: %s", e, exc_info=True)
            return []

    def _get_single_issue(self, issue_key: str) -> Dict:
        """
        Get a single issue from Jira by its key

        Args:
            issue_key: Jira issue key (e.g., 'DEVOPS-123')

        Returns:
            Issue dictionary or None if not found
        """
        try:
            url = f"{self.jira_url}/rest/api/3/issue/{issue_key}"
            logger.debug("Fetching issue from %s", url)

            response = requests.get(
                url,
                auth=self.auth,
                timeout=10,
                headers={"Accept": "application/json"},
            )

            if response.status_code == 404:
                logger.warning("Issue not found: %s (HTTP 404)", issue_key)
                return None

            response.raise_for_status()

            issue_data = response.json()
            issue_obj = {
                "key": issue_data.get("key", issue_key),
                "title": issue_data.get("fields", {}).get("summary", ""),
                "description": issue_data.get("fields", {}).get("description", ""),
                "issue_type": issue_data.get("fields", {})
                .get("issuetype", {})
                .get("name", ""),
            }
            logger.debug("Parsed issue: %s - %s", issue_obj["key"], issue_obj["title"])
            return issue_obj

        except requests.exceptions.RequestException as e:
            logger.error("HTTP error fetching issue %s: %s", issue_key, e)
            return None
        except Exception as e:
            logger.error("Error fetching issue %s: %s", issue_key, e, exc_info=True)
            return None

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
