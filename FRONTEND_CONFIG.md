# Frontend Runtime Configuration

## Problem

React environment variables (`REACT_APP_*`) are baked into the JavaScript bundle at **build time**, not runtime. This means:

- ❌ You can't change `REACT_APP_API_URL` via Kubernetes environment variables
- ❌ Same Docker image can't be used in different environments (dev/staging/prod)
- ❌ You need to rebuild Docker image for each environment

## Solution

We inject a `config.js` file at **runtime** (before application startup) with all configuration values. The initialization script from ConfigMap generates the config, then delegates to the original Docker entrypoint.

### How It Works

1. **Container starts** - Kubernetes launches frontend container
2. **Init script runs** - `/app/init/init.sh` (from ConfigMap) executes
3. **Config generated** - Script creates `/app/build/config.js` from Helm values
4. **Original entrypoint called** - Script delegates to Docker ENTRYPOINT/CMD via `exec "$@"`
5. **Application starts** - Original startup command is preserved
6. **React HTML** includes this script: `<script src="/config.js"></script>`
7. **React app** reads config from `window.__RUNTIME_CONFIG__`

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

```
1. Pod starts → Kubernetes creates frontend pod
   ↓
2. Init script mounts → /app/init/init.sh (from ConfigMap) mounted
   ↓
3. Container executes → /app/init/init.sh runs as main container command
   ↓
4. Config generated → init.sh creates /app/build/config.js from Helm values
   ↓
5. Original entrypoint called → exec "$@" delegates to Docker ENTRYPOINT/CMD
   ↓
6. App starts normally → With original startup parameters
   ↓
7. Config available → Browser loads config.js ✅
```

### Helm Architecture:

**frontend-init-script.yaml** (ConfigMap):
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: agile-poker-frontend-init
data:
  init.sh: |
    #!/bin/sh
    # Generate config.js from values
    cat > /app/build/config.js << 'EOF'
    window.__RUNTIME_CONFIG__ = {...};
    EOF
    # Delegate to original Docker command
    exec "$@"
```

**frontend-deployment.yaml**:
```yaml
containers:
  - name: frontend
    image: "..."
    command:
      - /app/init/init.sh  # Use init script instead of Docker ENTRYPOINT
    volumeMounts:
      - name: init-script
        mountPath: /app/init
        readOnly: true
volumes:
  - name: init-script
    configMap:
      name: agile-poker-frontend-init
      defaultMode: 0755  # Make script executable
```

### Why This Approach?

| Aspect | ConfigMap Init Script | Container Command | postStart Hook | initContainer |
|--------|----------------------|-------------------|----------------|---------------|
| **Preserves Docker CMD** | ✅ Via `exec "$@"` | ❌ Replaces it | ✅ Yes | ✅ Yes |
| **Timing** | Before app starts | Before app starts | Async/parallel | Before container |
| **Reliability** | ✅ Guaranteed | ✅ Guaranteed | ❌ Race condition | ✅ Guaranteed |
| **Config in /app/build** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ Needs emptyDir |
| **Complexity** | ✅ Simple | Medium | Simple | Medium |
| **Our choice** | ✅ SELECTED | Too opinionated | Unreliable | Overcomplicates |

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
✅ **Preserves Docker entrypoint** - Original startup command is unchanged  
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

**Step 2: Check pod logs for init script execution**
```bash
kubectl logs -f deployment/agile-poker-frontend -c frontend

# Look for output like:
# [2026-01-04 17:59:06] Config generated at /app/build/config.js
```

**Step 3: Verify ConfigMap was created**
```bash
# Check ConfigMap
kubectl get configmap agile-poker-frontend-init
kubectl describe configmap agile-poker-frontend-init

# View the script
kubectl get configmap agile-poker-frontend-init -o jsonpath='{.data.init\.sh}'
```

**Step 4: Verify file was created**
```bash
# Exec into running pod
kubectl exec -it deployment/agile-poker-frontend -- sh

# Check if file exists and has content
cat /app/build/config.js

# Check all files in build directory
ls -la /app/build/
```

**Step 5: Check HTTP endpoint directly**
```bash
# Port-forward
kubectl port-forward svc/agile-poker-frontend 3000:3000

# Test in separate terminal
curl http://localhost:3000/config.js

# Should return the JavaScript config object
```

### Common Issues

**Issue: "permission denied" error for init.sh**
- ConfigMap defaultMode should be `0755`
- Check: `kubectl get configmap agile-poker-frontend-init -o yaml`
- Should see: `defaultMode: 755` in volume section

**Issue: 404 Not Found for config.js**
- Check that `/app/build` directory exists in Docker image
- Verify web server is configured to serve from `/app/build`
- Check file permissions: `ls -la /app/build/config.js`

**Issue: config.js is empty or malformed**
- Check for syntax errors in ConfigMap script
- Verify all Helm variables are properly quoted
- Check pod logs for script execution errors
- Validate YAML syntax: `helm template agile-poker ./helm | grep -A 50 config.js`

**Issue: Original app doesn't start**
- Verify Docker image has proper ENTRYPOINT/CMD
- Check if `$@` expansion works in your shell
- View pod events: `kubectl describe pod <pod-name>`
- Check logs for errors after config generation

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

### 2. Update `helm/templates/frontend-init-script.yaml` script:

Add to the config.js generation section in ConfigMap:
```javascript
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
- ✅ Have proper ENTRYPOINT and/or CMD configured

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
# Helm will mount init script and override this command
# but having a sensible default is good
CMD ["serve", "-s", "build", "-l", "3000"]
```

### Example with nginx:

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
ENTRYPOINT ["nginx", "-g", "daemon off;"]
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

## Debugging Init Script

To debug if the init script is running correctly:

```bash
# View pod spec to verify init script mount
kubectl get pod <pod-name> -o yaml | grep -A 20 "volumeMounts:"

# Check if ConfigMap exists
kubectl get configmap -l app.kubernetes.io/name=agile-poker

# View ConfigMap content
kubectl get configmap agile-poker-frontend-init -o yaml

# Check if config.js was created
kubectl exec <pod-name> -- cat /app/build/config.js

# Check pod logs for init script output
kubectl logs <pod-name> | grep "Config generated"

# View pod events
kubectl describe pod <pod-name> | grep -A 10 Events
```

## Testing Locally

You can test the init script locally:

```bash
# Create test directory
mkdir -p /tmp/test-build

# Create test script
cat > /tmp/init.sh << 'EOF'
#!/bin/sh
set -e
cat > /tmp/test-build/config.js << 'EOFJS'
window.__RUNTIME_CONFIG__ = {
  REACT_APP_API_URL: 'http://localhost/api',
  REACT_APP_LOG_LEVEL: 'debug',
  REACT_APP_JIRA_ENABLED: 'true'
};
EOFJS
echo "[$(date)] Config generated"
exec "$@"
EOF

chmod +x /tmp/init.sh

# Test with a simple command
/tmp/init.sh echo "Hello from app!"

# Verify output
cat /tmp/test-build/config.js
```
