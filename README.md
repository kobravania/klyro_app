# Klyro

Telegram Mini App для отслеживания питания.

## Стек

- **Backend**: Django + Django REST Framework + PostgreSQL
- **Frontend**: React + Vite + TypeScript
- **Telegram**: Mini App с валидацией initData

## Запуск

```bash
docker-compose up -d --build
```

Или для просмотра логов:
```bash
docker-compose up --build
```

## Переменные окружения

Создайте `.env` файл в корне проекта:

```bash
cat > .env << EOL
BOT_TOKEN=your_telegram_bot_token
SECRET_KEY=$(openssl rand -hex 32)
POSTGRES_PASSWORD=$(openssl rand -hex 16)
DEBUG=False
BACKEND_PORT=8000
EOL
```

**Важно:** Замените `your_telegram_bot_token` на реальный токен вашего бота.

## API Endpoints

- `POST /api/init` - инициализация пользователя (валидация initData, проверка наличия профиля)
- `GET /api/profile` - получить профиль пользователя
- `POST /api/profile` - создать профиль (только один раз, возвращает 409 если профиль уже существует)

## Архитектура

1. При открытии Mini App вызывается `POST /api/init`
2. Backend валидирует initData и возвращает `{user_id, has_profile}`
3. Если `has_profile: false` → показывается onboarding
4. После сохранения профиля → всегда dashboard
5. Повторный вход → всегда dashboard (онбординг показывается только один раз)

## Порты

- Backend: 8000 (можно изменить через `BACKEND_PORT` в `.env`)
- Frontend: 3000
- PostgreSQL: 5432 (внутренний)

## Troubleshooting

Если порт 8000 занят:
```bash
docker-compose down --remove-orphans
docker stop $(docker ps -q --filter "publish=8000") 2>/dev/null || true
# Или используйте другой порт в .env: BACKEND_PORT=8001
docker-compose up -d
```

Просмотр логов:
```bash
docker-compose logs -f
docker-compose logs -f backend
docker-compose logs -f frontend
```
