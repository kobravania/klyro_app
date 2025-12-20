# Проверка почему открывается README вместо приложения

## Проблема
При открытии приложения показывается README.md вместо React приложения.

## Причины

### 1. Открывается не тот порт
- ❌ **Неправильно**: `http://server:8000` (backend)
- ✅ **Правильно**: `http://server:3000` (frontend)

### 2. Frontend не запущен
Проверьте:
```bash
docker-compose ps
docker-compose logs frontend
```

### 3. Vite dev server не работает
Проверьте логи:
```bash
docker-compose logs -f frontend
```

Должно быть:
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:3000/
```

### 4. Проблема с прокси
Если запросы идут на `/api/*`, они должны проксироваться на backend.

## Решение

### Шаг 1: Проверьте статус
```bash
cd /opt/klyro
docker-compose ps
```

Все сервисы должны быть `Up`:
- `klyro-frontend-1` - порт 3000
- `klyro-backend-1` - порт 8000
- `klyro-postgres-1` - порт 5432

### Шаг 2: Проверьте логи frontend
```bash
docker-compose logs frontend
```

Если есть ошибки - исправьте их.

### Шаг 3: Проверьте доступность
```bash
# Frontend должен отвечать
curl http://localhost:3000

# Backend должен отвечать
curl http://localhost:8000/api/health
```

### Шаг 4: Откройте правильный URL
В Telegram Mini App настройках должен быть:
- **URL**: `http://your_server_ip:3000` или `https://your_domain:3000`
- **НЕ**: `http://your_server_ip:8000`

## Если проблема сохраняется

### Пересоберите frontend:
```bash
docker-compose down
docker-compose build --no-cache frontend
docker-compose up -d
```

### Проверьте, что node_modules установлены:
```bash
docker-compose exec frontend npm list
```

### Проверьте, что Vite запущен:
```bash
docker-compose exec frontend ps aux | grep vite
```

