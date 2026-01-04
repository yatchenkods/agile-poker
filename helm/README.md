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
helm install agile-poker ./helm -f values-prod.yaml
```

### 4. Проверьте развертывание

```bash
kubectl get pods -l app.kubernetes.io/name=agile-poker
kubectl describe pod <pod-name>
kubectl logs <pod-name>
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

### 1. Измените пароли

```yaml
postgresql:
  auth:
    password: "your-strong-password-here"
redis:
  auth:
    password: "your-strong-password-here"
secrets:
  databasePassword: "your-strong-password-here"
  redisPassword: "your-strong-password-here"
  jiraApiToken: "your-jira-token"
```

### 2. Измените JWT секрет

```yaml
env:
  JWT_SECRET: "your-secure-random-secret"
```

### 3. Настройте Ingress

```yaml
ingress:
  enabled: true
  hosts:
    - host: agile-poker.yourdomain.com
  tls:
    - secretName: agile-poker-tls
      hosts:
        - agile-poker.yourdomain.com
```

### 4. Оптимизируйте лимиты ресурсов

```yaml
resources:
  limits:
    cpu: 1000m
    memory: 1Gi
  requests:
    cpu: 500m
    memory: 512Mi
```

### 5. Включите автомасштабирование

```yaml
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80
```

## Обновление

```bash
# Обновить чарт
helm upgrade agile-poker ./helm -f values-prod.yaml

# Откатить к предыдущей версии
helm rollback agile-poker 1
```

## Удаление

```bash
helm uninstall agile-poker
```

## Устранение неполадок

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
```

## Примеры использования

### Установка для разработки

```bash
helm install agile-poker ./helm -f helm/examples/values-dev.yaml
```

### Установка для production

```bash
helm install agile-poker ./helm -f helm/examples/values-prod.yaml
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
  --set secrets.jiraApiToken="your-jira-api-token"
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
```

## Безопасность

### Рекомендации для production

1. **Никогда не используйте дефолтные пароли**
2. **Используйте Kubernetes Secrets** для хранения конфиденциальных данных
3. **Настройте NetworkPolicies** для ограничения сетевого доступа
4. **Включите Pod Security Standards**
5. **Регулярно обновляйте образы** и зависимости
6. **Настройте RBAC** для ограничения доступа

## Поддержка

Если у вас возникли проблемы, создайте issue на GitHub:

https://github.com/yatchenkods/agile-poker/issues

## Дополнительная документация

- [Детальная инструкция по установке](./INSTALL.md)
- [Примеры конфигураций](./examples/)
- [Документация Kubernetes](https://kubernetes.io/docs/)
- [Документация Helm](https://helm.sh/docs/)
- [Bitnami PostgreSQL Chart](https://github.com/bitnami/charts/tree/main/bitnami/postgresql)
- [Bitnami Redis Chart](https://github.com/bitnami/charts/tree/main/bitnami/redis)
