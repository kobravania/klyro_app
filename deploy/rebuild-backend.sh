#!/bin/bash
# Скрипт для пересборки и перезапуска backend с обновлённым кодом

set -e

PROJECT_DIR="${PROJECT_DIR:-/root/klyro}"
if [ ! -d "$PROJECT_DIR" ]; then
    PROJECT_DIR="/opt/klyro"
fi

if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ Директория проекта не найдена"
    exit 1
fi

cd "$PROJECT_DIR"

echo "🔄 Обновление кода из git..."
git pull origin main || git pull origin master || echo "⚠️  Не удалось обновить код из git"

echo "🔨 Пересборка backend контейнера..."
docker-compose build --no-cache backend

echo "🔄 Перезапуск backend..."
docker-compose up -d --force-recreate backend

echo "⏳ Ожидание запуска backend (5 секунд)..."
sleep 5

echo "✅ Backend пересобран и перезапущен"
echo "📋 Проверка логов:"
docker-compose logs --tail=20 backend

