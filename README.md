# Klyro

Telegram Mini App для отслеживания питания.

## Стек

- **Backend**: Django + Django REST Framework + PostgreSQL
- **Frontend**: React + Vite + TypeScript
- **Telegram**: Mini App с валидацией initData

## Запуск

```bash
docker-compose up --build
```

## Переменные окружения

Создайте `.env` файл:

```
BOT_TOKEN=your_telegram_bot_token
SECRET_KEY=your_secret_key
POSTGRES_PASSWORD=your_password
DEBUG=False
```

## API Endpoints

- `POST /api/init` - инициализация пользователя
- `GET /api/profile` - получить профиль
- `POST /api/profile` - создать профиль (только один раз)

## Архитектура

1. При открытии Mini App вызывается `POST /api/init`
2. Backend валидирует initData и возвращает `has_profile`
3. Если `has_profile: false` → показывается onboarding
4. После сохранения профиля → всегда dashboard
