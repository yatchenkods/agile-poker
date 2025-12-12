# Jira Issue Import Troubleshooting Guide

## Overview

This guide helps diagnose and fix issues with importing issues from Jira to agile-poker sessions.

## Prerequisites

1. ✅ Jira is configured with proper credentials
2. ✅ Network connectivity to Jira server
3. ✅ User has API token or password authentication enabled
4. ✅ User has permission to view issues in Jira

## Environment Variables

Check that your `.env` file has these variables set:

```bash
# Jira Configuration
JIRA_URL=https://your-jira-instance.com  # Without trailing slash
JIRA_USERNAME=your_username              # Your Jira username
JIRA_API_TOKEN=your_api_token            # API token from Jira
```

### Getting Jira API Token

1. Login to Jira
2. Go to: https://id.atlassian.com/manage-profile/security/api-tokens
3. Click "Create API token"
4. Copy the token and set as `JIRA_API_TOKEN` in your `.env`

## Common Issues

### ❌ Issue: "Cannot connect to Jira"

**Possible causes:**
- Jira URL is incorrect or unreachable
- Network connectivity issue
- Jira server is down

**Solution:**
```bash
# Test connection:
curl -u username:api_token https://your-jira-url/rest/api/2/myself

# Should return 200 with user details
```

**Check your `.env`:**
```bash
# ❌ WRONG - has trailing slash
JIRA_URL=https://jira.example.com/

# ✅ CORRECT - no trailing slash
JIRA_URL=https://jira.example.com
```

---

### ❌ Issue: "HTTP 401 - Authentication failed"

**Possible causes:**
- Invalid username
- Invalid API token
- Credentials not set in `.env`
- Password authentication disabled

**Solution:**
1. Verify username in Jira (usually email)
2. Regenerate API token at https://id.atlassian.com/manage-profile/security/api-tokens
3. Update `.env` and restart backend:
   ```bash
   export JIRA_USERNAME=your_email@company.com
   export JIRA_API_TOKEN=new_token
   # Restart FastAPI server
   ```

---

### ❌ Issue: "HTTP 403 - Access denied"

**Possible causes:**
- User doesn't have permission to view the issue
- Issue is restricted to specific projects
- User's group doesn't have access

**Solution:**
1. Verify issue exists and is accessible in Jira UI
2. Check that your Jira user can view the issue
3. Ask Jira admin to grant permissions to your user group

---

### ❌ Issue: "HTTP 404 - Issue not found"

**Possible causes:**
- Issue key is incorrect (typo in DEVOPS-123)
- Issue was deleted or archived
- Issue belongs to different project

**Solution:**
1. Verify issue key format: `PROJECT-NUMBER` (e.g., DEVOPS-123)
2. Check issue exists in Jira
3. Verify issue is not in trash/archived
4. Copy issue key directly from Jira to avoid typos

---

### ❌ Issue: "HTTP 500 - Jira server error"

**Possible causes:**
- Jira server is having issues
- Request is too large (too many issues at once)
- Timeout in Jira

**Solution:**
1. Try importing fewer issues at a time (max 10 per request)
2. Wait a moment and retry
3. Check Jira server status/logs
4. Verify Jira URL is correct

---

### ❌ Issue: "Request timeout"

**Possible causes:**
- Network latency
- Jira server is slow
- Too many issues to fetch at once

**Solution:**
1. Import fewer issues (split into multiple requests)
2. Check network connectivity to Jira
3. Check Jira server performance
4. Increase timeout (current: 10 seconds) if needed

---

## Log Analysis

### Where to find logs:

**Development:**
```bash
# Watch logs in real-time
django logs
# or
tail -f logs/app.log
```

**Docker:**
```bash
docker logs agile-poker-backend
```

### What to look for:

**Successful import:**
```
INFO - Importing 3 issues to session 1
INFO - JiraService returned 3 successful, 0 failed issues
INFO - Added issue DEVOPS-123 (ID: 42) to session 1
INFO - Successfully imported 3 issue(s) to session 1, 0 failed
```

**Failed - Jira connection:**
```
ERROR - Jira connection validation failed
ERROR - Jira connection error - cannot reach https://jira.example.com
```

**Failed - Authentication:**
```
WARNING - Authentication failed for issue: DEVOPS-123 (HTTP 401)
WARNING - Check your Jira credentials
```

**Failed - Issue not found:**
```
WARNING - Issue not found in Jira: DEVOPS-999 (HTTP 404)
WARNING - The issue may have been deleted or archived
```

**Failed - Invalid data:**
```
WARNING - Issue DEVOPS-123 has no summary/title field
WARNING - The issue has no summary field
```

## Testing Procedure

### Step 1: Test Jira Connection

```bash
# In Python
python
>>> from app.services.jira_service import JiraService
>>> js = JiraService()
>>> js.validate_connection()
True  # ✅ Good
```

If returns `False`, check your Jira URL and credentials.

### Step 2: Test Single Issue Fetch

```python
>>> js._get_single_issue('DEVOPS-123')
{
  'success': True,
  'issue': {
    'key': 'DEVOPS-123',
    'title': 'Add new feature',
    'description': '...',
    'issue_type': 'Story'
  }
}
```

### Step 3: Test Multiple Issues

```python
>>> js.get_issues_by_keys(['DEVOPS-123', 'DEVOPS-456'])
(
  [issue1_dict, issue2_dict],  # successful
  []                           # failed
)
```

### Step 4: Test API Endpoint

```bash
curl -X POST http://localhost:8000/api/v1/sessions/1/import-issues \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"issue_keys": ["DEVOPS-123", "DEVOPS-456"]}'

# Expected response (200):
{
  "status": "success",
  "imported_count": 2,
  "failed_count": 0,
  "message": "Imported 2 issue(s)",
  "failed_issues": []
}
```

## Error Reference

| HTTP Code | Meaning | Solution |
|-----------|---------|----------|
| 200 | Success | All good! ✅ |
| 400 | Bad request | Check issue key format (PROJ-123) |
| 401 | Unauthorized | Check Jira username and API token |
| 403 | Forbidden | User doesn't have permission to view issue |
| 404 | Not found | Issue doesn't exist or was deleted |
| 500 | Server error | Jira server issue, check Jira logs |
| 503 | Unavailable | Jira is down or unreachable |
| Timeout | Connection timeout | Network issue or Jira too slow |

## Performance Tips

1. **Import in batches:** Import 5-10 issues per request, not 100+
2. **Avoid peak hours:** Import when Jira server is less busy
3. **Use direct keys:** Copy from Jira to avoid typos
4. **Check network:** Ensure good connectivity to Jira

## Still Having Issues?

### Collect diagnostic info:

```bash
# 1. Check configuration
echo $JIRA_URL
echo $JIRA_USERNAME
# (don't print the token!)

# 2. Test connection
curl -I -u $JIRA_USERNAME:$JIRA_API_TOKEN $JIRA_URL

# 3. Get logs
docker logs agile-poker-backend | grep -i "jira\|import\|issue"

# 4. Test specific issue
curl -u $JIRA_USERNAME:$JIRA_API_TOKEN \
  $JIRA_URL/rest/api/2/issue/DEVOPS-123
```

### Common misconfigurations:

- ❌ `JIRA_URL` has trailing slash
- ❌ `JIRA_USERNAME` is not email address (for Atlassian Cloud)
- ❌ `JIRA_API_TOKEN` is expired or revoked
- ❌ Issue key format is wrong (should be `PROJ-123` not `proj-123`)
- ❌ Backend not restarted after `.env` changes

## Support

For additional help:
1. Check full logs in backend container
2. Verify Jira issue is accessible via browser
3. Ask Jira admin about permissions
4. Check network connectivity to Jira server
