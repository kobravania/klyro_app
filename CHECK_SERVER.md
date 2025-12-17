# Команды для проверки сервера

## 1. Проверка структуры проекта

```bash
cd /root/klyro
pwd
ls -la
```

## 2. Проверка основных файлов

```bash
cd /root/klyro
ls -la docker-compose.yml
ls -la bot.py
ls -la bot_server.py
ls -la index.html
ls -la requirements.txt
```

## 3. Проверка структуры директорий

```bash
cd /root/klyro
tree -L 2 -d || find . -maxdepth 2 -type d | head -20
ls -la js/
ls -la js/screens/
ls -la js/utils/
ls -la js/components/
ls -la deploy/
ls -la bot/
ls -la backend/
ls -la frontend/
```

## 4. Проверка .env файлов

```bash
cd /root/klyro
echo "=== .env в корне ==="
cat .env 2>/dev/null || echo "Файл .env не найден"

echo ""
echo "=== backend/.env ==="
cat backend/.env 2>/dev/null || echo "Файл backend/.env не найден"

echo ""
echo "=== bot/.env ==="
cat bot/.env 2>/dev/null || echo "Файл bot/.env не найден"
```

## 5. Проверка Docker контейнеров

```bash
cd /root/klyro
docker-compose ps
docker-compose logs --tail=50 bot
docker-compose logs --tail=50 backend
```

## 6. Проверка переменных окружения в контейнерах

```bash
cd /root/klyro
echo "=== Переменные в контейнере bot ==="
docker-compose exec bot env | grep -E "BOT_TOKEN|WEB_APP_URL|DOMAIN"

echo ""
echo "=== Переменные в контейнере backend ==="
docker-compose exec backend env | grep -E "POSTGRES|BOT_TOKEN|DATABASE"
```

## 7. Проверка доступности сервисов

```bash
cd /root/klyro
echo "=== Проверка PostgreSQL ==="
docker-compose exec postgres psql -U klyro -d klyro -c "\dt"

echo ""
echo "=== Проверка backend health ==="
curl -f http://localhost:5000/health || echo "Backend недоступен"

echo ""
echo "=== Проверка frontend ==="
curl -I http://localhost:8080/ | head -5
```

## 8. Проверка последних коммитов

```bash
cd /root/klyro
git log --oneline -5
git status
```

## Ожидаемые значения в .env

### Корневой .env должен содержать:
```
BOT_TOKEN=8515314140:AAGNbIyxtZidF5q8ZQga9hN8PIYHKMrUsPo
WEB_APP_URL=https://klyro.69-67-173-216.sslip.io
DOMAIN=https://klyro.69-67-173-216.sslip.io
POSTGRES_DB=klyro
POSTGRES_USER=klyro
POSTGRES_PASSWORD=StrongPass123!
```

### backend/.env (если есть отдельный):
```
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=klyro
POSTGRES_USER=klyro
POSTGRES_PASSWORD=StrongPass123!
BOT_TOKEN=8515314140:AAGNbIyxtZidF5q8ZQga9hN8PIYHKMrUsPo
```

### bot/.env (если есть отдельный):
```
BOT_TOKEN=8515314140:AAGNbIyxtZidF5q8ZQga9hN8PIYHKMrUsPo
WEB_APP_URL=https://klyro.69-67-173-216.sslip.io
```

