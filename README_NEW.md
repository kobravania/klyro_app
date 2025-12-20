# Klyro - Новый стек (Django + React)

## Архитектура

- **Backend**: Django + Django REST Framework + PostgreSQL
- **Frontend**: React + Vite + TypeScript
- **Telegram**: Mini App с валидацией initData

## Структура проекта

```
klyro_app/
├── backend_new/          # Django backend
│   ├── klyro_backend/   # Django project
│   ├── api/             # API app
│   └── manage.py
├── frontend_new/         # React frontend
│   ├── src/
│   │   ├── components/   # React компоненты
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
└── docker-compose.new.yml
```

## Ключевая логика

### 1. Init Endpoint (`POST /api/init`)
- Валидирует initData из Telegram
- Создаёт/находит пользователя в БД
- Возвращает `{user_id, has_profile}`

### 2. Frontend Flow
- При открытии Mini App → вызывается `/api/init`
- Пока ответ не получен → UI не рендерится
- `has_profile: true` → Dashboard
- `has_profile: false` → Onboarding

### 3. Сохранение профиля
- После заполнения формы → `POST /api/profile`
- Профиль сохраняется в БД
- Следующий вход → всегда Dashboard

## Запуск

### Локально

**Backend:**
```bash
cd backend_new
python -m venv venv
source venv/bin/activate  # или venv\Scripts\activate на Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

**Frontend:**
```bash
cd frontend_new
npm install
npm run dev
```

### Docker

```bash
docker-compose -f docker-compose.new.yml up --build
```

## Переменные окружения

**Backend (.env):**
```
BOT_TOKEN=your_telegram_bot_token
SECRET_KEY=your_secret_key
POSTGRES_PASSWORD=your_password
DEBUG=True
```

## Миграции

```bash
cd backend_new
python manage.py makemigrations
python manage.py migrate
```

## Модели

- **User**: telegram_user_id, username, created_at
- **Profile**: user (OneToOne), age, height, weight, gender, goal
- **Product**: name, calories, protein, fat, carbs

