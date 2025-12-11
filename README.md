# Agile Planning Poker 🎲

[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-blue)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

Полнофункциональный веб-сервис для проведения **Agile Planning Poker** с интеграцией **Jira**, управлением пользователями и автоматическим проставлением оценок. Создано на FastAPI (Python) и React.

## 🎯 Основные возможности

- **Planning Poker сессии** — создание и управление сессиями оценивания
- **Оценка задач** — Fibonacci шкала (1, 2, 4, 8, 16 story points)
- **Jira интеграция** — загрузка задач из Jira и автоматическое проставление оценок
- **Управление командой** — добавление/удаление участников сессии
- **Real-time обновления** — WebSocket для синхронизации оценок в реальном времени
- **Админский интерфейс** — отслеживание расхождений в оценках и статистика
- **История оценок** — сохранение результатов для аналитики
- **Docker поддержка** — готовые конфигурации для локальной разработки и production

## 📋 Требования

- Python 3.11+
- PostgreSQL 13+
- Docker & Docker Compose (опционально)
- Node.js 18+ (для фронтенда)

## 🚀 Быстрый старт

### 1. С Docker Compose (рекомендуется)

```bash
# Клонирование репозитория
git clone https://github.com/yatchenkods/agile-poker.git
cd agile-poker

# Создание .env файла
cp .env.example .env

# Запуск всех сервисов
docker-compose up -d

# Применение миграций БД
docker-compose exec api alembic upgrade head

# (Опционально) Создание admin пользователя
docker-compose exec api python scripts/create_admin.py
```

**Доступ к приложению:**
- Frontend: http://localhost:3000
- API Swagger: http://localhost:8000/docs
- Admin (login: admin / password: admin)

### 2. Локальная разработка (без Docker)

```bash
# Создание виртуального окружения
python -m venv venv
source venv/bin/activate  # Linux/macOS
# или
venv\\Scripts\\activate  # Windows

# Установка зависимостей
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Настройка окружения
cp .env.example .env

# Запуск PostgreSQL и Redis (через Docker)
docker-compose up -d postgres redis

# Миграции
alembic upgrade head

# Запуск API сервера
uvicorn app.main:app --reload

# В отдельном терминале: запуск фронтенда
cd frontend
npm install
npm start
```

## 📁 Структура проекта

```
agile-poker/
├── app/                          # Backend (FastAPI)
│   ├── models/                   # SQLAlchemy модели
│   ├── schemas/                  # Pydantic схемы
│   ├── routes/                   # API маршруты
│   ├── services/                 # Бизнес-логика
│   ├── utils/                    # Утилиты (security, validators)
│   ├── websockets/               # WebSocket обработчики
│   ├── config.py                 # Конфигурация
│   ├── database.py               # БД инициализация
│   └── main.py                   # Точка входа
├── frontend/                     # React приложение
│   ├── src/
│   │   ├── components/           # React компоненты
│   │   ├── pages/                # Страницы
│   │   ├── services/             # API сервисы
│   │   └── styles/               # CSS
│   ├── Dockerfile
│   └── package.json
├── alembic/                      # Миграции БД
├── scripts/                      # Вспомогательные скрипты
├── tests/                        # Тесты
├── docker-compose.yml            # Development
├── docker-compose.prod.yml       # Production
├── Dockerfile                    # Backend образ
├── requirements.txt              # Python зависимости
└── README.md
```

## ⚙️ Конфигурация

### Переменные окружения (.env)

```bash
# Database
DATABASE_URL=postgresql://poker:poker@localhost:5432/agile_poker

# Security
SECRET_KEY=your-secret-key-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Jira
JIRA_ENABLED=true
JIRA_BASE_URL=https://jira.example.com
JIRA_USERNAME=your-username
JIRA_API_TOKEN=your-api-token

# Frontend
REACT_APP_API_URL=http://localhost:8000
REACT_APP_WS_URL=ws://localhost:8000

# Redis
REDIS_URL=redis://localhost:6379/0
```

## 👤 Управление администраторами

### Скрипт create_admin.py

Полнофункциональный скрипт для управления администраторами системы.

#### **Интерактивный режим (по умолчанию)**

```bash
# Docker
docker-compose exec api python scripts/create_admin.py

# Локально
python scripts/create_admin.py
```

Откроется интерактивное меню:
```
🎯 Agile Planning Poker - Admin User Manager
══════════════════════════════════════════════════════════════════════════

📋 Choose an action:
  1. Create new admin user
  2. Reset admin password
  3. List all admin users
  4. Promote user to admin
  5. Demote admin to user
  6. Delete user
  0. Exit
```

#### **Командная строка**

**Создать нового администратора:**
```bash
# Интерактивно (запросит пароль)
python scripts/create_admin.py --email admin@company.com --name "Admin User"

# С указанием пароля (для CI/CD)
python scripts/create_admin.py --email admin@company.com --password SecurePass123 --name "Admin"
```

**Сбросить пароль администратора:**
```bash
# Интерактивно
python scripts/create_admin.py --reset --email admin@company.com

# С паролем
python scripts/create_admin.py --reset --email admin@company.com --password NewPassword123
```

**Просмотреть всех администраторов:**
```bash
python scripts/create_admin.py --list

# Вывод:
# 🔍 Admin Users (2):
# ──────────────────────────────────────────────────────────────────────────
# ID    Email                          Full Name                Active
# ──────────────────────────────────────────────────────────────────────────
# 1     admin@example.com              Admin User               ✅
# 2     superadmin@example.com         Super Admin              ✅
# ──────────────────────────────────────────────────────────────────────────
```

**Повысить пользователя до администратора:**
```bash
# Обычный пользователь зарегистрировался,
# повысьте его до админа:
python scripts/create_admin.py --promote --email user@example.com
```

**Понизить администратора до обычного пользователя:**
```bash
python scripts/create_admin.py --demote --email admin@example.com
```

**Удалить пользователя:**
```bash
python scripts/create_admin.py --delete --email user@example.com
```

#### **Примеры использования**

**Первоначальная настройка (Docker):**
```bash
docker-compose up -d
docker-compose exec api alembic upgrade head
docker-compose exec api python scripts/create_admin.py
# Выбираем пункт 1, вводим email и пароль
```

**Быстрое создание админа для CI/CD:**
```bash
python scripts/create_admin.py \
  --email admin@mycompany.com \
  --password VerySecurePassword123 \
  --name "Main Administrator"
```

**Сброс забытого пароля:**
```bash
python scripts/create_admin.py --reset --email admin@example.com
# Интерактивно запросит новый пароль
```

**Просмотр в production контейнере:**
```bash
docker exec agile-poker-api python scripts/create_admin.py --list
```

#### **Требования к паролю**

- ✅ Минимум **8 символов**
- ✅ Должен быть подтвержден (введен дважды)
- ✅ Скрытый ввод в терминале (не видно в истории)
- ✅ Безопасное хеширование (Bcrypt)

#### **Безопасность**

- ✅ Проверка существования пользователя
- ✅ Валидация всех входных данных
- ✅ Откат БД при ошибках
- ✅ Информативные сообщения об ошибках
- ✅ Обработка прерываний (Ctrl+C)

#### **Коды выхода**

```
0   — Успешное выполнение
1   — Ошибка (неверные аргументы, ошибка БД и т.д.)
```

#### **Примеры вывода**

**Успешное создание:**
```
✅ Admin user created successfully
   ID: 1
   Email: admin@example.com
   Full Name: Admin User
```

**Ошибка:**
```
❌ User with email 'admin@example.com' already exists
```

**Успешный список:**
```
🔍 Admin Users (2):
──────────────────────────────────────────────────────────────────────────
ID    Email                          Full Name                Active
──────────────────────────────────────────────────────────────────────────
1     admin@example.com              Admin User               ✅
2     superadmin@example.com         Super Admin              ✅
──────────────────────────────────────────────────────────────────────────
```

## 🔧 API Endpoints

### Аутентификация
```bash
# Регистрация
POST /api/v1/auth/register
{
  "email": "user@example.com",
  "password": "securepassword",
  "full_name": "John Doe"
}

# Вход
POST /api/v1/auth/login
?username=user@example.com&password=securepassword

# Текущий пользователь
GET /api/v1/auth/me
```

### Сессии
```bash
# Создать сессию
POST /api/v1/sessions/
{
  "name": "Sprint 45 Planning",
  "description": "Q4 Planning",
  "project_key": "PROJ"
}

# Список сессий
GET /api/v1/sessions/?skip=0&limit=10

# Детали сессии
GET /api/v1/sessions/{session_id}

# Закрыть сессию
POST /api/v1/sessions/{session_id}/close

# Добавить участника
POST /api/v1/sessions/{session_id}/users/{user_id}

# Удалить участника
DELETE /api/v1/sessions/{session_id}/users/{user_id}
```

### Оценки
```bash
# Поставить оценку
POST /api/v1/estimates/
{
  "session_id": 1,
  "issue_id": 1,
  "story_points": 8,
  "user_id": 1
}

# Список оценок
GET /api/v1/estimates/?session_id=1&issue_id=1

# Сводка по оценкам
GET /api/v1/estimates/summary/{issue_id}

# История оценок
GET /api/v1/estimates/history/?issue_id=1
```

### Задачи
```bash
# Создать задачу
POST /api/v1/issues/
{
  "session_id": 1,
  "jira_key": "PROJ-123",
  "title": "Implement feature"
}

# Список задач
GET /api/v1/issues/?session_id=1

# Синхронизировать с Jira
POST /api/v1/issues/sync-jira
{
  "project_key": "PROJ",
  "query": "status = 'To Do'"
}
```

### Admin
```bash
# Статистика
GET /api/v1/admin/stats

# Задачи с расхождениями
GET /api/v1/admin/conflicting-estimates

# Статистика пользователей
GET /api/v1/admin/users-stats
```

## 🌐 WebSocket Events

```javascript
const token = localStorage.getItem('token');
const ws = new WebSocket(`ws://localhost:8000/ws/session/1?token=${token}`);

// Отправить оценку
ws.send(JSON.stringify({
  type: 'estimate',
  data: {
    issue_id: 1,
    story_points: 8
  }
}));

// Получить обновление
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  // msg.type: 'estimate_update', 'user_joined', 'user_disconnected'
};
```

## 📊 Алгоритм консенсуса

Оценки считаются согласованными и автоматически проставляются в Jira при:

1. **Все участники проголосовали** — количество оценок = количество участников
2. **Расхождение минимально** — max(points) - min(points) ≤ 2

Итоговая оценка = средняя округленная до ближайшего валидного значения (1, 2, 4, 8, 16)

```python
# Примеры
scores = [4, 4, 4, 4]        # Согласовано → 4 points
scores = [4, 4, 8]           # Согласовано (4-4=0, 8-4=4 > 2) но близко → ~5 → 4 points
scores = [2, 4, 4, 4, 8]     # Не согласовано (8-2=6 > 2) → на доске красная подсветка
```

## 🧪 Тестирование

```bash
# Запуск всех тестов
pytest

# С отчетом о покрытии
pytest --cov=app --cov-report=html

# Конкретный тест
pytest tests/test_sessions.py::test_create_session

# С логами
pytest -v -s
```

## 📦 Production развертывание

### Kubernetes

```bash
# Создать namespace
kubectl create namespace agile-poker

# Развернуть (требуется Helm chart)
helm install agile-poker ./helm -n agile-poker
```

### Docker Compose Production

```bash
# С production конфигурацией
docker-compose -f docker-compose.prod.yml up -d
```

## 🔒 Безопасность

- ✅ JWT аутентификация
- ✅ Bcrypt хеширование паролей  
- ✅ CORS настройки
- ✅ Rate limiting на endpoints
- ✅ SQL injection защита (SQLAlchemy ORM)
- ✅ Валидация входных данных (Pydantic)
- ✅ CSRF protection
- ✅ Логирование критических операций

## 🐛 Troubleshooting

### Ошибка подключения к БД
```bash
# Проверить статус контейнеров
docker-compose ps

# Проверить логи PostgreSQL
docker-compose logs postgres

# Перезагрузить БД
docker-compose restart postgres
```

### WebSocket не работает
```bash
# Проверить REACT_APP_WS_URL в .env
# Должен быть ws:// (не http://)
# На production: wss:// (с SSL)
```

### Проблемы с Jira
```bash
# Проверить credentials
curl -u username:api_token https://jira.example.com/rest/api/3/myself

# Проверить логи API
docker-compose logs api | grep jira
```

### Ошибка create_admin.py
```bash
# Проверить, что вы в корне проекта
ls -la scripts/create_admin.py

# Проверить зависимости
pip install -r requirements.txt

# Проверить БД
docker-compose ps postgres

# С подробным выводом
python scripts/create_admin.py --help
```

## 📝 Логирование

Все события логируются в:
- `logs/app.log` — основные логи
- `logs/jira.log` — Jira интеграция
- `logs/websocket.log` — WebSocket соединения

## 🤝 Contribute

Приветствуются pull requests! Пожалуйста:

1. Fork репозиторий
2. Создайте feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit изменений (`git commit -m 'Add some AmazingFeature'`)
4. Push в branch (`git push origin feature/AmazingFeature`)
5. Откройте Pull Request

См. [CONTRIBUTING.md](CONTRIBUTING.md) для деталей.

## 📄 Лицензия

Проект распространяется под лицензией MIT. См. [LICENSE](LICENSE).

## 👤 Автор

**yatchenkods** — DevOps Engineer  
- GitHub: [@yatchenkods](https://github.com/yatchenkods)

## 🙏 Благодарности

- [FastAPI](https://fastapi.tiangolo.com/) — современный веб-фреймворк
- [SQLAlchemy](https://www.sqlalchemy.org/) — ORM для Python
- [React](https://react.dev/) — UI библиотека
- [PostgreSQL](https://www.postgresql.org/) — надежная БД
- [Atlassian Jira API](https://developer.atlassian.com/cloud/jira/rest/)

## 📞 Support

- 📋 [Issues](https://github.com/yatchenkods/agile-poker/issues) — для bagов и предложений
- 💬 [Discussions](https://github.com/yatchenkods/agile-poker/discussions) — для вопросов
- 📧 Email: [ваш email]

## 📚 Дорожная карта

- [ ] Export результатов в CSV/PDF
- [ ] Интеграция с GitHub Issues
- [ ] Интеграция с Azure DevOps
- [ ] Multi-language поддержка
- [ ] Mobile приложение
- [ ] Advanced analytics dashboard
- [ ] Slack/Teams уведомления
- [ ] AI-powered оценки
- [ ] Поддержка различных шкал оценок
- [ ] Team metrics и velocity tracking

---

**Happy Estimation! 🎲**
