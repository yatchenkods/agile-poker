# Jira Integration Setup Guide

This guide explains how to configure the Agile Planning Poker application to import tasks from Jira sprints.

## Prerequisites

- Jira Cloud or Jira Server instance
- Jira API token (for Jira Cloud) or password (for Jira Server)
- Project Key from your Jira instance
- Sprint name in your Jira project

## Step 1: Generate Jira API Token

### For Jira Cloud:

1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Give it a name (e.g., "Agile Poker Integration")
4. Click "Create"
5. Copy the generated token (it will only be shown once)

### For Jira Server/Data Center:

1. Use your Jira password directly (or create an API token if your instance supports it)

## Step 2: Configure Environment Variables

Create or update your `.env` file with the following Jira configuration:

```env
# Jira Configuration
JIRA_ENABLED=true
JIRA_URL=https://your-jira-instance.atlassian.net
JIRA_USERNAME=your-email@example.com
JIRA_API_TOKEN=your-generated-api-token
```

### Configuration Details:

- **JIRA_ENABLED**: Enable/disable Jira integration (default: true)
- **JIRA_URL**: Your Jira instance URL
  - For Jira Cloud: `https://your-domain.atlassian.net`
  - For Jira Server: `https://jira.yourcompany.com`
- **JIRA_USERNAME**: Your Jira username or email
- **JIRA_API_TOKEN**: Your generated API token

## Step 3: Test the Connection

1. Start the application
2. Go to "New Session" dialog
3. Check the "Import issues from Jira sprint" checkbox
4. Enter your Project Key (e.g., "PROJ")
5. Enter your Sprint Name (e.g., "Sprint 1")
6. Click "Import Issues"

If configured correctly, you should see a list of issues from your sprint.

## Troubleshooting

### Error: "Cannot connect to Jira. Please check Jira configuration"

**Causes:**
- Incorrect JIRA_URL
- Invalid JIRA_USERNAME or JIRA_API_TOKEN
- Jira instance is not accessible from the server
- API credentials don't have permission to access the Jira API

**Solutions:**
1. Verify JIRA_URL is correct and accessible
2. Check JIRA_USERNAME is correct (email for Cloud, username for Server)
3. Verify JIRA_API_TOKEN is correct and hasn't expired
4. Ensure your Jira user has API access enabled

### Error: "No issues found in sprint"

**Causes:**
- Project Key is incorrect
- Sprint Name doesn't match exactly (case-sensitive)
- Sprint exists but has no issues

**Solutions:**
1. Verify Project Key in Jira (usually visible in issue URLs like `PROJ-123`)
2. Check exact sprint name in your Jira backlog
3. Ensure the sprint contains issues

### Error: 401/403 Unauthorized

**Causes:**
- Invalid credentials
- User doesn't have permission to access the project
- API token has expired

**Solutions:**
1. Regenerate and update your API token
2. Verify user has access to the project in Jira
3. For Jira Server, ensure authentication is properly configured

## Finding Your Project Key and Sprint Name

### Project Key:
1. Go to your Jira project
2. In the URL, look for the key: `https://jira.example.com/browse/PROJ-123`
3. The Project Key is `PROJ`

Alternatively:
1. Go to Project Settings → Details
2. Find the "Project Key" field

### Sprint Name:
1. Go to your Jira project backlog
2. Look for the sprint section
3. The sprint name is displayed (e.g., "Sprint 1", "Q1 2025 Sprint")

## API Endpoints

### Import Sprint Issues

```
POST /api/v1/jira/import-sprint

Request Body:
{
  "project_key": "PROJ",
  "sprint_name": "Sprint 1"
}

Response:
{
  "status": "success",
  "count": 15,
  "issues": [
    {
      "key": "PROJ-1",
      "title": "Create login page",
      "description": "User login functionality",
      "issue_type": "Task"
    },
    ...
  ]
}
```

## Security Considerations

1. **Never commit credentials**: Keep `.env` file in `.gitignore`
2. **Use API tokens**: Prefer API tokens over passwords
3. **Rotate tokens regularly**: Regenerate API tokens periodically
4. **Limit permissions**: Give Jira user minimal required permissions
5. **Use HTTPS**: Always use HTTPS for Jira instance URLs

## Advanced Configuration

### Multiple Jira Instances

Currently, only one Jira instance is supported per deployment. To support multiple instances:

1. Store instance-specific configuration per session
2. Extend the JiraService to accept runtime configuration
3. Implement instance discovery logic

### Caching Sprint Data

To improve performance with frequent imports:

1. Enable Redis caching (already configured)
2. Cache sprint and board data for a short TTL
3. Implement cache invalidation on update

## Support

For issues or questions:
1. Check this guide first
2. Review application logs for error details
3. Verify Jira credentials and permissions
4. Test Jira API access manually using curl:

```bash
curl -u "your-email@example.com:your-api-token" \\
  https://your-jira-instance.atlassian.net/rest/api/2/myself
```

If this returns your Jira user details, the API access is working correctly.
