# Runtime Configuration for Frontend

## Problem
Превично `REACT_APP_API_URL` и другие переменные окружения устанавливались только при сборке (build-time) React приложения. Это означало, что для изменения API endpoint необходимо было пересобирать Docker образ, что неудобно в production.

## Solution
Реализована система runtime конфигурации, которая позволяет переопределять переменные окружения **БЕЗ пересборки образа**.

## How It Works

### Architecture
```
┌─────────────────────────────────────────┐
│   Docker Container Startup              │
│   (entrypoint.sh)                       │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│   Read Environment Variables            │
│   (REACT_APP_API_URL, etc.)             │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│   Generate config.js with values        │
│   (injected into /app/build/)           │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│   Start Nginx                           │
│   (serves static files + config.js)     │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│   Browser loads index.html              │
│   Which loads config.js                 │
│   Sets window.__RUNTIME_CONFIG__        │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│   React app loads                       │
│   config.ts reads window.__RUNTIME_CONFIG__ │
│   Uses dynamic API endpoints            │
└─────────────────────────────────────────┘
```

## Key Components

### 1. entrypoint.sh
Bash скрипт, который запускается при старте контейнера. Генерирует `config.js` на основе переданных env переменных.

```bash
# Переменные инжектируются в config.js
REACT_APP_API_URL=${REACT_APP_API_URL:-http://localhost:8000}
REACT_APP_WS_URL=${REACT_APP_WS_URL:-ws://localhost:8000}
REACT_APP_JIRA_ENABLED=${REACT_APP_JIRA_ENABLED:-false}
REACT_APP_LOG_LEVEL=${REACT_APP_LOG_LEVEL:-info}
```

### 2. config.js
Динамически генерируемый скрипт, который устанавливает `window.__RUNTIME_CONFIG__` перед загрузкой React приложения.

```javascript
window.__RUNTIME_CONFIG__ = {
  REACT_APP_API_URL: 'http://api.example.com',
  REACT_APP_WS_URL: 'ws://api.example.com',
  REACT_APP_JIRA_ENABLED: 'false',
  REACT_APP_LOG_LEVEL: 'info',
};
```

### 3. config.ts (Frontend)
Загружает конфигурацию с приоритетом:
1. `window.__RUNTIME_CONFIG__` (runtime, от entrypoint.sh)
2. `process.env.REACT_APP_*` (build-time, при npm build)
3. Hardcoded defaults

### 4. Dockerfile
Обновлен для использования Nginx вместо `serve` и вызова `entrypoint.sh`.

### 5. nginx.conf
Настройки веб-сервера: SPA routing, compression, security headers, caching.

## Usage

### Docker Compose (Development)
```bash
# Default config
docker-compose up

# Override API endpoint
REACT_APP_API_URL=http://192.168.1.100:8000 docker-compose up

# Multiple overrides
REACT_APP_API_URL=https://api.example.com \
  REACT_APP_WS_URL=wss://api.example.com \
  REACT_APP_JIRA_ENABLED=true \
  docker-compose up
```

### Docker Run
```bash
# Build image
docker build -f frontend/Dockerfile -t agile-poker-frontend:latest .

# Run with custom API
docker run -d \
  -p 3000:3000 \
  -e REACT_APP_API_URL=https://api.example.com \
  -e REACT_APP_WS_URL=wss://api.example.com \
  agile-poker-frontend:latest
```

### docker-compose.prod.yml
```yaml
frontend:
  environment:
    REACT_APP_API_URL: ${API_URL:-http://localhost:8000}
    REACT_APP_WS_URL: ${WS_URL:-ws://localhost:8000}
    REACT_APP_JIRA_ENABLED: ${JIRA_ENABLED:-false}
```

Использование:
```bash
# С .env файлом
API_URL=https://api.company.com \
WS_URL=wss://api.company.com \
docker-compose -f docker-compose.prod.yml up -d

# Или через .env файл
echo "API_URL=https://api.company.com" > .env
echo "WS_URL=wss://api.company.com" >> .env
docker-compose -f docker-compose.prod.yml up -d
```

### Kubernetes
Для Kubernetes используйте ConfigMap или Secrets:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: agile-poker-config
data:
  REACT_APP_API_URL: "https://api.example.com"
  REACT_APP_WS_URL: "wss://api.example.com"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: agile-poker-frontend
spec:
  template:
    spec:
      containers:
      - name: frontend
        image: agile-poker-frontend:latest
        envFrom:
        - configMapRef:
            name: agile-poker-config
```

## Environment Variables

### REACT_APP_API_URL
- **Default**: `http://localhost:8000`
- **Type**: String (URL)
- **Description**: Backend API endpoint
- **Example**: `https://api.example.com`

### REACT_APP_WS_URL
- **Default**: `ws://localhost:8000`
- **Type**: String (URL)
- **Description**: WebSocket endpoint для real-time обновлений
- **Example**: `wss://api.example.com` (с SSL)

### REACT_APP_JIRA_ENABLED
- **Default**: `false`
- **Type**: Boolean ("true" или "false")
- **Description**: Включить/отключить Jira интеграцию
- **Example**: `true`

### REACT_APP_LOG_LEVEL
- **Default**: `info`
- **Type**: String
- **Description**: Уровень логирования (debug, info, warn, error)
- **Example**: `debug`

## Priority Order

Конфигурация загружается в следующем порядке приоритета:

1. **Runtime** (самый высокий) - `window.__RUNTIME_CONFIG__` (от entrypoint.sh)
2. **Build-time** - `process.env.REACT_APP_*` (при npm build)
3. **Defaults** (самый низкий) - Hardcoded defaults в config.ts

## Testing

### Проверка что конфигурация загружена
```javascript
// В браузере в консоли:
console.log(window.__RUNTIME_CONFIG__);
// Должно вывести конфигурацию
```

### Проверка при старте контейнера
```bash
docker logs agile-poker-frontend
# Должно быть что-то типа:
# [Frontend] Config generated:
#   API URL: http://api.example.com
#   WS URL: ws://api.example.com
```

## Migration Guide

### Для existing deployments

1. Пересобрать frontend образ:
   ```bash
   docker build -f frontend/Dockerfile -t agile-poker-frontend:new .
   ```

2. Обновить docker-compose:
   ```bash
   git pull
   docker-compose pull
   docker-compose up -d
   ```

3. Или обновить deployment в Kubernetes:
   ```bash
   kubectl set image deployment/agile-poker-frontend \
     frontend=agile-poker-frontend:new
   ```

## Benefits

✅ **Без пересборки** - меняйте API endpoint без rebuild образа
✅ **Production-ready** - поддержка environment variables в production
✅ **Kubernetes-friendly** - работает с ConfigMaps и Secrets
✅ **Backward compatible** - старые build-time переменные все еще работают
✅ **Security** - sensitive данные можно передавать через Secrets
✅ **Multi-environment** - легко переключаться между dev/staging/prod

## Troubleshooting

### API endpoint не меняется
1. Проверьте логи контейнера:
   ```bash
   docker logs agile-poker-frontend
   ```
2. Проверьте что конфигурация загружена в браузере:
   ```javascript
   window.__RUNTIME_CONFIG__
   ```
3. Очистите браузер cache (Ctrl+Shift+Delete)

### WebSocket не подключается
1. Убедитесь что `REACT_APP_WS_URL` правильно установлен
2. На production используйте `wss://` (WebSocket Secure)
3. Проверьте CORS headers в API

### Nginx не запускается
1. Проверьте права доступа на entrypoint.sh:
   ```bash
   chmod +x frontend/entrypoint.sh
   ```
2. Проверьте Dockerfile скопировал правильно nginx.conf

## Related Files

- `frontend/Dockerfile` - Docker image configuration
- `frontend/entrypoint.sh` - Runtime configuration injection script
- `frontend/nginx.conf` - Nginx web server configuration
- `frontend/public/config.js` - Dynamic configuration loader
- `frontend/src/config.ts` - Frontend configuration module
- `docker-compose.yml` - Development compose file
- `docker-compose.prod.yml` - Production compose file
