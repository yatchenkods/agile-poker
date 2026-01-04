# Kubernetes Ingress Routing Fix

## Problem Statement

When accessing `http://agile-poker.solo.stage.nl1.itechpsp.com/api/v1/auth/me`, the API endpoint was returning:

```
You need to enable JavaScript to run this app
```

This is the React SPA error message, indicating that the API request was being routed to the frontend service instead of the backend API service.

## Root Cause Analysis

### Previous Configuration (Broken)

The previous Ingress configuration used a single Ingress resource with multiple paths:

```yaml
rules:
  - host: agile-poker.solo.stage.nl1.itechpsp.com
    http:
      paths:
        - path: /api
          backend:
            service:
              name: agile-poker
              port: 8000
        - path: /
          backend:
            service:
              name: agile-poker-frontend
              port: 3000
```

### Why This Failed

Nginx Ingress Controller matches paths in order, but the `/` path matches ALL requests, including `/api/*` paths. When a request comes to `/api/v1/auth/me`:

1. Matches `/api` path → Routes to backend:8000 ✓
2. BUT ALSO matches `/` path → Routes to frontend:3000 ✓
3. LAST match wins → Request routed to frontend:3000 ✗

The frontend receives the request and returns the React SPA HTML instead of JSON.

## Solution: Separate Ingress Resources

Instead of using path-based routing on a single Ingress, we now use separate Ingress resources with different hostnames (subdomains):

### New Configuration (Fixed)

**API Ingress** (`agile-poker-api`):
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: agile-poker-api
spec:
  rules:
    - host: api.solo.stage.nl1.itechpsp.com
      http:
        paths:
          - path: /
            backend:
              service:
                name: agile-poker
                port: 8000
```

**Frontend Ingress** (`agile-poker-frontend`):
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: agile-poker-frontend
spec:
  rules:
    - host: agile-poker.solo.stage.nl1.itechpsp.com
      http:
        paths:
          - path: /
            backend:
              service:
                name: agile-poker-frontend
                port: 3000
```

### Why This Works

Each Ingress resource matches on a DIFFERENT HOSTNAME:
- Requests to `api.solo.stage.nl1.itechpsp.com/*` → Always go to backend:8000
- Requests to `agile-poker.solo.stage.nl1.itechpsp.com/*` → Always go to frontend:3000

There's no ambiguity or path-matching conflict.

## Implementation Details

### Files Changed

1. **helm/templates/ingress.yaml**
   - Split into two separate Ingress resources
   - Conditional rendering based on values
   - Uses api.host and frontend.host from values

2. **helm/values.yaml**
   - New structure: `ingress.api` and `ingress.frontend`
   - Frontend env vars updated:
     - `REACT_APP_API_URL: https://api.solo.stage.nl1.itechpsp.com`
     - `REACT_APP_WS_URL: wss://api.solo.stage.nl1.itechpsp.com`
   - CORS_ORIGINS includes both subdomains

### Configuration Structure

```yaml
ingress:
  enabled: true
  className: "nginx"
  
  api:
    enabled: true
    host: api.solo.stage.nl1.itechpsp.com
    annotations:
      cert-manager.io/cluster-issuer: "letsencrypt-prod"
      nginx.ingress.kubernetes.io/ssl-redirect: "true"
    tls:
      enabled: true
      secretName: api-tls-cert
  
  frontend:
    enabled: true
    host: agile-poker.solo.stage.nl1.itechpsp.com
    annotations:
      cert-manager.io/cluster-issuer: "letsencrypt-prod"
      nginx.ingress.kubernetes.io/ssl-redirect: "true"
    tls:
      enabled: true
      secretName: frontend-tls-cert
```

## Breaking Changes

### DNS Configuration Required

Both hostnames must resolve to the same Ingress Controller IP address:

```bash
# Get Ingress IP
kubectl get ingress -n agile-poker

# Both DNS records should point to the same IP:
api.solo.stage.nl1.itechpsp.com          A    <INGRESS_IP>
agile-poker.solo.stage.nl1.itechpsp.com  A    <INGRESS_IP>
```

### Frontend Configuration

Frontend applications must be updated to use the new API URL:

```javascript
// Old (path-based):
const API_URL = 'https://agile-poker.solo.stage.nl1.itechpsp.com/api';

// New (subdomain-based):
const API_URL = 'https://api.solo.stage.nl1.itechpsp.com';
```

This is automatically configured via environment variable in the Helm chart:
```yaml
REACT_APP_API_URL: "https://api.solo.stage.nl1.itechpsp.com"
```

### CORS Configuration

Backend CORS settings must include both subdomains:

```yaml
env:
  CORS_ORIGINS: "https://agile-poker.solo.stage.nl1.itechpsp.com,https://api.solo.stage.nl1.itechpsp.com"
```

## Migration Guide

### Step 1: Update DNS Records

Add DNS A record for the API subdomain pointing to your Ingress IP:
```
api.solo.stage.nl1.itechpsp.com  A  <INGRESS_IP>
```

### Step 2: Update Helm Release

```bash
helm upgrade agile-poker ./helm \
  --namespace agile-poker \
  --values helm/values.yaml
```

### Step 3: Verify Ingress Resources

```bash
# Check that two Ingress resources exist
kubectl get ingress -n agile-poker

# Expected output:
# NAME                         CLASS   HOSTS                                    AGE
# agile-poker-api             nginx   api.solo.stage.nl1.itechpsp.com         1m
# agile-poker-frontend        nginx   agile-poker.solo.stage.nl1.itechpsp.com 1m
```

### Step 4: Test Connectivity

```bash
# Test API endpoint
curl https://api.solo.stage.nl1.itechpsp.com/api/v1/auth/me -v

# Expected response:
# HTTP/2 403
# {"detail":"Not authenticated"}

# Test Frontend endpoint
curl https://agile-poker.solo.stage.nl1.itechpsp.com/ -v

# Expected response:
# HTTP/2 200
# <!DOCTYPE html>
# <html>...</html>
```

## Benefits of This Approach

1. **Eliminates Path Conflicts**: No ambiguous path matching
2. **Better Separation of Concerns**: Each Ingress handles one service
3. **Independent Scaling**: Frontend and API can be scaled independently
4. **Cleaner Configuration**: Easier to understand and maintain
5. **Follows Best Practices**: Subdomains for different services is standard in microservices
6. **Better for Security**: Can apply different annotations and policies per service
7. **Simplified CORS**: Each subdomain is a different origin

## Troubleshooting

### API Still Returns React SPA

```bash
# Check DNS resolution
nslookup api.solo.stage.nl1.itechpsp.com

# Should resolve to the same IP as the frontend domain
nslookup agile-poker.solo.stage.nl1.itechpsp.com

# Check Ingress status
kubectl describe ingress agile-poker-api -n agile-poker
kubectl describe ingress agile-poker-frontend -n agile-poker

# Check Ingress Controller logs
kubectl logs -n ingress-nginx deployment/nginx-ingress-controller | grep api.solo
```

### CORS Errors

```bash
# Verify CORS_ORIGINS in backend config
kubectl get configmap agile-poker -n agile-poker -o yaml | grep CORS_ORIGINS

# Should include both:
# CORS_ORIGINS: https://agile-poker.solo.stage.nl1.itechpsp.com,https://api.solo.stage.nl1.itechpsp.com
```

### WebSocket Not Working

```bash
# Verify WebSocket URL in frontend
kubectl get pods -n agile-poker -l app=agile-poker-frontend -o yaml | grep REACT_APP_WS

# Should be:
# REACT_APP_WS_URL: wss://api.solo.stage.nl1.itechpsp.com
```

## References

- [Kubernetes Ingress Documentation](https://kubernetes.io/docs/concepts/services-networking/ingress/)
- [Nginx Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [Nginx Path Matching Rules](https://kubernetes.github.io/ingress-nginx/user-guide/ingress-path-matching/)
- [Best Practices for Microservices Networking](https://kubernetes.io/docs/concepts/services-networking/)
