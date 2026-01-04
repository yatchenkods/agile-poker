# Helm Configuration Examples

This directory contains example configurations for different deployment scenarios.

## Quick Start

Choose the example that matches your setup and use it as a template for your deployment.

### Local Development
```bash
helm install agile-poker ./helm \
  --namespace agile-poker \
  --values examples/local-development.yaml
```

### Staging Environment
```bash
helm install agile-poker ./helm \
  --namespace agile-poker \
  --values examples/staging.yaml
```

### Production Environment
```bash
helm install agile-poker ./helm \
  --namespace agile-poker \
  --values examples/production.yaml
```

## Available Examples

### 1. `local-development.yaml`
**Use for**: Local Kubernetes cluster, minikube, Docker Desktop

**Features**:
- Uses `localhost` for all services
- Disables TLS/SSL
- Single replica for faster startup
- Minimal resource requirements
- Good for testing and development

**Domains**:
- API: `http://localhost:8000`
- Frontend: `http://localhost:3000`

### 2. `staging.yaml`
**Use for**: Staging/QA environment

**Features**:
- Self-signed certificates or Let's Encrypt staging
- Multiple replicas for HA testing
- Production-like setup but with reduced resources
- Example domain: `api.staging.example.com`, `app.staging.example.com`

**Domains**:
- API: `https://api.staging.example.com`
- Frontend: `https://app.staging.example.com`

### 3. `production.yaml`
**Use for**: Production environment

**Features**:
- Let's Encrypt with production CA
- Multiple replicas for high availability
- Full resource limits and requests
- Production-grade security settings
- Example domain: `api.example.com`, `app.example.com`

**Domains**:
- API: `https://api.example.com`
- Frontend: `https://app.example.com`

### 4. `custom-domains.yaml`
**Use for**: Template with placeholder domains

**Features**:
- Generic example showing all configuration options
- Easy to customize for any domain
- Includes all optional features
- Well-commented

**How to use**:
1. Copy `custom-domains.yaml` to `my-deployment.yaml`
2. Replace `api.example.com` with your API domain
3. Replace `app.example.com` with your app domain
4. Update CORS_ORIGINS with both domains
5. Deploy with: `helm install agile-poker ./helm -f my-deployment.yaml`

## Configuration Customization

Each example can be further customized. Common customizations:

### Change Database
```yaml
postgresql:
  enabled: false  # Use external PostgreSQL

env:
  DATABASE_URL: "postgresql://user:pass@postgres.example.com:5432/agile_poker"
```

### Change Redis
```yaml
redis:
  enabled: false  # Use external Redis

env:
  REDIS_URL: "redis://redis.example.com:6379"
```

### Add Custom Domains
```yaml
ingress:
  api:
    host: "api.my-company.com"
  frontend:
    host: "app.my-company.com"

frontend:
  env:
    REACT_APP_API_URL: "https://api.my-company.com"
    REACT_APP_WS_URL: "wss://api.my-company.com"

env:
  CORS_ORIGINS: "https://app.my-company.com,https://api.my-company.com"
```

### Enable Autoscaling
```yaml
autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80
```

### Add Security Context
```yaml
podSecurityContext:
  runAsNonRoot: true
  runAsUser: 1000
  fsGroup: 1000

securityContext:
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  capabilities:
    drop:
      - ALL
```

## DNS Setup

Before deploying, ensure you have DNS records for your domains:

```bash
# Get your Ingress IP
INGRESS_IP=$(kubectl get ingress -n agile-poker -o jsonpath='{.items[0].status.loadBalancer.ingress[0].ip}')
echo "Add DNS A records pointing to: $INGRESS_IP"
```

Add these DNS A records:
```
api.example.com      A    <INGRESS_IP>
app.example.com      A    <INGRESS_IP>
```

## Deployment Verification

After deployment, verify everything is working:

```bash
# Check Ingress resources
kubectl get ingress -n agile-poker

# Check all pods are running
kubectl get pods -n agile-poker

# Check services
kubectl get svc -n agile-poker

# View logs
kubectl logs -n agile-poker deployment/agile-poker
kubectl logs -n agile-poker deployment/agile-poker-frontend

# Test API endpoint
curl https://api.example.com/api/v1/auth/me -v

# Test Frontend
curl https://app.example.com/ -v
```

## Troubleshooting

See `helm/INGRESS_ROUTING_FIX.md` for detailed troubleshooting guide.

Common issues:
- **DNS not resolving**: Check DNS records point to correct Ingress IP
- **CORS errors**: Verify CORS_ORIGINS includes both domains
- **WebSocket errors**: Ensure WebSocket URLs point to API domain
- **Certificate errors**: Check cert-manager is installed and issuer configured

## Next Steps

1. Choose an example based on your environment
2. Copy and customize with your domain names
3. Ensure DNS records are in place
4. Deploy: `helm install agile-poker ./helm -f your-values.yaml`
5. Verify deployment
6. Test API and Frontend endpoints

## References

- [Helm Documentation](https://helm.sh/docs/)
- [Kubernetes Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress/)
- [INGRESS_ROUTING_FIX.md](../INGRESS_ROUTING_FIX.md) - Detailed explanation of the fix
