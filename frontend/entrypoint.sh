#!/bin/bash

# Entrypoint script for frontend container
# Injects runtime environment variables into config.js

set -e

echo "[Frontend] Starting Agile Poker frontend..."

# Read environment variables and generate config.js
echo "[Frontend] Generating runtime config..."

# Get environment variables with defaults
REACT_APP_API_URL=${REACT_APP_API_URL:-http://localhost:8000}
REACT_APP_WS_URL=${REACT_APP_WS_URL:-ws://localhost:8000}
REACT_APP_JIRA_ENABLED=${REACT_APP_JIRA_ENABLED:-false}
REACT_APP_LOG_LEVEL=${REACT_APP_LOG_LEVEL:-info}

# Generate config.js with runtime variables
cat > /usr/share/nginx/html/config.js <<EOF
(function() {
  window.__RUNTIME_CONFIG__ = {
    REACT_APP_API_URL: '${REACT_APP_API_URL}',
    REACT_APP_WS_URL: '${REACT_APP_WS_URL}',
    REACT_APP_JIRA_ENABLED: '${REACT_APP_JIRA_ENABLED}',
    REACT_APP_LOG_LEVEL: '${REACT_APP_LOG_LEVEL}',
  };
  
  console.log('[Config] Runtime configuration loaded:', {
    apiUrl: window.__RUNTIME_CONFIG__.REACT_APP_API_URL,
    wsUrl: window.__RUNTIME_CONFIG__.REACT_APP_WS_URL,
    jiraEnabled: window.__RUNTIME_CONFIG__.REACT_APP_JIRA_ENABLED,
  });
})();
EOF

echo "[Frontend] Config generated:"
echo "  API URL: ${REACT_APP_API_URL}"
echo "  WS URL: ${REACT_APP_WS_URL}"
echo "  JIRA Enabled: ${REACT_APP_JIRA_ENABLED}"
echo "  Log Level: ${REACT_APP_LOG_LEVEL}"

# Execute the main command (nginx)
exec "$@"
