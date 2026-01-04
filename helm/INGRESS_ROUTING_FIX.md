# Kubernetes Ingress Routing Fix

## Problem Statement

When accessing API endpoints directly (e.g., `/api/v1/auth/me`), the endpoint was returning a React SPA error message instead of API response:

```
You need to enable JavaScript to run this app
```

This indicates that API requests were being routed to the frontend service instead of the backend API service.

## Root Cause Analysis

### Previous Configuration (Broken)

The previous Ingress configuration used a single Ingress resource with multiple path-based routes:

```yaml
rules:
  - host: example.com
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

Nginx Ingress Controller matches paths in order, but the `/` path matches ALL requests, including `/api/*` paths:

1. Request to `/api/v1/auth/me` matches `/api` path → Routes to backend:8000 ✓
2. BUT ALSO matches `/` path → Routes to frontend:3000 ✓
3. LAST match wins → Request routed to frontend:3000 ✗

The frontend receives the request and returns React SPA HTML instead of JSON.

## Solution: Separate Ingress Resources

Instead of using path-based routing on a single Ingress, use separate Ingress resources with different hostnames (subdomains):

### New Configuration (Fixed)

**API Ingress**:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: agile-poker-api
spec:
  rules:
    - host: api.example.com          # Separate API hostname
      http:
        paths:
          - path: /
            backend:
              service:
                name: agile-poker
                port: 8000
```

**Frontend Ingress**:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: agile-poker-frontend
spec:
  rules:
    - host: app.example.com          # Main application hostname
      http:
        paths:
          - path: /
            backend:
              service:
                name: agile-poker-frontend
                port: 3000
```

### Why This Works

Each Ingress resource matches on a DIFFERENT HOSTNAME, eliminating ambiguity:

- Requests to `api.example.com/*` → Always go to backend:8000
- Requests to `app.example.com/*` → Always go to frontend:3000

No path-matching conflicts occur.

## Implementation Details

### Files Changed

1. **helm/templates/ingress.yaml**
   - Split into two separate Ingress resources
   - Conditional rendering based on values
   - Uses configurable hostnames from values.yaml

2. **helm/values.yaml**
   - New structure: `ingress.api` and `ingress.frontend`
   - Frontend env vars with placeholder values:
     - `REACT_APP_API_URL: http://localhost:8000` (local default)
     - `REACT_APP_WS_URL: ws://localhost:8000` (local default)
   - Placeholder domains: `api.example.com`, `app.example.com`
   - Instructions to replace with actual domains

### Configuration Structure

```yaml
ingress:
  enabled: true
  className: "nginx"
  
  api:
    enabled: true
    host: "api.example.com"           # Set to your API domain
    annotations:
      cert-manager.io/cluster-issuer: "letsencrypt-prod"
      nginx.ingress.kubernetes.io/ssl-redirect: "true"
    tls:
      enabled: true
      secretName: api-tls-cert
  
  frontend:
    enabled: true
    host: "app.example.com"           # Set to your app domain
    annotations:
      cert-manager.io/cluster-issuer: "letsencrypt-prod"
      nginx.ingress.kubernetes.io/ssl-redirect: "true"
    tls:
      enabled: true
      secretName: frontend-tls-cert

frontend:
  env:
    REACT_APP_API_URL: "https://api.example.com"      # Set to your API domain
    REACT_APP_WS_URL: "wss://api.example.com"        # Set to your API domain

env:
  CORS_ORIGINS: "https://app.example.com,https://api.example.com"  # Set your domains
```

## Breaking Changes

### DNS Configuration Required

Both hostnames must resolve to the same Ingress Controller IP address:

```bash
# Get Ingress IP
kubectl get ingress -n <namespace>

# Both DNS records should point to the same IP:
api.example.com      A    <INGRESS_IP>
app.example.com      A    <INGRESS_IP>
```

### Frontend Configuration

Frontend applications must use the API subdomain instead of path-based routing.

Update these configuration fields in your `values.yaml` override:

```yaml
frontend:
  env:
    # Use your actual domain
    REACT_APP_API_URL: "https://api.your-domain.com"
    REACT_APP_WS_URL: "wss://api.your-domain.com"

env:
  # Include both domains
  CORS_ORIGINS: "https://app.your-domain.com,https://api.your-domain.com"
```

### CORS Configuration

Backend CORS settings must include both subdomains. Set via values.yaml:

```yaml
env:
  CORS_ORIGINS: "https://app.example.com,https://api.example.com"
```

## Migration Guide

### Step 1: Prepare Your Configuration

Create or update your Helm values override file with your actual domains:

```yaml
# my-values.yaml
ingress:
  api:
    host: "api.my-domain.com"
  frontend:
    host: "app.my-domain.com"

frontend:
  env:
    REACT_APP_API_URL: "https://api.my-domain.com"
    REACT_APP_WS_URL: "wss://api.my-domain.com"

env:
  CORS_ORIGINS: "https://app.my-domain.com,https://api.my-domain.com"
```

### Step 2: Update DNS Records

Add DNS A record for the API subdomain pointing to your Ingress IP:

```bash
# Get your Ingress IP
INGRESS_IP=$(kubectl get ingress -n agile-poker -o jsonpath='{.items[0].status.loadBalancer.ingress[0].ip}')
echo "Add DNS A records pointing to: $INGRESS_IP"

# Both records should point to the same IP:
# api.my-domain.com      A    <INGRESS_IP>
# app.my-domain.com      A    <INGRESS_IP>
```

### Step 3: Deploy the Updated Chart

```bash
helm upgrade agile-poker ./helm \
  --namespace agile-poker \
  --values my-values.yaml \
  --wait \
  --timeout 5m
```

### Step 4: Verify Ingress Resources

```bash
# Check that two Ingress resources exist
kubectl get ingress -n agile-poker

# Expected output:
# NAME                         CLASS   HOSTS                      AGE
# agile-poker-api             nginx   api.my-domain.com          1m
# agile-poker-frontend        nginx   app.my-domain.com          1m
```

### Step 5: Test Connectivity

```bash
# Test API endpoint
curl https://api.my-domain.com/api/v1/auth/me -v

# Expected response (without valid token):
# HTTP/2 403
# {"detail":"Not authenticated"}

# Test Frontend endpoint
curl https://app.my-domain.com/ -v

# Expected response:
# HTTP/2 200
# <!DOCTYPE html>
# <html>...</html>
```

## Benefits of This Approach

✅ **Eliminates Path Conflicts**: No ambiguous path matching  
✅ **Better Separation of Concerns**: Each Ingress handles one service  
✅ **Independent Scaling**: Frontend and API can scale independently  
✅ **Cleaner Configuration**: Easier to understand and maintain  
✅ **Follows Best Practices**: Subdomains for different services is standard in microservices  
✅ **Better for Security**: Can apply different policies per service  
✅ **Simplified CORS**: Each subdomain is a separate origin  

## Troubleshooting

### API Still Returns React SPA

```bash
# Check DNS resolution
echo "API domain:"
nslookup api.my-domain.com

echo "\nApp domain:"
nslookup app.my-domain.com

# Both should resolve to the same IP (your Ingress IP)

# Check Ingress status
kubectl describe ingress agile-poker-api -n agile-poker
kubectl describe ingress agile-poker-frontend -n agile-poker

# Check Ingress Controller logs
kubectl logs -n ingress-nginx deployment/nginx-ingress-controller | grep my-domain
```

### CORS Errors

```bash
# Verify CORS_ORIGINS in backend config
kubectl get configmap agile-poker -n agile-poker -o yaml | grep CORS_ORIGINS

# Should include both:
# CORS_ORIGINS: https://app.my-domain.com,https://api.my-domain.com

# Or check deployment env
kubectl get deployment agile-poker -n agile-poker -o yaml | grep CORS_ORIGINS
```

### WebSocket Not Working

```bash
# Verify WebSocket URL in frontend
kubectl get pods -n agile-poker -l app=agile-poker-frontend -o yaml | grep REACT_APP_WS

# Should be:
# REACT_APP_WS_URL: wss://api.my-domain.com
```

## Quick Configuration Checklist

- [ ] Decide on API and Frontend hostnames
- [ ] Update values.yaml with your hostnames
- [ ] Add DNS A records pointing to your Ingress IP
- [ ] Update CORS_ORIGINS with your domains
- [ ] Deploy with: `helm upgrade agile-poker ./helm -f my-values.yaml`
- [ ] Verify Ingress resources: `kubectl get ingress`
- [ ] Test API endpoint
- [ ] Test Frontend endpoint
- [ ] Check browser console for CORS errors

## References

- [Kubernetes Ingress Documentation](https://kubernetes.io/docs/concepts/services-networking/ingress/)
- [Nginx Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [Nginx Path Matching Rules](https://kubernetes.github.io/ingress-nginx/user-guide/ingress-path-matching/)
- [Best Practices for Microservices Networking](https://kubernetes.io/docs/concepts/services-networking/)
