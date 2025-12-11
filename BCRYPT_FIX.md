# 🔐 Ошибка Bcrypt и Passlib

## Проблема

Ошибка при запуске `create_admin.py`:

```
error reading bcrypt version
Traceback (most recent call last):
  File "/root/.local/lib/python3.11/site-packages/passlib/handlers/bcrypt.py", line 620, in _load_backend_mixin
    version = _bcrypt.__about__.__version__
              ^
AttributeError: module 'bcrypt' has no attribute '__about__'
```

## Причина

Несовместимость между версиями:
- `passlib` ожидает атрибут `__about__` в модуле `bcrypt`
- Новые версии `bcrypt` это отаивали
- Старые версии `passlib` не могут правильно обработать

## ✅ Решения

### Решение 1: Обновить зависимости (РЕКОММНАУ)

**В Docker:**
```bash
# Пересобрайте контейнер
docker-compose down
docker-compose build --no-cache api
docker-compose up -d
sleep 10

# Примените миграции
docker-compose exec api alembic upgrade head

# Теперь создайте админа
docker-compose exec api python scripts/create_admin.py --email admin@company.com --password SecurePass123 --name "Admin"
```

**Локально:**
```bash
# Обновить все зависимости
pip install --upgrade -r requirements.txt

# Очистить кеш
pip cache purge

# Наставить еще раз
pip install --force-reinstall -r requirements.txt

# Проверить
python -c "import bcrypt; print(bcrypt.__version__)"
python -c "import passlib; print(passlib.__version__)"

# Теперь запустите скрипт
python scripts/create_admin.py --email admin@company.com --password SecurePass123 --name "Admin"
```

### Решение 2: Освежить зависимости в контейнере

```bash
# Переинсталлируем в контейнере Docker
docker-compose exec api pip install --upgrade --force-reinstall -r requirements.txt

# Проверить
docker-compose exec api python -c "import bcrypt; print(bcrypt.__version__)"

# Наставить
docker-compose exec api python scripts/create_admin.py --email admin@company.com --password SecurePass123 --name "Admin"
```

### Решение 3: Мануальная установка совместимых версий

```bash
# Одновременно установить совместимые версии
pip install bcrypt==4.1.2 'passlib[bcrypt]==1.7.4'

# Или у же другие комбинации:
pip install bcrypt==4.0.1 'passlib[bcrypt]==1.7.4'
pip install 'bcrypt<4' 'passlib[bcrypt]==1.7.4'
```

## 🐧 Проверка

### Проверить версии

```bash
python -c "import bcrypt; print(f'bcrypt version: {bcrypt.__version__}')"
python -c "import passlib; print(f'passlib version: {passlib.__version__}')"

# Оба от нормально
```

### Проверить хеширование пароля

```bash
python -c "
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

# Хеширование
password = 'TestPassword123'
hashed = pwd_context.hash(password)
print(f'Original: {password}')
print(f'Hashed: {hashed}')

# Проверка
is_valid = pwd_context.verify(password, hashed)
print(f'Verification: {is_valid}')
"
```

## 📚 Обновленные версии

На ср авк 11.12.2025 используются:

```
bcrypt==4.1.2
passlib[bcrypt]==1.7.4
```

Не рекомендуем эти комбинации:
- `bcrypt>=4.2` + `passlib<1.7.4` ✗
- `bcrypt<4` + `passlib>1.8` ✗

## 🔧 На что нижая

### Перебуил Docker

```bash
# Удалить старые имагес
docker-compose down
docker system prune -a --volumes

# Построить заново
docker-compose build --no-cache
docker-compose up -d
```

### Перезапустить Python интерпретатор

```bash
# Локально
deactivate  # Отключить venv
rm -rf venv
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Очистить кеш

```bash
pip cache purge
pip install --upgrade pip setuptools wheel
pip install --upgrade -r requirements.txt
```

## 🤔 Ничего не помогает?

### Оторванные решения

1. **Очистить все:**
   ```bash
   # Локально
   pip uninstall bcrypt passlib -y
   pip install bcrypt==4.1.2 'passlib[bcrypt]==1.7.4'
   
   # В Docker
   docker-compose down -v
   docker system prune -a --volumes
   docker-compose up -d
   ```

2. **Обновить вся система:**
   ```bash
   pip install --upgrade pip setuptools wheel
   pip install --upgrade --force-reinstall -r requirements.txt
   ```

3. **При срочности можно использовать другое решение:**
   ```bash
   # Меньшая версия
   pip install 'bcrypt==4.0.1' 'passlib[bcrypt]==1.7.4'
   ```

## 📄 Отчет в Issue

Если решения не помогают, составьте репорт:

1. Ос (Убунту, макОС, Windows)
2. Вывод `python --version`
3. Вывод `pip list | grep -E "bcrypt|passlib"`
4. Полный контекст ошибки

---

**После фикса все должно работать! 🙋**
