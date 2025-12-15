#!/bin/bash
# Скрипт для проверки и исправления проблем с ботом

# Пробуем найти директорию проекта
PROJECT_DIR=""
if [ -d "/opt/klyro" ]; then
    PROJECT_DIR="/opt/klyro"
elif [ -d "/root/klyro" ]; then
    PROJECT_DIR="/root/klyro"
else
    echo "Директория проекта не найдена"
    exit 1
fi

cd "$PROJECT_DIR" || exit 1

echo "🔍 Проверка статуса бота..."

# Проверяем, запущен ли контейнер
if docker-compose ps bot | grep -q "Up"; then
    echo "✅ Контейнер бота запущен"
else
    echo "❌ Контейнер бота не запущен, запускаю..."
    docker-compose up -d bot
    sleep 5
fi

# Проверяем логи на ошибки
echo ""
echo "📋 Последние логи бота:"
docker-compose logs --tail=20 bot

# Проверяем, есть ли ошибки
if docker-compose logs bot 2>&1 | grep -i "error\|exception\|traceback" | tail -5; then
    echo ""
    echo "⚠️  Обнаружены ошибки в логах, перезапускаю бота..."
    docker-compose restart bot
    sleep 3
    echo "📋 Логи после перезапуска:"
    docker-compose logs --tail=10 bot
fi

echo ""
echo "✅ Проверка завершена"

