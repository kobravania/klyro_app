#!/bin/bash
# Скрипт для исправления проблемы с занятым портом

echo "=== Исправление проблемы с портом 8000 ==="

# Проверяем, что занимает порт 8000
echo "Проверяем, что занимает порт 8000..."
lsof -i :8000 || netstat -tulpn | grep :8000 || ss -tulpn | grep :8000

echo ""
echo "Останавливаем старые контейнеры..."
docker-compose down

# Останавливаем контейнер, который может занимать порт
echo "Ищем контейнеры, использующие порт 8000..."
docker ps | grep 8000

# Останавливаем все контейнеры с портом 8000
CONTAINERS=$(docker ps --format "{{.ID}} {{.Ports}}" | grep 8000 | awk '{print $1}')
if [ ! -z "$CONTAINERS" ]; then
    echo "Останавливаем контейнеры, использующие порт 8000..."
    echo "$CONTAINERS" | xargs docker stop
fi

# Удаляем старые контейнеры
echo "Удаляем старые контейнеры..."
docker-compose down --remove-orphans

echo ""
echo "Теперь можно запустить:"
echo "docker-compose up -d"

