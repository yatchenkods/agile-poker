/**
 * Runtime configuration script for Agile Poker frontend
 * This script loads configuration from environment variables at runtime
 * Allows changing API endpoints without rebuilding the Docker image
 * 
 * Usage:
 * 1. Set environment variables: REACT_APP_API_URL, REACT_APP_WS_URL, REACT_APP_JIRA_ENABLED
 * 2. This script will be loaded before the React app starts
 * 3. The config will be available as window.__RUNTIME_CONFIG__
 */

(function() {
  // Get environment variables from window object (set by server)
  // or use defaults from process.env
  window.__RUNTIME_CONFIG__ = {
    REACT_APP_API_URL: window.__ENV__.REACT_APP_API_URL || 'http://localhost:8000',
    REACT_APP_WS_URL: window.__ENV__.REACT_APP_WS_URL || 'ws://localhost:8000',
    REACT_APP_JIRA_ENABLED: window.__ENV__.REACT_APP_JIRA_ENABLED || 'false',
    REACT_APP_LOG_LEVEL: window.__ENV__.REACT_APP_LOG_LEVEL || 'info',
  };
  
  console.log('[Config] Runtime configuration loaded:', {
    apiUrl: window.__RUNTIME_CONFIG__.REACT_APP_API_URL,
    wsUrl: window.__RUNTIME_CONFIG__.REACT_APP_WS_URL,
    jiraEnabled: window.__RUNTIME_CONFIG__.REACT_APP_JIRA_ENABLED,
  });
})();
