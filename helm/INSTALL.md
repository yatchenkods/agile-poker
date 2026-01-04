# Установка Agile Poker Helm Chart

## Быстрый старт

### 1. Клонируйте репозиторий

```bash
git clone https://github.com/yatchenkods/agile-poker.git
cd agile-poker
```

### 2. Добавьте Helm репозитории

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
```

### 3. Обновите зависимости

```bash
cd helm
helm dependency update
cd ..
```

### 4. Установите приложение

**Для разработки:**
```bash
helm install agile-poker ./helm -f helm/examples/values-dev.yaml
```

**Для production:**
```bash
helm install agile-poker ./helm -f helm/examples/values-prod.yaml
```

**С использованием внешней БД (без встроенных PostgreSQL/Redis):**
```bash
helm install agile-poker ./helm \
  --set postgresql.enabled=false \
  --set redis.enabled=false \
  --set env.DATABASE_URL="postgresql://user:password@your-db:5432/agile_poker" \
  --set env.REDIS_HOST="your-redis-host" \
  --set env.REDIS_PORT="6379"
```

## Детальная установка

### Создание namespace

```bash
kubectl create namespace agile-poker
kubectl config set-context --current --namespace=agile-poker
```

### Установка с custom значениями

```bash
helm install agile-poker ./helm \
  --namespace agile-poker \
  --set image.tag="v1.0.0" \
  --set replicaCount=3 \
  --set postgresql.auth.password="secure-password-123"
```

### Установка с полным контролем

```bash
# Генерируем значения по умолчанию
helm show values ./helm > my-values.yaml

# Редактируем значения
vim my-values.yaml

# Устанавливаем
helm install agile-poker ./helm -f my-values.yaml
```

## Проверка установки

```bash
# Проверяем статус
helm status agile-poker

# Смотрим pods
kubectl get pods -l app.kubernetes.io/name=agile-poker

# Смотрим services
kubectl get svc agile-poker

# Смотрим ingress
kubectl get ingress agile-poker

# Смотрим логи
kubectl logs -l app.kubernetes.io/name=agile-poker -f

# Проверить PostgreSQL pods
kubectl get pods -l app.kubernetes.io/name=postgresql

# Проверить Redis pods
kubectl get pods -l app.kubernetes.io/name=redis
```

## Доступ к приложению

### Port-Forward (для локального тестирования)

```bash
kubectl port-forward svc/agile-poker 8000:8000
# Откройте http://localhost:8000
```

### Через Ingress

```bash
# Получите IP адрес Ingress
kubectl get ingress agile-poker

# Добавьте в /etc/hosts (или используйте DNS)
192.168.1.100  agile-poker.local

# Откройте http://agile-poker.local
```

## Изменение параметров (обновление)

### Обновление версии приложения

```bash
helm upgrade agile-poker ./helm \
  --set image.tag="v1.0.1"
```

### Изменение количества реплик

```bash
helm upgrade agile-poker ./helm \
  --set replicaCount=5
```

### Обновление с новыми значениями

```bash
helm upgrade agile-poker ./helm -f new-values.yaml
```

## Откат к предыдущей версии

```bash
# Просмотр истории
helm history agile-poker

# Откат
helm rollback agile-poker 1
```

## Удаление приложения

```bash
# Удаляем релиз
helm uninstall agile-poker

# Удаляем namespace
kubectl delete namespace agile-poker
```

## Интеграция с Jira

1. Создайте API token в Jira:
   - Зайдите на https://id.atlassian.com/manage-profile/security/api-tokens
   - Нажмите "Create API token"
   - Скопируйте токен

2. Установите/обновите приложение с токеном:
   ```bash
   helm install agile-poker ./helm \
     --set secrets.jiraApiToken="your-api-token-here"
   ```

## Использование собственного Docker образа

```bash
# Если вы создали собственный образ
helm install agile-poker ./helm \
  --set image.repository="your-registry/agile-poker" \
  --set image.tag="your-tag"
```

## SSL/TLS сертификаты

### С cert-manager

```bash
# Установите cert-manager
helm repo add jetstack https://charts.jetstack.io
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true

# Создайте ClusterIssuer
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF

# Установите приложение
helm install agile-poker ./helm \
  --set ingress.enabled=true \
  --set ingress.hosts[0].host="agile-poker.example.com"
```

### С собственным сертификатом

```bash
# Создайте secret
kubectl create secret tls agile-poker-tls \
  --cert=path/to/cert.crt \
  --key=path/to/key.key

# Установите приложение
helm install agile-poker ./helm \
  --set ingress.tls[0].secretName="agile-poker-tls"
```

## Мониторинг

### Проверка здоровья

```bash
# Endpoint проверки здоровья
kubectl port-forward svc/agile-poker 8000:8000
curl http://localhost:8000/health
```

### Логирование

```bash
# Реальные логи
kubectl logs -f deployment/agile-poker

# Логи предыдущего контейнера (если он был перезагружен)
kubectl logs -p deployment/agile-poker

# Логи всех подов
kubectl logs -f -l app.kubernetes.io/name=agile-poker
```

### Метрики (если установлен Prometheus)

```bash
# Добавьте ServiceMonitor (для Prometheus Operator)
kubectl apply -f - <<EOF
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: agile-poker
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: agile-poker
  endpoints:
  - port: http
EOF
```

## Проверка зависимостей

```bash
# Просмотр текущих зависимостей
helm dependency list ./helm

# Обновить чарты зависимостей
helm dependency update ./helm
```

## Решение проблем

### Поды не запускаются

```bash
kubectl describe pod <pod-name>
kubectl logs <pod-name>
```

### Ошибки БД

```bash
# Проверьте secret
kubectl get secret agile-poker-db -o yaml

# Проверьте подключение
kubectl run -it --image=postgres:15 --rm psql -- \
  psql postgresql://user:pass@agile-poker-postgresql:5432/agile_poker
```

### Ошибки Redis

```bash
# Проверьте Redis pods
kubectl get pods -l app.kubernetes.io/name=redis

# Подключитесь к Redis
kubectl port-forward svc/agile-poker-redis-master 6379:6379
redis-cli -a "password" ping
```

### Проблемы с Ingress

```bash
kubectl describe ingress agile-poker
kubectl logs -n nginx-ingress deployment/nginx-ingress-controller
```

## Дополнительная информация

- [Helm документация](https://helm.sh/docs/)
- [Kubernetes документация](https://kubernetes.io/docs/)
- [README чарта](./README.md)
- [Bitnami PostgreSQL Chart](https://github.com/bitnami/charts/tree/main/bitnami/postgresql)
- [Bitnami Redis Chart](https://github.com/bitnami/charts/tree/main/bitnami/redis)
