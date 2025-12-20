#!/bin/bash
# Скрипт для исправления ошибки 502 Bad Gateway

set -e

echo "=== Исправление 502 Bad Gateway ==="

cd /opt/klyro || exit 1

echo ""
echo "1. Проверка статуса контейнеров:"
docker-compose ps

echo ""
echo "2. Проверка логов nginx:"
docker-compose logs --tail=30 nginx

echo ""
echo "3. Проверка логов frontend:"
docker-compose logs --tail=30 frontend

echo ""
echo "4. Проверка логов backend:"
docker-compose logs --tail=30 backend

echo ""
echo "5. Проверка доступности frontend из nginx:"
docker-compose exec nginx wget -O- http://frontend:3000 2>&1 | head -10 || echo "Frontend недоступен"

echo ""
echo "6. Проверка доступности backend из nginx:"
docker-compose exec nginx wget -O- http://backend:8000/api/health 2>&1 | head -10 || echo "Backend недоступен"

echo ""
echo "=== Рекомендации ==="
echo "Если контейнеры не запущены:"
echo "  docker-compose up -d"
echo ""
echo "Если frontend/backend не отвечают:"
echo "  docker-compose restart frontend backend"
echo ""
echo "Если проблема сохраняется:"
echo "  docker-compose down"
echo "  docker-compose up -d --build"

