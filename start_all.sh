#!/bin/bash

echo "🚀 Запуск Klyro Bot Webhook системы..."
echo ""

cd /Users/kobra/PycharmProjects/klyro_app

# Останавливаем старые процессы
echo "1️⃣ Остановка старых процессов..."
pkill -f "python3 bot_server.py" 2>/dev/null
pkill -f "ngrok http" 2>/dev/null
sleep 2

# Запускаем сервер
echo "2️⃣ Запуск сервера..."
PORT=5002 nohup python3 bot_server.py > /tmp/klyro_server.log 2>&1 &
SERVER_PID=$!
sleep 4

if curl -s http://localhost:5002/ > /dev/null 2>&1; then
    echo "   ✅ Сервер запущен (PID: $SERVER_PID)"
else
    echo "   ❌ Сервер не запустился!"
    tail -5 /tmp/klyro_server.log
    exit 1
fi

# Запускаем ngrok
echo "3️⃣ Запуск ngrok..."
/opt/homebrew/bin/ngrok http 5002 > /tmp/ngrok.log 2>&1 &
NGROK_PID=$!
sleep 12

# Получаем URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | python3 -c "import sys, json; t=json.load(sys.stdin); tunnels = t.get('tunnels', []); print(tunnels[0]['public_url'] if tunnels else '')" 2>/dev/null)

if [ -n "$NGROK_URL" ] && [ "$NGROK_URL" != "" ]; then
    echo "   ✅ Ngrok запущен (PID: $NGROK_PID)"
    echo "   🔗 URL: $NGROK_URL"
else
    echo "   ⚠️  Ngrok не запустился автоматически"
    echo "   💡 Запустите вручную: ngrok http 5002"
    echo "   Затем обновите webhook командой из QUICK_RAILWAY_SETUP.md"
    exit 1
fi

# Устанавливаем webhook
echo "4️⃣ Установка webhook..."
RESPONSE=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${NGROK_URL}/webhook&drop_pending_updates=true")

if echo "$RESPONSE" | grep -q '"ok":true'; then
    echo "   ✅ Webhook установлен!"
else
    echo "   ❌ Ошибка установки webhook:"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
    exit 1
fi

# Проверяем webhook
echo "5️⃣ Проверка webhook..."
sleep 2
WEBHOOK_INFO=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo")
WEBHOOK_URL=$(echo "$WEBHOOK_INFO" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('result', {}).get('url', ''))" 2>/dev/null)
ERROR=$(echo "$WEBHOOK_INFO" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('result', {}).get('last_error_message', 'Нет'))" 2>/dev/null)

echo "   URL: $WEBHOOK_URL"
if [ -n "$ERROR" ] && [ "$ERROR" != "Нет" ]; then
    echo "   ⚠️  Ошибка: $ERROR"
else
    echo "   ✅ Webhook работает!"
fi

echo ""
echo "🎉 Готово! Система запущена."
echo ""
echo "📊 Статус:"
echo "   Сервер: http://localhost:5002 (PID: $SERVER_PID)"
echo "   Ngrok: $NGROK_URL (PID: $NGROK_PID)"
echo "   Webhook: $WEBHOOK_URL"
echo ""
echo "💡 Для автоматического перезапуска запустите: ./keep_alive.sh"
echo "💡 Для постоянной работы настройте Railway (см. QUICK_RAILWAY_SETUP.md)"
echo ""
echo "✅ Отправьте /start боту для проверки!"

