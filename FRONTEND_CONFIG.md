# Frontend Runtime Configuration

## Problem

React environment variables (`REACT_APP_*`) are baked into the JavaScript bundle at **build time**, not runtime. This means:

- ❌ You can't change `REACT_APP_API_URL` via Kubernetes environment variables
- ❌ Same Docker image can't be used in different environments (dev/staging/prod)
- ❌ You need to rebuild Docker image for each environment

## Solution

We inject a `config.js` file at **runtime** (container startup) with all configuration values using Kubernetes **postStart lifecycle hook**.

### How It Works

1. **Container starts** - Frontend container initializes with all files in `/app/build`
2. **postStart hook runs** - Kubernetes postStart hook generates `/app/build/config.js` from Helm values
3. **React HTML** includes this script: `<script src="/config.js"></script>`
4. **React app** reads config from `window.__RUNTIME_CONFIG__`

### Generated config.js

```javascript
window.__RUNTIME_CONFIG__ = {
  REACT_APP_API_URL: 'http://agile-poker.solo.stage.nl1.itechpsp.com/api',
  REACT_APP_LOG_LEVEL: 'debug',
  REACT_APP_JIRA_ENABLED: 'true'
};
```

## Frontend Implementation

### 1. Update `public/index.html`

Add script tag **before** React app loads:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <!-- Load runtime config -->
    <script src="%PUBLIC_URL%/config.js"></script>
    <!-- Your other head content -->
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

### 2. Create `src/config.js`

```javascript
// Read config from runtime-injected window object
// Falls back to process.env.REACT_APP_* for build-time values

export const getConfig = () => {
  if (window.__RUNTIME_CONFIG__) {
    return {
      apiUrl: window.__RUNTIME_CONFIG__.REACT_APP_API_URL,
      logLevel: window.__RUNTIME_CONFIG__.REACT_APP_LOG_LEVEL,
      jiraEnabled: window.__RUNTIME_CONFIG__.REACT_APP_JIRA_ENABLED === 'true',
    };
  }

  // Fallback to build-time env vars
  return {
    apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
    logLevel: process.env.REACT_APP_LOG_LEVEL || 'info',
    jiraEnabled: process.env.REACT_APP_JIRA_ENABLED === 'true',
  };
};

export const config = getConfig();
```

### 3. Use in Your App

```javascript
import { config } from './config';

// Use config.apiUrl instead of process.env.REACT_APP_API_URL
const response = await fetch(`${config.apiUrl}/auth/register`, {
  method: 'POST',
  body: JSON.stringify(data)
});
```

### 4. Or Create Custom Hook

```javascript
// src/hooks/useConfig.js
import { config } from '../config';

export const useConfig = () => {
  return config;
};

// Usage in component
const MyComponent = () => {
  const config = useConfig();
  const apiUrl = config.apiUrl;
  // ...
};
```

## How It Works in Kubernetes

### Step-by-step process:

1. **Pod starts** - Kubernetes creates frontend pod
2. **Container initializes** - Container starts, `/app/build` contains all React build files
3. **postStart hook runs** - AFTER container starts, postStart lifecycle hook executes:
   ```bash
   cat > /app/build/config.js << 'EOF'
   window.__RUNTIME_CONFIG__ = {
     REACT_APP_API_URL: '{{ values from Helm }}',
     REACT_APP_LOG_LEVEL: '...',
     REACT_APP_JIRA_ENABLED: '...'
   };
   EOF
   ```
4. **Config file added** - `config.js` is added to existing `/app/build` directory (doesn't replace it)
5. **Application running** - Web server serves all files including generated `config.js`
6. **Browser loads HTML** - React HTML includes `<script src="/config.js"></script>`
7. **Config loaded** - JavaScript runs and `window.__RUNTIME_CONFIG__` is available
8. **App reads config** - React app reads from `window.__RUNTIME_CONFIG__`

### postStart Hook in Deployment:

```yaml
lifecycle:
  postStart:
    exec:
      command:
        - sh
        - -c
        - |
          cat > /app/build/config.js << 'EOF'
          window.__RUNTIME_CONFIG__ = {
            REACT_APP_API_URL: '{{ .Values.frontend.env.REACT_APP_API_URL }}',
            REACT_APP_LOG_LEVEL: '{{ .Values.frontend.env.REACT_APP_LOG_LEVEL }}',
            REACT_APP_JIRA_ENABLED: '{{ .Values.frontend.env.REACT_APP_JIRA_ENABLED }}'
          };
          EOF
```

### Benefits of postStart vs initContainer:

| Aspect | postStart | initContainer |
|--------|-----------|---------------|
| **Container files** | ✅ Preserved | ❌ Replaced by emptyDir |
| **Execution time** | After container start | Before container start |
| **Use case** | Add config to existing files | Initialize from scratch |
| **Our usage** | ✅ Adds config.js to /app/build | ❌ Would replace /app/build |

## Deployment

### Development

```bash
helm install agile-poker ./helm -f helm/examples/values-dev.yaml
```

`config.js` will be generated with:
```javascript
window.__RUNTIME_CONFIG__ = {
  REACT_APP_API_URL: 'http://agile-poker:8000/api',
  REACT_APP_LOG_LEVEL: 'debug',
  REACT_APP_JIRA_ENABLED: 'true'
};
```

### Production

```bash
helm install agile-poker ./helm -f helm/examples/values-prod.yaml
```

`config.js` will be generated with:
```javascript
window.__RUNTIME_CONFIG__ = {
  REACT_APP_API_URL: 'https://agile-poker.yourdomain.com/api',
  REACT_APP_LOG_LEVEL: 'info',
  REACT_APP_JIRA_ENABLED: 'true'
};
```

## Benefits

✅ **One Docker image** - Deploy same image to all environments  
✅ **Runtime config** - Change config without rebuilding  
✅ **No secrets in image** - All sensitive data injected at runtime  
✅ **Environment-specific** - Different values for dev/staging/prod  
✅ **Easy to debug** - Open DevTools → check `window.__RUNTIME_CONFIG__`
✅ **Preserves build files** - All React build files are kept intact  
✅ **Works with any server** - nginx, Node.js, Apache, etc.  

## Troubleshooting

### Config not loading?

Check browser console:
```javascript
console.log(window.__RUNTIME_CONFIG__);
```

If undefined, ensure:
1. `config.js` is served (check Network tab)
2. Script tag is in `public/index.html`
3. Script loads **before** React app initialization
4. `/app/build` directory exists in your container

### Check generated config

```bash
# Port-forward to frontend
kubectl port-forward svc/agile-poker-frontend 3000:3000

# View config.js in browser
# https://localhost:3000/config.js

# Or via curl
curl http://localhost:3000/config.js
```

### Check pod logs

```bash
# View main container logs
kubectl logs -f deployment/agile-poker-frontend -c frontend

# Check for postStart hook errors
kubectl describe pod <pod-name>
# Look for 'postStart' events
```

### Verify config.js was written

```bash
# Exec into running pod
kubectl exec -it deployment/agile-poker-frontend -- sh

# Check if file exists and has correct content
cat /app/build/config.js
```

### Check container file structure

```bash
# List all files in /app/build
kubectl exec deployment/agile-poker-frontend -- ls -la /app/build/

# Should show your React build files PLUS config.js
```

## Adding New Config Variables

### 1. Add to `helm/values.yaml`:
```yaml
frontend:
  env:
    REACT_APP_MY_VAR: "my-value"
```

### 2. Update `helm/templates/frontend-deployment.yaml` postStart hook:

Add to the `cat > /app/build/config.js` section:
```bash
REACT_APP_MY_VAR: '{{ .Values.frontend.env.REACT_APP_MY_VAR }}',
```

### 3. Read in React:
```javascript
const myVar = window.__RUNTIME_CONFIG__.REACT_APP_MY_VAR;
```

## Docker Image Requirements

Your frontend Docker image should:
- ✅ Have build output in `/app/build` directory
- ✅ Have a web server serving static files from `/app/build/`
- ✅ Have `/app/build` directory accessible and writable for config.js generation

### Example Dockerfile:

```dockerfile
FROM node:18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:18
WORKDIR /app
COPY --from=builder /app/build ./build
RUN npm install -g serve
EXPOSE 3000
CMD ["serve", "-s", "build", "-l", "3000"]
```

Or with nginx:

```dockerfile
FROM node:18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
WORKDIR /app
COPY --from=builder /app/build ./build
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
```

### Example nginx.conf:

```nginx
server {
    listen 3000;
    root /app/build;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Allow serving config.js
    location = /config.js {
        try_files $uri =404;
    }
}
```
