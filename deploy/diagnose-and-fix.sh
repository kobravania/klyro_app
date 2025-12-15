#!/bin/bash
# Полная диагностика и исправление всех проблем

# Пробуем найти директорию проекта
PROJECT_DIR=""
if [ -d "/opt/klyro" ]; then
    PROJECT_DIR="/opt/klyro"
elif [ -d "/root/klyro" ]; then
    PROJECT_DIR="/root/klyro"
else
    echo "❌ Директория проекта не найдена"
    exit 1
fi

cd "$PROJECT_DIR" || exit 1

echo "🔍 Диагностика Klyro..."
echo ""

# 1. Проверяем Git
echo "1. Проверка Git..."
if command -v git &> /dev/null; then
    echo "   ✅ Git установлен"
    git pull origin main 2>&1 | tail -5
else
    echo "   ❌ Git не установлен"
fi
echo ""

# 2. Проверяем Docker
echo "2. Проверка Docker..."
if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
    echo "   ✅ Docker установлен"
    docker --version
    docker-compose --version
else
    echo "   ❌ Docker не установлен"
    exit 1
fi
echo ""

# 3. Проверяем .env файл
echo "3. Проверка .env файла..."
if [ -f "$PROJECT_DIR/.env" ]; then
    echo "   ✅ .env файл существует"
    if grep -q "BOT_TOKEN" "$PROJECT_DIR/.env"; then
        echo "   ✅ BOT_TOKEN найден в .env"
    else
        echo "   ❌ BOT_TOKEN НЕ найден в .env!"
    fi
    if grep -q "WEB_APP_URL\|DOMAIN" "$PROJECT_DIR/.env"; then
        echo "   ✅ WEB_APP_URL/DOMAIN найден в .env"
    else
        echo "   ⚠️  WEB_APP_URL/DOMAIN не найден в .env (будет использован дефолтный)"
    fi
else
    echo "   ❌ .env файл НЕ существует!"
fi
echo ""

# 4. Проверяем статус контейнеров
echo "4. Проверка контейнеров..."
docker-compose ps
echo ""

# 5. Проверяем бота отдельно
echo "5. Проверка бота..."
if docker-compose ps bot | grep -q "Up"; then
    echo "   ✅ Контейнер бота запущен"
else
    echo "   ❌ Контейнер бота НЕ запущен!"
    echo "   🔧 Запускаю бота..."
    docker-compose up -d bot
    sleep 5
fi
echo ""

# 6. Показываем логи бота
echo "6. Последние логи бота (последние 30 строк):"
echo "   ========================================="
docker-compose logs --tail=30 bot
echo "   ========================================="
echo ""

# 7. Проверяем, есть ли ошибки
echo "7. Поиск ошибок в логах..."
ERRORS=$(docker-compose logs bot 2>&1 | grep -i "error\|exception\|traceback\|failed" | tail -5)
if [ -n "$ERRORS" ]; then
    echo "   ⚠️  Найдены ошибки:"
    echo "$ERRORS"
    echo ""
    echo "   🔧 Пробую исправить..."
    bash "$PROJECT_DIR/deploy/fix-bot.sh" 2>&1 | tail -20
else
    echo "   ✅ Ошибок не найдено"
fi
echo ""

# 8. Проверяем systemd service
echo "8. Проверка systemd service..."
if systemctl is-enabled klyro-bot.service &>/dev/null; then
    echo "   ✅ Systemd service настроен"
    systemctl status klyro-bot.service --no-pager -l | head -10
else
    echo "   ⚠️  Systemd service не настроен"
    if [ -f "$PROJECT_DIR/deploy/setup-bot-service.sh" ]; then
        echo "   🔧 Настраиваю systemd service..."
        bash "$PROJECT_DIR/deploy/setup-bot-service.sh" 2>&1 | tail -10
    fi
fi
echo ""

# 9. Финальная проверка
echo "9. Финальная проверка..."
sleep 3
if docker-compose ps bot | grep -q "Up"; then
    echo "   ✅ Бот запущен и работает"
    echo ""
    echo "📋 Последние 10 строк логов бота:"
    docker-compose logs --tail=10 bot
else
    echo "   ❌ Бот все еще не запущен!"
    echo ""
    echo "📋 Попробуй вручную:"
    echo "   docker-compose logs bot"
    echo "   docker-compose up -d bot"
fi

echo ""
echo "✅ Диагностика завершена"

