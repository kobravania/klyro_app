# Проверка маршрутизации и доступности Backend

## Маршруты Backend (Django)

### Основные URL:
- `/api/init` - POST - инициализация пользователя
- `/api/profile` - GET - получить профиль
- `/api/profile` - POST - создать профиль
- `/admin/` - Django admin

### Структура:
```
backend/klyro_backend/urls.py
  └── path('api/', include('api.urls'))
      └── api/urls.py
          ├── path('init', views.init_user)
          └── path('profile', views.profile)  # GET и POST
```

## Маршрутизация Frontend

### Прокси Vite:
- Все запросы к `/api/*` проксируются на `http://backend:8000`
- В dev режиме работает автоматически
- В production нужен nginx или другой reverse proxy

### Fetch запросы:
- Используют относительные пути: `/api/init`, `/api/profile`
- Прокси Vite автоматически перенаправляет на backend

## Потенциальные проблемы с доступностью Backend

### 1. CSRF Protection
✅ **Исправлено**: Добавлен middleware для отключения CSRF для API

### 2. CORS
✅ **Настроено**: `CORS_ALLOW_ALL_ORIGINS = True`

### 3. Docker Networking
✅ **Исправлено**: 
- Frontend и Backend в одной сети
- Vite прокси использует `http://backend:8000` (имя сервиса в docker-compose)

### 4. Переменные окружения
⚠️ **Важно**:
- `BOT_TOKEN` должен быть установлен
- `POSTGRES_PASSWORD` должен совпадать в postgres и backend
- `POSTGRES_HOST=postgres` (имя сервиса, не localhost)

### 5. Порты
- Backend: 8000 (можно изменить через `BACKEND_PORT`)
- Frontend: 3000
- PostgreSQL: 5432 (внутренний)

### 6. Health Checks
✅ **Настроено**: PostgreSQL имеет healthcheck, backend ждёт его готовности

## Проверка доступности

### На сервере:
```bash
# Проверка контейнеров
docker-compose ps

# Проверка логов backend
docker-compose logs backend

# Проверка сети
docker network inspect klyro_default

# Тест API из контейнера frontend
docker-compose exec frontend wget -O- http://backend:8000/api/health 2>/dev/null || echo "Backend недоступен"
```

### Из браузера:
```javascript
// Должно работать через прокси Vite
fetch('/api/init', {
  method: 'POST',
  headers: {
    'X-Telegram-Init-Data': 'test'
  }
})
```

## Типичные ошибки

1. **404 на /api/init**
   - Проверьте, что backend запущен: `docker-compose ps`
   - Проверьте логи: `docker-compose logs backend`

2. **Connection refused**
   - Проверьте, что backend и frontend в одной сети
   - Проверьте имя сервиса в docker-compose (должно быть `backend`, не `klyro-backend`)

3. **CORS ошибки**
   - Проверьте `CORS_ALLOW_ALL_ORIGINS = True` в settings.py
   - Проверьте, что `corsheaders` в INSTALLED_APPS

4. **CSRF ошибки**
   - Проверьте, что middleware `DisableCSRFForAPI` добавлен
   - Проверьте порядок middleware (должен быть перед CSRF)

5. **BOT_TOKEN ошибки**
   - Проверьте `.env` файл
   - Проверьте, что переменная передаётся в контейнер: `docker-compose exec backend env | grep BOT_TOKEN`

