/**
 * Runtime configuration loader for frontend
 * Supports both build-time and runtime environment variables
 * 
 * Priority order:
 * 1. window.__RUNTIME_CONFIG__ (injected at runtime by entrypoint.sh)
 * 2. process.env.REACT_APP_* (build-time environment variables)
 * 3. Hardcoded defaults
 */

export interface RuntimeConfig {
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

/**
 * Get current configuration
 * This function is called dynamically to ensure runtime config is available
 * (not just at module load time)
 */
function getConfig(): RuntimeConfig {
  let apiUrl: string;
  let wsUrl: string;
  let logLevel: string;
  let jiraEnabled: boolean;

  // Determine source of configuration
  const hasRuntimeConfig = typeof window !== 'undefined' && window.__RUNTIME_CONFIG__;
  
  if (hasRuntimeConfig) {
    // Priority 1: Runtime config (from window.__RUNTIME_CONFIG__)
    apiUrl = window.__RUNTIME_CONFIG__!.REACT_APP_API_URL || '';
    wsUrl = window.__RUNTIME_CONFIG__!.REACT_APP_WS_URL || '';
    logLevel = window.__RUNTIME_CONFIG__!.REACT_APP_LOG_LEVEL || '';
    jiraEnabled = (window.__RUNTIME_CONFIG__!.REACT_APP_JIRA_ENABLED || 'false').toLowerCase() === 'true';
    
    // Log that we're using runtime config
    console.log('[Config] Using runtime configuration from window.__RUNTIME_CONFIG__');
  } else {
    // Priority 2: Build-time environment variables
    apiUrl = process.env.REACT_APP_API_URL || '';
    wsUrl = process.env.REACT_APP_WS_URL || '';
    logLevel = process.env.REACT_APP_LOG_LEVEL || '';
    jiraEnabled = (process.env.REACT_APP_JIRA_ENABLED || 'false').toLowerCase() === 'true';
    
    if (apiUrl || wsUrl) {
      console.log('[Config] Using build-time environment variables');
    }
  }
  
  // Priority 3: Apply defaults (these are the fallbacks)
  apiUrl = apiUrl || 'http://localhost:8000';
  wsUrl = wsUrl || 'ws://localhost:8000';
  logLevel = logLevel || 'info';
  // jiraEnabled is already boolean, defaults to false

  // Ensure URLs don't have trailing slashes
  apiUrl = apiUrl.replace(/\/$/, '');
  wsUrl = wsUrl.replace(/\/$/, '');

  // Log final configuration (safe for production, only non-sensitive data)
  const shouldLog = typeof window !== 'undefined' && (logLevel === 'debug' || logLevel === 'trace');
  if (shouldLog) {
    console.log('[Config] Final configuration loaded:', {
      apiUrl,
      wsUrl,
      logLevel,
      jiraEnabled,
      source: hasRuntimeConfig ? 'runtime' : 'environment/defaults',
    });
  }

  return {
    apiUrl,
    wsUrl,
    logLevel,
    jiraEnabled,
  };
}

// Create a getter for lazy loading the configuration
// This ensures config is read when actually needed, not at module import time
let cachedConfig: RuntimeConfig | null = null;

function getConfigValue(): RuntimeConfig {
  if (!cachedConfig) {
    cachedConfig = getConfig();
  }
  return cachedConfig;
}

// Re-evaluate config when accessed (in case window.__RUNTIME_CONFIG__ changes)
// This is useful for hot reload or if config is injected after module load
Object.defineProperty(globalThis, '__getConfig', {
  value: getConfigValue,
  writable: false,
  enumerable: false,
});

// Export a proxy object that always reads fresh config
export const config = new Proxy({} as RuntimeConfig, {
  get: (target, prop) => {
    const currentConfig = getConfigValue();
    return currentConfig[prop as keyof RuntimeConfig];
  },
});

export default config;

// Also export a function to manually get fresh config (useful for debugging)
export function refreshConfig(): RuntimeConfig {
  cachedConfig = null;
  return getConfigValue();
}

// Export a function to get config at a specific moment
export function getConfigNow(): RuntimeConfig {
  return getConfig();
}
