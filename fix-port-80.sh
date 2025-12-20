#!/bin/bash
# Скрипт для освобождения порта 80

echo "=== Освобождение порта 80 ==="

# Проверяем, что занимает порт 80
echo "Проверяем, что занимает порт 80..."
lsof -i :80 2>/dev/null || netstat -tulpn | grep :80 || ss -tulpn | grep :80

echo ""
echo "Останавливаем старый nginx (если есть)..."
systemctl stop nginx 2>/dev/null || service nginx stop 2>/dev/null || true

# Проверяем docker контейнеры на порту 80
echo "Проверяем docker контейнеры на порту 80..."
docker ps --format "{{.ID}} {{.Ports}}" | grep :80 || echo "Нет docker контейнеров на порту 80"

# Останавливаем контейнеры, использующие порт 80
CONTAINERS=$(docker ps --format "{{.ID}} {{.Ports}}" | grep ":80" | awk '{print $1}')
if [ ! -z "$CONTAINERS" ]; then
    echo "Останавливаем контейнеры на порту 80..."
    echo "$CONTAINERS" | xargs docker stop
fi

echo ""
echo "Проверяем порт 80 снова..."
lsof -i :80 2>/dev/null || netstat -tulpn | grep :80 || ss -tulpn | grep :80 || echo "Порт 80 свободен"

echo ""
echo "Теперь можно запустить:"
echo "  docker-compose up -d"

