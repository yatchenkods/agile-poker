# Agile Poker Helm Chart

Helm чарт для развертывания приложения **Agile Planning Poker** в Kubernetes кластере.

## Предварительные требования

- Kubernetes 1.19+
- Helm 3.0+
- PostgreSQL база данных (или используйте встроенную PostgreSQL из чарта)
- Redis (опционально, для кэширования)

## Установка

### 1. Добавьте Helm репозиторий

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
```

### 2. Обновите зависимости чарта

Зависимости определены в `Chart.yaml` и автоматически скачиваются при установке. Если нужно обновить:

```bash
cd helm
helm dependency update
cd ..
```

### 3. Установите чарт

**С дефолтными значениями:**

```bash
helm install agile-poker ./helm
```

**С кастомными значениями:**

```bash
helm install agile-poker ./helm -f helm/examples/values-production.yaml
```

### 4. Проверьте развертывание

```bash
kubectl get pods -l app.kubernetes.io/name=agile-poker
kubectl describe pod <pod-name>
kubectl logs <pod-name>
```

## Runtime Configuration

Frontend приложение использует **runtime configuration** для API endpoints и других параметров.

Это позволяет использовать **один Docker image** для разных окружений (dev, staging, production).

### Frontend Runtime Variables

Все переменные указываются в `frontend.env` секции values.yaml:

```yaml
frontend:
  env:
    # API endpoint - must be accessible from the browser
    REACT_APP_API_URL: "https://api.example.com"
    # WebSocket endpoint for real-time updates (use wss:// for SSL)
    REACT_APP_WS_URL: "wss://api.example.com"
    # Enable/disable Jira integration
    REACT_APP_JIRA_ENABLED: "false"
    # Logging level: debug, info, warn, error
    REACT_APP_LOG_LEVEL: "info"
```

### Как это работает

1. **Container startup** - Kubernetes передает env переменные в контейнер
2. **entrypoint.sh** - На старте контейнера:
   - Читает `REACT_APP_*` переменные
   - Генерирует `config.js` с runtime значениями
   - Инжектирует `window.__RUNTIME_CONFIG__` в браузер
3. **React app** - Использует `window.__RUNTIME_CONFIG__` для API endpoints
4. **API requests** - Все запросы используют актуальные runtime значения

### Примеры использования

**Development:**

```bash
helm install agile-poker ./helm \
  --set frontend.env.REACT_APP_API_URL="http://localhost:8000" \
  --set frontend.env.REACT_APP_WS_URL="ws://localhost:8000" \
  --set frontend.env.REACT_APP_LOG_LEVEL="debug"
```

**Production:**

```bash
helm install agile-poker ./helm \
  --set frontend.env.REACT_APP_API_URL="https://api.agile-poker.com" \
  --set frontend.env.REACT_APP_WS_URL="wss://api.agile-poker.com" \
  --set frontend.env.REACT_APP_JIRA_ENABLED="true" \
  --set frontend.env.REACT_APP_LOG_LEVEL="info"
```

**С values файлом:**

```bash
helm install agile-poker ./helm -f helm/examples/values-production.yaml
```

## Конфигурация

### Основные параметры конфигурации

```yaml
# Количество реплик
replicaCount: 2

# Настройки образа
image:
  repository: yatchenkods/agile-poker
  tag: "latest"
  pullPolicy: IfNotPresent

# Настройки сервиса
service:
  type: ClusterIP
  port: 8000

# Frontend runtime конфигурация
frontend:
  env:
    REACT_APP_API_URL: "https://api.example.com"
    REACT_APP_WS_URL: "wss://api.example.com"
    REACT_APP_JIRA_ENABLED: "false"
    REACT_APP_LOG_LEVEL: "info"

# Настройки Ingress
ingress:
  enabled: true
  className: "nginx"
  hosts:
    - host: agile-poker.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: agile-poker-tls
      hosts:
        - agile-poker.example.com

# Лимиты ресурсов
resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 250m
    memory: 256Mi

# Настройки PostgreSQL
postgresql:
  enabled: true
  auth:
    username: agile_user
    password: changeme123
    database: agile_poker
  primary:
    persistence:
      enabled: true
      size: 10Gi

# Настройки Redis
redis:
  enabled: true
  auth:
    enabled: true
    password: redis_password_123
  master:
    persistence:
      enabled: true
      size: 8Gi
  replica:
    replicaCount: 2
    persistence:
      enabled: true
      size: 8Gi
```

## Использование в production

Для production окружения обязательно настройте следующие параметры:

### 1. Используйте production values файл

```bash
helm install agile-poker ./helm -f helm/examples/values-production.yaml
```

### 2. Измените пароли

```bash
helm install agile-poker ./helm \
  --set postgresql.auth.password="your-strong-password" \
  --set redis.auth.password="your-strong-password" \
  --set secrets.databasePassword="your-strong-password" \
  --set secrets.redisPassword="your-strong-password"
```

### 3. Измените JWT секрет

```bash
helm install agile-poker ./helm \
  --set env.JWT_SECRET="your-secure-random-secret-256-bits"
```

### 4. Настройте Frontend endpoints

```bash
helm install agile-poker ./helm \
  --set frontend.env.REACT_APP_API_URL="https://api.yourdomain.com" \
  --set frontend.env.REACT_APP_WS_URL="wss://api.yourdomain.com"
```

### 5. Оптимизируйте лимиты ресурсов

```bash
helm install agile-poker ./helm \
  --set resources.limits.cpu="1000m" \
  --set resources.limits.memory="1Gi" \
  --set resources.requests.cpu="500m" \
  --set resources.requests.memory="512Mi"
```

### 6. Включите автомасштабирование

```bash
helm install agile-poker ./helm \
  --set autoscaling.enabled=true \
  --set autoscaling.minReplicas=3 \
  --set autoscaling.maxReplicas=10
```

## Обновление

```bash
# Обновить чарт
helm upgrade agile-poker ./helm -f helm/examples/values-production.yaml

# Откатить к предыдущей версии
helm rollback agile-poker 1
```

## Удаление

```bash
helm uninstall agile-poker
```

## Устранение неполадок

### Проверка Frontend Runtime Configuration

```bash
# Проверить что env переменные переданы
kubectl describe pod <frontend-pod-name> | grep REACT_APP

# Проверить что config.js был сгенерирован
kubectl exec -it <frontend-pod-name> -- cat /usr/share/nginx/html/config.js

# Проверить network requests в браузере
# DevTools -> Network tab -> просмотреть API endpoint
```

### Поды не запускаются

```bash
kubectl describe pod <pod-name>
kubectl logs <pod-name>
kubectl get pvc  # Проверка PersistentVolumeClaim
```

### Ошибки подключения к базе данных

```bash
kubectl get secret agile-poker-db -o yaml
kubectl port-forward svc/agile-poker-postgresql 5432:5432
```

### Ошибки Redis

```bash
kubectl get pods -l app.kubernetes.io/name=redis
kubectl port-forward svc/agile-poker-redis-master 6379:6379
redis-cli -a "password" ping
```

### Проблемы со хранилищем

```bash
kubectl get pv
kubectl get pvc
kubectl describe pvc agile-poker-postgresql
kubectl describe pvc agile-poker-redis-master-0
```

## Отладка

```bash
# Просмотр сгенерированных манифестов
helm template agile-poker ./helm

# Проверка синтаксиса чарта
helm lint ./helm

# Детальная отладка (dry-run)
helm install agile-poker ./helm --debug --dry-run

# Просмотр конкретных значений
helm template agile-poker ./helm -s frontend.env
```

## Примеры использования

### Установка для разработки

```bash
helm install agile-poker ./helm \
  --set frontend.env.REACT_APP_API_URL="http://localhost:8000" \
  --set frontend.env.REACT_APP_LOG_LEVEL="debug"
```

### Установка для production

```bash
helm install agile-poker ./helm -f helm/examples/values-production.yaml
```

### Использование внешней базы данных

```bash
helm install agile-poker ./helm \
  --set postgresql.enabled=false \
  --set redis.enabled=false \
  --set env.DATABASE_URL="postgresql://user:pass@db-host:5432/agile_poker" \
  --set env.REDIS_HOST="redis-host" \
  --set env.REDIS_PORT="6379"
```

### Настройка Jira интеграции

```bash
helm install agile-poker ./helm \
  --set secrets.jiraApiToken="your-jira-api-token" \
  --set frontend.env.REACT_APP_JIRA_ENABLED="true"
```

## Мониторинг и логирование

### Проверка здоровья приложения

```bash
# Port-forward для доступа к health endpoint
kubectl port-forward svc/agile-poker 8000:8000
curl http://localhost:8000/health
```

### Просмотр логов

```bash
# Логи текущих подов
kubectl logs -f deployment/agile-poker

# Логи всех подов с меткой
kubectl logs -f -l app.kubernetes.io/name=agile-poker

# Логи предыдущего контейнера (если был перезапуск)
kubectl logs -p deployment/agile-poker

# Логи frontend
kubectl logs -f deployment/agile-poker-frontend
```

## Безопасность

### Рекомендации для production

1. **Никогда не используйте дефолтные пароли**
2. **Используйте Kubernetes Secrets** для хранения конфиденциальных данных
3. **Настройте NetworkPolicies** для ограничения сетевого доступа
4. **Включите Pod Security Standards**
5. **Регулярно обновляйте образы** и зависимости
6. **Настройте RBAC** для ограничения доступа
7. **Используйте HTTPS/WSS** для всех endpoints в production

## Поддержка

Если у вас возникли проблемы, создайте issue на GitHub:

https://github.com/yatchenkods/agile-poker/issues

## Дополнительная документация

- [Детальная инструкция по установке](./INSTALL.md)
- [Примеры конфигураций](./examples/)
- [Runtime Configuration Documentation](../RUNTIME_CONFIG.md)
- [Документация Kubernetes](https://kubernetes.io/docs/)
- [Документация Helm](https://helm.sh/docs/)
- [Bitnami PostgreSQL Chart](https://github.com/bitnami/charts/tree/main/bitnami/postgresql)
- [Bitnami Redis Chart](https://github.com/bitnami/charts/tree/main/bitnami/redis)
