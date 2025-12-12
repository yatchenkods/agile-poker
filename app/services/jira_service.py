"""Jira integration service"""

import requests
import logging
from typing import List, Dict, Tuple
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

    def get_issues_by_keys(self, issue_keys: List[str]) -> Tuple[List[Dict], List[Dict]]:
        """
        Get issues from Jira by their keys

        Args:
            issue_keys: List of Jira issue keys (e.g., ['DEVOPS-123', 'DEVOPS-456'])

        Returns:
            Tuple of (successful_issues, failed_issues_with_reasons)
        """
        if not issue_keys:
            logger.warning("No issue keys provided")
            return [], []

        try:
            logger.info("Fetching %d issues by keys: %s", len(issue_keys), issue_keys)
            
            # Validate and normalize keys
            normalized_keys = [key.upper().strip() for key in issue_keys if key.strip()]
            if not normalized_keys:
                logger.warning("No valid issue keys after normalization")
                return [], []

            # Fetch each issue individually (more reliable than JQL for exact keys)
            issues: List[Dict] = []
            failed_issues: List[Dict] = []

            for key in normalized_keys:
                try:
                    result = self._get_single_issue(key)
                    if result["success"]:
                        issues.append(result["issue"])
                        logger.debug("Successfully fetched issue: %s", key)
                    else:
                        failed_issues.append({
                            "key": key,
                            "reason": result["reason"],
                            "details": result.get("details", "")
                        })
                        logger.warning(
                            "Failed to fetch issue %s: %s (HTTP %s)",
                            key,
                            result["reason"],
                            result.get("status_code", "unknown")
                        )
                except Exception as e:
                    failed_issues.append({
                        "key": key,
                        "reason": "Unexpected error",
                        "details": str(e)
                    })
                    logger.warning("Error fetching issue %s: %s", key, e, exc_info=True)

            if failed_issues:
                logger.warning(
                    "Failed to fetch %d issue(s) out of %d",
                    len(failed_issues),
                    len(normalized_keys),
                )

            logger.info(
                "Successfully fetched %d out of %d issue(s)",
                len(issues),
                len(normalized_keys),
            )
            return issues, failed_issues

        except Exception as e:
            logger.error("Error fetching issues by keys: %s", e, exc_info=True)
            return [], []

    def _get_single_issue(self, issue_key: str) -> Dict:
        """
        Get a single issue from Jira by its key

        Args:
            issue_key: Jira issue key (e.g., 'DEVOPS-123')

        Returns:
            Dictionary with "success", "issue", "reason", and "status_code" keys
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

            # Handle different HTTP status codes
            if response.status_code == 404:
                logger.warning(
                    "Issue not found in Jira: %s (HTTP 404) - Issue may have been deleted or archived",
                    issue_key
                )
                return {
                    "success": False,
                    "reason": "Issue not found in Jira",
                    "details": "The issue may have been deleted or archived",
                    "status_code": 404
                }

            if response.status_code == 403:
                logger.warning(
                    "Access denied to issue: %s (HTTP 403) - Check permissions",
                    issue_key
                )
                return {
                    "success": False,
                    "reason": "Access denied",
                    "details": "You don't have permission to view this issue",
                    "status_code": 403
                }

            if response.status_code == 401:
                logger.warning(
                    "Authentication failed for issue: %s (HTTP 401)",
                    issue_key
                )
                return {
                    "success": False,
                    "reason": "Authentication failed",
                    "details": "Check your Jira credentials",
                    "status_code": 401
                }

            if response.status_code >= 500:
                logger.error(
                    "Jira server error while fetching %s (HTTP %s): %s",
                    issue_key,
                    response.status_code,
                    response.text[:200]
                )
                return {
                    "success": False,
                    "reason": "Jira server error",
                    "details": f"HTTP {response.status_code}",
                    "status_code": response.status_code
                }

            if response.status_code >= 400:
                logger.error(
                    "HTTP error while fetching %s (HTTP %s): %s",
                    issue_key,
                    response.status_code,
                    response.text[:200]
                )
                return {
                    "success": False,
                    "reason": f"HTTP error {response.status_code}",
                    "details": response.text[:100] if response.text else "No details available",
                    "status_code": response.status_code
                }

            try:
                response.raise_for_status()
            except requests.exceptions.HTTPError as e:
                logger.error("HTTP error while fetching %s: %s", issue_key, e)
                return {
                    "success": False,
                    "reason": f"HTTP error {response.status_code}",
                    "status_code": response.status_code
                }

            # Parse successful response
            try:
                issue_data = response.json()
            except ValueError as e:
                logger.error(
                    "Invalid JSON response while fetching %s: %s",
                    issue_key,
                    e
                )
                return {
                    "success": False,
                    "reason": "Invalid response from Jira",
                    "details": "Could not parse issue data",
                    "status_code": 200
                }

            # Validate required fields
            key = issue_data.get("key", issue_key).upper()
            title = issue_data.get("fields", {}).get("summary", "")
            
            if not title:
                logger.warning(
                    "Issue %s has no summary/title field",
                    issue_key
                )
                return {
                    "success": False,
                    "reason": "Missing issue title",
                    "details": "The issue has no summary field",
                    "status_code": 200
                }

            issue_obj = {
                "key": key,
                "title": title,
                "description": issue_data.get("fields", {}).get("description") or "",
                "issue_type": issue_data.get("fields", {})
                    .get("issuetype", {})
                    .get("name", ""),
            }
            
            logger.debug(
                "Parsed issue: %s - %s (%s)",
                issue_obj["key"],
                issue_obj["title"],
                issue_obj["issue_type"]
            )
            
            return {
                "success": True,
                "issue": issue_obj
            }

        except requests.exceptions.Timeout as e:
            logger.error(
                "Request timeout while fetching issue %s: %s",
                issue_key,
                e
            )
            return {
                "success": False,
                "reason": "Request timeout",
                "details": "The Jira server took too long to respond (>10s)",
            }
        except requests.exceptions.ConnectionError as e:
            logger.error(
                "Connection error while fetching issue %s: %s",
                issue_key,
                e
            )
            return {
                "success": False,
                "reason": "Connection error",
                "details": "Could not reach the Jira server",
            }
        except requests.exceptions.RequestException as e:
            logger.error(
                "Request error while fetching issue %s: %s",
                issue_key,
                e,
                exc_info=True
            )
            return {
                "success": False,
                "reason": "Request error",
                "details": str(e)[:100],
            }
        except Exception as e:
            logger.error(
                "Unexpected error fetching issue %s: %s",
                issue_key,
                e,
                exc_info=True
            )
            return {
                "success": False,
                "reason": "Unexpected error",
                "details": str(e)[:100],
            }

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
