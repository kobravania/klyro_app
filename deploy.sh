#!/bin/bash
set -e

echo "=== Klyro Deployment ==="

# Проверка переменных окружения
if [ -z "$SERVER_HOST" ]; then
    echo "Ошибка: SERVER_HOST не установлен"
    exit 1
fi

if [ -z "$SERVER_USER" ]; then
    SERVER_USER="root"
fi

if [ -z "$PROJECT_DIR" ]; then
    PROJECT_DIR="/opt/klyro"
fi

echo "Сервер: $SERVER_USER@$SERVER_HOST"
echo "Директория: $PROJECT_DIR"

# Копируем файлы на сервер
echo ""
echo "=== Копирование файлов ==="
rsync -avz --exclude 'node_modules' --exclude '__pycache__' --exclude '.git' \
    ./backend/ \
    ./frontend/ \
    ./docker-compose.yml \
    ./README.md \
    $SERVER_USER@$SERVER_HOST:$PROJECT_DIR/

# Выполняем деплой на сервере
echo ""
echo "=== Деплой на сервере ==="
ssh $SERVER_USER@$SERVER_HOST << EOF
set -e
cd $PROJECT_DIR

echo "Останавливаем старые контейнеры..."
docker-compose down || true

echo "Создаём .env файл если его нет..."
if [ ! -f .env ]; then
    cat > .env << EOL
BOT_TOKEN=\${BOT_TOKEN}
SECRET_KEY=\$(openssl rand -hex 32)
POSTGRES_PASSWORD=\$(openssl rand -hex 16)
DEBUG=False
EOL
    echo ".env файл создан. НЕОБХОДИМО УСТАНОВИТЬ BOT_TOKEN!"
fi

echo "Собираем и запускаем контейнеры..."
docker-compose build --no-cache
docker-compose up -d

echo "Проверяем статус..."
docker-compose ps

echo ""
echo "=== Деплой завершён ==="
echo "Проверьте логи: docker-compose logs -f"
EOF

echo ""
echo "✅ Деплой завершён успешно!"

