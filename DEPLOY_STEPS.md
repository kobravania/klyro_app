# Пошаговые команды для деплоя на сервере

## Шаг 1: Подключение к серверу
```bash
ssh root@your_server_ip
```

## Шаг 2: Переход в рабочую директорию
```bash
cd /opt/klyro
```

## Шаг 3: Клонирование или обновление репозитория

**Если проекта ещё нет:**
```bash
git clone https://github.com/kobravania/klyro_app.git .
```

**Если проект уже есть:**
```bash
git pull origin main
```

## Шаг 4: Создание .env файла
```bash
cat > .env << EOL
BOT_TOKEN=your_telegram_bot_token_here
SECRET_KEY=$(openssl rand -hex 32)
POSTGRES_PASSWORD=$(openssl rand -hex 16)
DEBUG=False
EOL
```

**⚠️ ВАЖНО:** Замените `your_telegram_bot_token_here` на реальный токен бота!

## Шаг 5: Редактирование .env (если нужно)
```bash
nano .env
```
Или:
```bash
vi .env
```

## Шаг 6: Остановка старых контейнеров (если есть)
```bash
docker-compose down
```

## Шаг 7: Сборка контейнеров
```bash
docker-compose build --no-cache
```

## Шаг 8: Запуск контейнеров
```bash
docker-compose up -d
```

## Шаг 9: Проверка статуса
```bash
docker-compose ps
```

## Шаг 10: Просмотр логов (опционально)
```bash
docker-compose logs -f
```

Или только backend:
```bash
docker-compose logs -f backend
```

---

## Полная последовательность (скопируйте и выполните):

```bash
# 1. Подключение
ssh root@your_server_ip

# 2. Переход в директорию
cd /opt/klyro

# 3. Клонирование/обновление
git clone https://github.com/kobravania/klyro_app.git . || git pull origin main

# 4. Создание .env
cat > .env << EOL
BOT_TOKEN=your_telegram_bot_token_here
SECRET_KEY=$(openssl rand -hex 32)
POSTGRES_PASSWORD=$(openssl rand -hex 16)
DEBUG=False
EOL

# 5. Редактирование .env (замените токен!)
nano .env

# 6. Остановка старых контейнеров
docker-compose down

# 7. Сборка
docker-compose build --no-cache

# 8. Запуск
docker-compose up -d

# 9. Проверка
docker-compose ps

# 10. Логи
docker-compose logs -f backend
```

---

## Полезные команды после деплоя:

**Просмотр логов:**
```bash
docker-compose logs -f
docker-compose logs -f backend
docker-compose logs -f frontend
```

**Перезапуск:**
```bash
docker-compose restart
docker-compose restart backend
```

**Остановка:**
```bash
docker-compose down
```

**Обновление (после git pull):**
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

**Проверка работы API:**
```bash
curl http://localhost:8000/api/health
```

**Очистка и полная пересборка:**
```bash
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

