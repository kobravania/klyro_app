#!/bin/bash
# Скрипт для диагностики и исправления проблемы с frontend

echo "=== Диагностика Frontend ==="

cd /opt/klyro || exit 1

echo ""
echo "1. Проверка статуса контейнеров:"
docker-compose ps

echo ""
echo "2. Проверка логов frontend:"
docker-compose logs --tail=50 frontend

echo ""
echo "3. Проверка доступности frontend:"
curl -s http://localhost:3000 | head -20 || echo "Frontend недоступен на порту 3000"

echo ""
echo "4. Проверка доступности backend:"
curl -s http://localhost:8000/api/health || echo "Backend недоступен на порту 8000"

echo ""
echo "5. Проверка файлов frontend в контейнере:"
docker-compose exec frontend ls -la /app/ 2>/dev/null || echo "Контейнер frontend не запущен"

echo ""
echo "=== Рекомендации ==="
echo "Если frontend не работает:"
echo "1. docker-compose down"
echo "2. docker-compose build --no-cache frontend"
echo "3. docker-compose up -d"
echo ""
echo "Важно: Приложение должно открываться на порту 3000, а не 8000!"
echo "В Telegram Mini App URL должен быть: http://your_server:3000"

