# 🚀 Настройка Agile Planning Poker

Подробные инструкции по первоначальной настройке и работе.

## 🚀 Первые шаги

### 1. Клонирование репозитория

```bash
git clone https://github.com/yatchenkods/agile-poker.git
cd agile-poker
```

### 2. Создание .env файла

```bash
cp .env.example .env
```

Отредактируйте `.env` если нужно:
```bash
DATABASE_URL=postgresql://poker:poker@localhost:5432/agile_poker
SECRET_KEY=your-secret-key-here
REDIS_URL=redis://localhost:6379/0
```

### 3. Запуск с Docker Compose

```bash
# Запустить все контейнеры
docker-compose up -d

# Проверить статус
docker-compose ps

# Ожидание пока Постгрес запустится (~10 сек)
sleep 10

# Применить миграции
docker-compose exec api alembic upgrade head

# Создать admin пользователя
docker-compose exec api python scripts/create_admin.py
```

### 4. Проверка работы

```bash
# Проверить API (Swagger)
open http://localhost:8000/docs

# Проверить Frontend
open http://localhost:3000

# Правки:
# Frontend: http://localhost:3000
# API Swagger: http://localhost:8000/docs
# Admin login: admin@example.com / admin
```

---

## 🐛 Ошибки и решения

### Ошибка: "No module named 'app'"

**Проблема:**
```
Error: Could not import required modules: No module named 'app'
Make sure you are in the project root directory and have installed dependencies.
```

**Решение:**

**В Docker Compose:**
```bash
# Все зависимости уже установлены в контейнере
# Просто запустите:
docker-compose exec api python scripts/create_admin.py
```

**Локально:**
```bash
# 1. Проверьте, что вы в корне проекта
pwd
ls app/  # Должна вывести список файлов

# 2. Откройте виртуальное окружение
python -m venv venv
source venv/bin/activate  # Linux/macOS
venv\Scripts\activate     # Windows

# 3. Установите зависимости
pip install -r requirements.txt

# 4. Теперь запустите скрипт
python scripts/create_admin.py
```

### Ошибка: "Ошибка подключения к БД"

**Проблема:**
```
Error connecting to database: could not connect to server: Connection refused
```

**Решение:**

```bash
# 1. Проверить статус контейнера PostgreSQL
docker-compose ps postgres

# 2. Проверить логи
docker-compose logs postgres | tail -20

# 3. Если последние логи модуля являются "ready to accept connections"
# но контейнер показывают статус "restarting", ожидайте
# еще ~10 секунд
sleep 10

# 4. Перезагрузить Постгрес
docker-compose restart postgres
sleep 10

# 5. Проверить, что DATABASE_URL в .env повторяет docker-compose.yml
grep DATABASE_URL .env
grep POSTGRES .env

# 6. Если используете localhost (не docker-compose):
# Убедитесь, что порты открыты:
netstat -an | grep 5432  # Linux/macOS
netstat -ano | findstr 5432  # Windows
```

### Ошибка: "Alembic миграции не применены"

**Проблема:**
```
Error creating admin user:
Operational Error - no such table: user
```

**Решение:**

```bash
# запустите миграции

# В Docker:
docker-compose exec api alembic upgrade head

# Локально:
alembic upgrade head

# Проверить статус миграций:
alembic current  # текущая версия
alembic history  # история
```

### Ошибка: "Ports already in use"

**Проблема:**
```
ERROR: for api  Cannot start service api: 
OCI runtime create failed: container_linux.go:380: 
starting container process caused:
process_linux.go:125: container init caused:
"listen tcp4 0.0.0.0:8000: bind: address already in use"
```

**Решение:**

```bash
# Остановить текущие контейнеры
docker-compose down

# Удалить все Docker волюмы и нетворки (ОСТОРОЖНО - удалит данные!)
docker-compose down -v

# Перезапустить
docker-compose up -d

# ИЛИ Используйте нестандартные порты:
PORT_API=8001 PORT_FRONTEND=3001 docker-compose up -d
```

### Ошибка: "Permissions denied"

**Проблема:**
```
Permission denied while trying to connect to Docker daemon
```

**Решение:**

```bash
# Linux - добавьте пользователя в группу docker
sudo usermod -aG docker $USER
newgrp docker

# macOS - перестартите Docker Desktop
open /Applications/Docker.app

# Windows - отключите и включите Docker Desktop
```

---

## 🔧 Проверки диагностики

```bash
# Проверьте все контейнеры
docker-compose ps

# Проверьте логи API
docker-compose logs api | tail -50

# Проверьте логи PostgreSQL
docker-compose logs postgres | tail -20

# Подключитесь к БД
docker-compose exec postgres psql -U poker -d agile_poker -c "\dt"

# Подключитесь к API
curl http://localhost:8000/docs

# Проверьте Redis
docker-compose exec redis redis-cli ping
```

---

## ✅ Чеклист быстрых старта

- [ ] Клонировал репозиторий
- [ ] Создал .env из .env.example
- [ ] Запустил docker-compose up -d
- [ ] Отмеживал 10 секунд
- [ ] Применил миграции (alembic upgrade head)
- [ ] Создал админа (python scripts/create_admin.py)
- [ ] Проверил API (http://localhost:8000/docs)
- [ ] Проверил Frontend (http://localhost:3000)

---

## ❔ Частые вопросы (FAQ)

### Q: Как остановить контейнеры?
**A:**
```bash
docker-compose down
```

### Q: Как очистить все данные и начать с нуля?
**A:**
```bash
docker-compose down -v
docker-compose up -d
```

### Q: Как смотреть логи контейнера?
**A:**
```bash
docker-compose logs -f api  # Осмотрить в режиме следки
```

### Q: Как найти IP контейнера?
**A:**
```bash
docker inspect agile-poker-api | grep "IPAddress"
```

### Q: Как выполнить команду в контейнере?
**A:**
```bash
docker-compose exec api bash  # Вход в джилище ебать
# или
docker-compose exec api python scripts/create_admin.py  # запустить команду
```

---

## 📄 Основные команды

```bash
# Docker Compose
docker-compose up -d          # Запустить
docker-compose down           # Остановить
docker-compose ps             # Статус
docker-compose logs -f api    # Логи

# Миграции
alembic upgrade head          # Квы до последней
alembic downgrade -1          # Откат на 1 степ

# Admin менеджер
python scripts/create_admin.py              # Интерактивный режим
python scripts/create_admin.py --list       # Список
python scripts/create_admin.py --email ... --password ...  # сразу

# Тесты
pytest                        # Все тесты
pytest -v                     # От новых сообщения
```

---

## 🌟 Мощные поступы

### Не останавливая контейнеры
```bash
# Вычислить вы админа
docker-compose exec api python scripts/create_admin.py --list

# Модифицировать админа
docker-compose exec api python scripts/create_admin.py --reset --email admin@example.com
```

### Перестартить отдельные сервисы
```bash
docker-compose restart api
docker-compose restart postgres
docker-compose restart redis
```

### Мониторить ресурсы
```bash
docker stats agile-poker-api
docker system df
```

---

## 📧 Нужна помощь?

- 📋 [README.md](README.md) — Полная документация
- 💪 [CONTRIBUTING.md](CONTRIBUTING.md) — Как сайт расчетная
- 💭 [Issues](https://github.com/yatchenkods/agile-poker/issues) — Сразить проблему
- 💬 [Discussions](https://github.com/yatchenkods/agile-poker/discussions) — Обсудить вопрос
