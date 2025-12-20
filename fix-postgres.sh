#!/bin/bash
# Скрипт для исправления проблем с PostgreSQL

echo "=== Исправление проблем с PostgreSQL ==="

# Останавливаем контейнеры
echo "Останавливаем контейнеры..."
docker-compose down

# Удаляем старый volume (если есть проблемы)
echo "Удаляем старый volume postgres..."
docker volume rm klyro_postgres_data 2>/dev/null || true

# Проверяем .env файл
if [ ! -f .env ]; then
    echo "Создаём .env файл..."
    cat > .env << EOL
BOT_TOKEN=your_telegram_bot_token_here
SECRET_KEY=$(openssl rand -hex 32)
POSTGRES_PASSWORD=$(openssl rand -hex 16)
DEBUG=False
EOL
    echo "⚠️  ВАЖНО: Установите BOT_TOKEN в .env файле!"
fi

# Проверяем права на директорию
echo "Проверяем права на директорию..."
chmod 755 /opt/klyro 2>/dev/null || true

# Запускаем с очисткой orphan контейнеров
echo "Запускаем контейнеры..."
docker-compose up -d --remove-orphans

# Ждём немного
sleep 5

# Проверяем логи postgres
echo ""
echo "=== Логи PostgreSQL ==="
docker-compose logs postgres

echo ""
echo "=== Статус контейнеров ==="
docker-compose ps

