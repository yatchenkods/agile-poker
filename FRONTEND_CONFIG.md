# Frontend Runtime Configuration

## Problem

React environment variables (`REACT_APP_*`) are baked into the JavaScript bundle at **build time**, not runtime. This means:

- ❌ You can't change `REACT_APP_API_URL` via Kubernetes environment variables
- ❌ Same Docker image can't be used in different environments (dev/staging/prod)
- ❌ You need to rebuild Docker image for each environment

## Solution

We inject a `config.js` file at **runtime** (container startup) with all configuration values.

### How It Works

1. **Helm initContainer** generates `/app/build/config.js` with values from `values.yaml`
2. **React HTML** includes this script: `<script src="/config.js"></script>`
3. **React app** reads config from `window.__RUNTIME_CONFIG__`

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
2. **initContainer runs** - Before main container, initContainer executes:
   ```bash
   cat > /app/build/config.js << 'EOF'
   window.__RUNTIME_CONFIG__ = {
     REACT_APP_API_URL: '{{ values from Helm }}',
     REACT_APP_LOG_LEVEL: '...',
     REACT_APP_JIRA_ENABLED: '...'
   };
   EOF
   ```
3. **Volume shared** - Both initContainer and main container share `/app/build` volume
4. **Application starts** - Main container starts and serves files including generated `config.js`
5. **Browser loads HTML** - React HTML includes `<script src="/config.js"></script>`
6. **Config loaded** - JavaScript runs and `window.__RUNTIME_CONFIG__` is available
7. **App reads config** - React app reads from `window.__RUNTIME_CONFIG__`

### Volume setup:

```yaml
volumes:
  - name: app-build
    emptyDir: {}  # Temporary volume shared between initContainer and main container

volumeMounts:
  - name: app-build
    mountPath: /app/build
```

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
✅ **No nginx rebuild** - Works with any Node.js or static server  

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
# View initContainer logs
kubectl logs -f deployment/agile-poker-frontend -c config-init

# View main container logs
kubectl logs -f deployment/agile-poker-frontend -c frontend
```

### Verify config.js was written

```bash
# Exec into running pod
kubectl exec -it deployment/agile-poker-frontend -- sh

# Check if file exists
cat /app/build/config.js
```

## Adding New Config Variables

### 1. Add to `helm/values.yaml`:
```yaml
frontend:
  env:
    REACT_APP_MY_VAR: "my-value"
```

### 2. Update `helm/templates/frontend-deployment.yaml` initContainer script:

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
- ✅ Use `/app/build` directory for React build files (or configure volume mount)
- ✅ Have a web server (nginx, Node.js, etc.) serving static files
- ✅ Support serving files from `/app/build/` or mount point

### Example Dockerfile:

```dockerfile
FROM node:18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /app/build
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
```

### Example nginx.conf:

```nginx
server {
    listen 3000;
    location / {
        root /app/build;
        try_files $uri /index.html;
    }
}
```
