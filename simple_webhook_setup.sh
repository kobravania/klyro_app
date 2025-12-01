#!/bin/bash

echo "🚀 Простая настройка webhook для Klyro Bot"
echo ""

# Запускаем сервер в фоне
echo "1️⃣ Запуск сервера..."
cd /Users/kobra/PycharmProjects/klyro_app
python3 bot_server.py > /tmp/klyro_server.log 2>&1 &
SERVER_PID=$!
echo "   Сервер запущен (PID: $SERVER_PID)"
sleep 3

# Проверяем сервер
if curl -s http://localhost:5000/ > /dev/null; then
    echo "   ✅ Сервер работает"
else
    echo "   ❌ Сервер не запустился"
    exit 1
fi

# Запускаем ngrok
echo ""
echo "2️⃣ Запуск ngrok..."
ngrok http 5000 > /tmp/ngrok.log 2>&1 &
NGROK_PID=$!
echo "   Ngrok запущен (PID: $NGROK_PID)"
sleep 5

# Получаем URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | python3 -c "import sys, json; t=json.load(sys.stdin); print(t['tunnels'][0]['public_url'] if t.get('tunnels') else '')" 2>/dev/null)

if [ -z "$NGROK_URL" ]; then
    echo "   ⚠️  Не удалось получить URL автоматически"
    echo "   Откройте http://localhost:4040 в браузере и скопируйте HTTPS URL"
    echo ""
    read -p "Введите ngrok HTTPS URL: " NGROK_URL
fi

WEBHOOK_URL="${NGROK_URL}/webhook"
echo "   ✅ Ngrok URL: $NGROK_URL"

# Устанавливаем webhook
echo ""
echo "3️⃣ Установка webhook..."
RESPONSE=$(curl -s "http://localhost:5000/set_webhook?url=${WEBHOOK_URL}")

if echo "$RESPONSE" | grep -q '"ok":true'; then
    echo "   ✅ Webhook установлен!"
    echo ""
    echo "🎉 Готово!"
    echo ""
    echo "📱 Webhook URL: $WEBHOOK_URL"
    echo ""
    echo "Теперь отправьте /start боту в Telegram"
    echo ""
    echo "Для остановки выполните:"
    echo "  kill $SERVER_PID $NGROK_PID"
    echo "  или: pkill -f bot_server.py && pkill -f ngrok"
else
    echo "   ❌ Ошибка: $RESPONSE"
fi






