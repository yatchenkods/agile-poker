# Agile Poker Helm Chart

Helmチャートを使用してKubernetesクラスタに**Agile Planning Poker**アプリケーションをデプロイします。

## 前提条件

- Kubernetes 1.19以上
- Helm 3.0以上
- PostgreSQLデータベース（または、チャートにバンドルされたPostgreSQLを使用）

## インストール

### 1. Helm リポジトリの追加

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
```

### 2. チャートの依存関係を更新

```bash
cd helm
helm dependency update
```

### 3. チャートのインストール

**デフォルト値を使用する場合：**

```bash
helm install agile-poker ./helm
```

**カスタム値を使用する場合：**

```bash
helm install agile-poker ./helm -f values-prod.yaml
```

### 4. デプロイメントの確認

```bash
kubectl get pods -l app.kubernetes.io/name=agile-poker
kubectl describe pod <pod-name>
kubectl logs <pod-name>
```

## 設定

### 主要な設定オプション

```yaml
# レプリカ数
replicaCount: 2

# イメージ設定
image:
  repository: yatchenkods/agile-poker
  tag: "latest"
  pullPolicy: IfNotPresent

# サービス設定
service:
  type: ClusterIP
  port: 8000

# Ingress設定
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

# リソース制限
resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 250m
    memory: 256Mi

# PostgreSQL設定
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
```

## 本番環境での使用

本番環境では、以下の点を確認してください：

1. **パスワード変更**
   ```yaml
   postgresql:
     auth:
       password: "your-strong-password-here"
   secrets:
     databasePassword: "your-strong-password-here"
     jiraApiToken: "your-jira-token"
   ```

2. **JWT Secret変更**
   ```yaml
   env:
     JWT_SECRET: "your-secure-random-secret"
   ```

3. **Ingress設定**
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

4. **リソース制限の最適化**
   ```yaml
   resources:
     limits:
       cpu: 1000m
       memory: 1Gi
     requests:
       cpu: 500m
       memory: 512Mi
   ```

5. **自動スケーリング有効化**
   ```yaml
   autoscaling:
     enabled: true
     minReplicas: 2
     maxReplicas: 10
     targetCPUUtilizationPercentage: 80
   ```

## アップグレード

```bash
# チャートの更新
helm upgrade agile-poker ./helm -f values-prod.yaml

# ロールバック
helm rollback agile-poker 1
```

## アンインストール

```bash
helm uninstall agile-poker
```

## トラブルシューティング

### ポッドが起動しない場合

```bash
kubectl describe pod <pod-name>
kubectl logs <pod-name>
kubectl get pvc  # PersistentVolumeClaimの確認
```

### データベース接続エラー

```bash
kubectl get secret agile-poker-db -o yaml
kubectl port-forward svc/agile-poker-postgresql 5432:5432
```

### ストレージの問題

```bash
kubectl get pv
kubectl get pvc
kubectl describe pvc agile-poker-postgresql
```

## デバッグ

```bash
# チャートのテンプレートを確認
helm template agile-poker ./helm

# Kubernetesマニフェストの検証
helm lint ./helm

# 詳細なデバッグ情報
helm install agile-poker ./helm --debug --dry-run
```

## サポート

問題が発生した場合は、GitHubのIssuesセクションで報告してください。

https://github.com/yatchenkods/agile-poker/issues
