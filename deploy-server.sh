#!/bin/bash
set -e

PROJECT_DIR="/opt/klyro"

echo "=== Klyro Server Setup ==="

# Проверка директории
if [ ! -d "$PROJECT_DIR" ]; then
    echo "Создаём директорию $PROJECT_DIR..."
    mkdir -p $PROJECT_DIR
fi

cd $PROJECT_DIR

# Клонируем или обновляем репозиторий
if [ -d ".git" ]; then
    echo "Обновляем код из репозитория..."
    git pull origin main
else
    echo "Клонируем репозиторий..."
    git clone https://github.com/kobravania/klyro_app.git .
fi

# Создаём .env если его нет
if [ ! -f .env ]; then
    echo "Создаём .env файл..."
    cat > .env << EOL
BOT_TOKEN=YOUR_BOT_TOKEN_HERE
SECRET_KEY=$(openssl rand -hex 32)
POSTGRES_PASSWORD=$(openssl rand -hex 16)
DEBUG=False
EOL
    echo "⚠️  ВАЖНО: Установите BOT_TOKEN в .env файле!"
    echo "   nano $PROJECT_DIR/.env"
fi

# Останавливаем старые контейнеры
echo "Останавливаем старые контейнеры..."
docker-compose down || true

# Собираем и запускаем
echo "Собираем контейнеры..."
docker-compose build --no-cache

echo "Запускаем контейнеры..."
docker-compose up -d

# Ждём готовности
echo "Ожидаем готовности сервисов..."
sleep 10

# Проверяем статус
echo ""
echo "=== Статус контейнеров ==="
docker-compose ps

echo ""
echo "=== Логи backend (последние 20 строк) ==="
docker-compose logs --tail=20 backend

echo ""
echo "✅ Деплой завершён!"
echo ""
echo "Полезные команды:"
echo "  Логи: docker-compose logs -f"
echo "  Остановить: docker-compose down"
echo "  Перезапустить: docker-compose restart"

