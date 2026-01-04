/**
 * Runtime configuration loader for frontend
 * Supports both build-time and runtime environment variables
 * 
 * Priority order:
 * 1. window.__RUNTIME_CONFIG__ (injected at runtime by entrypoint.sh)
 * 2. process.env.REACT_APP_* (build-time environment variables)
 * 3. Hardcoded defaults
 */

interface RuntimeConfig {
  apiUrl: string;
  wsUrl: string;
  logLevel: string;
  jiraEnabled: boolean;
}

declare global {
  interface Window {
    __RUNTIME_CONFIG__?: {
      REACT_APP_API_URL?: string;
      REACT_APP_WS_URL?: string;
      REACT_APP_LOG_LEVEL?: string;
      REACT_APP_JIRA_ENABLED?: string;
    };
  }
}

function getConfig(): RuntimeConfig {
  let apiUrl: string;
  let wsUrl: string;
  let logLevel: string;
  let jiraEnabled: boolean;

  // Try runtime config first (from window.__RUNTIME_CONFIG__)
  if (typeof window !== 'undefined' && window.__RUNTIME_CONFIG__) {
    apiUrl = window.__RUNTIME_CONFIG__.REACT_APP_API_URL || process.env.REACT_APP_API_URL || 'http://localhost:8000';
    wsUrl = window.__RUNTIME_CONFIG__.REACT_APP_WS_URL || process.env.REACT_APP_WS_URL || 'ws://localhost:8000';
    logLevel = window.__RUNTIME_CONFIG__.REACT_APP_LOG_LEVEL || process.env.REACT_APP_LOG_LEVEL || 'info';
    jiraEnabled = (window.__RUNTIME_CONFIG__.REACT_APP_JIRA_ENABLED || process.env.REACT_APP_JIRA_ENABLED || 'false').toLowerCase() === 'true';
  } else {
    // Fallback to build-time environment variables
    apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8000';
    logLevel = process.env.REACT_APP_LOG_LEVEL || 'info';
    jiraEnabled = (process.env.REACT_APP_JIRA_ENABLED || 'false').toLowerCase() === 'true';
  }

  // Ensure URLs don't have trailing slashes
  apiUrl = apiUrl.replace(/\/$/, '');
  wsUrl = wsUrl.replace(/\/$/, '');

  return {
    apiUrl,
    wsUrl,
    logLevel,
    jiraEnabled,
  };
}

export const config = getConfig();

// Log configuration (safe for production, non-sensitive data only)
if (typeof window !== 'undefined' && config.logLevel === 'debug') {
  console.log('[Config] Loaded configuration:', {
    apiUrl: config.apiUrl,
    wsUrl: config.wsUrl,
    logLevel: config.logLevel,
    jiraEnabled: config.jiraEnabled,
  });
}

export default config;
