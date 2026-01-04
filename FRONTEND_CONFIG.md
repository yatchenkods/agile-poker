# Frontend Runtime Configuration

## Problem

React environment variables (`REACT_APP_*`) are baked into the JavaScript bundle at **build time**, not runtime. This means:

- ❌ You can't change `REACT_APP_API_URL` via Kubernetes environment variables
- ❌ Same Docker image can't be used in different environments (dev/staging/prod)
- ❌ You need to rebuild Docker image for each environment

## Solution

We inject a `config.js` file at **runtime** (before application startup) with all configuration values using Kubernetes container command override.

### How It Works

1. **Container starts** - Kubernetes launches frontend container
2. **Config generated** - Container command generates `/app/build/config.js` BEFORE the app starts
3. **Application starts** - Web server starts and serves all files including `config.js`
4. **React HTML** includes this script: `<script src="/config.js"></script>`
5. **React app** reads config from `window.__RUNTIME_CONFIG__`

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
2. **Container initializes** - Container starts with command override
3. **Config generated FIRST** - Before app starts, script creates config.js:
   ```bash
   cat > /app/build/config.js << 'EOF'
   window.__RUNTIME_CONFIG__ = {
     REACT_APP_API_URL: '{{ values from Helm }}',
     REACT_APP_LOG_LEVEL: '...',
     REACT_APP_JIRA_ENABLED: '...'
   };
   EOF
   ```
4. **Application starts** - After config.js created, main app command executes (e.g., `npm start`)
5. **Web server running** - Serves all files from `/app/build` including `config.js`
6. **Browser loads HTML** - React HTML includes `<script src="/config.js"></script>`
7. **Config loaded** - JavaScript runs and `window.__RUNTIME_CONFIG__` is available
8. **App reads config** - React app reads from `window.__RUNTIME_CONFIG__`

### Container Command in Deployment:

```yaml
containers:
  - name: frontend
    image: "..."
    # Override container command to generate config BEFORE starting app
    command:
      - sh
      - -c
      - |
        # Create config.js
        cat > /app/build/config.js << 'EOF'
        window.__RUNTIME_CONFIG__ = {
          REACT_APP_API_URL: '{{ .Values.frontend.env.REACT_APP_API_URL }}',
          REACT_APP_LOG_LEVEL: '{{ .Values.frontend.env.REACT_APP_LOG_LEVEL }}',
          REACT_APP_JIRA_ENABLED: '{{ .Values.frontend.env.REACT_APP_JIRA_ENABLED }}'
        };
        EOF
        echo "Config generated successfully"
        
        # Then start the application
        exec "$@"
    args:
      - npm
      - start
```

### Why this approach?

| Aspect | Container Command | postStart Hook | initContainer |
|--------|------------------|----------------|---------------|
| **Timing** | Before app starts | After app starts (async) | Before container |
| **Files preserved** | ✅ Yes | ✅ Yes | ❌ No (needs emptyDir) |
| **Reliability** | ✅ Guaranteed | ❌ Race condition | ✅ Works |
| **Our choice** | ✅ SELECTED | ❌ Not reliable | ❌ Overwrites /app/build |

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
✅ **Guaranteed execution** - Config created before app starts  
✅ **Works with any server** - nginx, Node.js, Apache, etc.  

## Troubleshooting

### Config not loading in browser?

**Step 1: Check browser console**
```javascript
console.log(window.__RUNTIME_CONFIG__);
```

If undefined, check Network tab:
- Does `config.js` appear in requests?
- What's the HTTP status (200, 404, etc.)?

**Step 2: Check pod logs**
```bash
kubectl logs -f deployment/agile-poker-frontend -c frontend

# Look for output like:
# Config generated successfully
```

**Step 3: Verify file was created**
```bash
# Exec into running pod
kubectl exec -it deployment/agile-poker-frontend -- sh

# Check if file exists and has content
cat /app/build/config.js

# Check all files in build directory
ls -la /app/build/
```

**Step 4: Check HTTP endpoint directly**
```bash
# Port-forward
kubectl port-forward svc/agile-poker-frontend 3000:3000

# Test in separate terminal
curl http://localhost:3000/config.js

# Should return the JavaScript config object
```

### Common Issues

**Issue: 404 Not Found for config.js**
- Check that `/app/build` directory exists in Docker image
- Verify web server is configured to serve from `/app/build`
- Check file permissions: `ls -la /app/build/config.js`

**Issue: config.js is empty or malformed**
- Check for syntax errors in Helm templates
- Verify all variables are properly quoted
- Check pod logs for script execution errors

**Issue: HTML loads but config.js doesn't download**
- Check browser Network tab for actual request
- Verify script tag in public/index.html
- Check Content-Type header (should be `application/javascript`)
- Check CORS if frontend and backend on different origins

## Adding New Config Variables

### 1. Add to `helm/values.yaml`:
```yaml
frontend:
  env:
    REACT_APP_MY_VAR: "my-value"
```

### 2. Update `helm/templates/frontend-deployment.yaml` command:

Add to the config.js generation section:
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
- ✅ Have `/app/build` directory accessible and writable for config.js creation
- ✅ Default command should be the app startup command (e.g., `npm start`, `serve -s build`)

### Example Dockerfile with npm:

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
# Default command will be overridden by Helm, but set a sensible default
CMD ["serve", "-s", "build", "-l", "3000"]
```

### Example Dockerfile with nginx:

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
    
    # Allow serving all static files
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Explicitly allow config.js
    location = /config.js {
        try_files $uri =404;
        add_header Content-Type application/javascript;
    }
    
    # Gzip compress responses
    gzip on;
    gzip_types text/javascript application/javascript application/json text/css;
}
```

## Debugging Command Execution

To debug if the command is running correctly:

```bash
# View container spec to verify command override
kubectl get pod <pod-name> -o yaml | grep -A 20 "command:"

# Check if config.js was created
kubectl exec <pod-name> -- cat /app/build/config.js

# Check application startup logs
kubectl logs <pod-name> --tail=50
```
