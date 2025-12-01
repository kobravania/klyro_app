#!/bin/bash

# Скрипт для запуска webhook сервера и ngrok

echo "🚀 Запуск Klyro Bot Webhook сервера..."
echo ""

# Запускаем сервер в фоне
cd /Users/kobra/PycharmProjects/klyro_app
python3 bot_server.py &
SERVER_PID=$!

echo "✅ Сервер запущен (PID: $SERVER_PID)"
echo "⏳ Ожидание запуска сервера..."
sleep 3

# Проверяем, что сервер работает
if ! curl -s http://localhost:5000/ > /dev/null; then
    echo "❌ Сервер не запустился!"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

echo "✅ Сервер работает на http://localhost:5000"
echo ""
echo "📡 Запуск ngrok..."
echo ""

# Запускаем ngrok
ngrok http 5000 > /tmp/ngrok.log 2>&1 &
NGROK_PID=$!

echo "⏳ Ожидание запуска ngrok..."
sleep 5

# Получаем URL из ngrok
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | python3 -c "import sys, json; data = json.load(sys.stdin); print(data['tunnels'][0]['public_url'] if data.get('tunnels') else '')" 2>/dev/null)

if [ -z "$NGROK_URL" ]; then
    echo "❌ Не удалось получить ngrok URL"
    echo "Проверьте ngrok вручную: http://localhost:4040"
    kill $SERVER_PID $NGROK_PID 2>/dev/null
    exit 1
fi

WEBHOOK_URL="${NGROK_URL}/webhook"
echo "✅ Ngrok URL: $NGROK_URL"
echo ""
echo "🔗 Установка webhook..."
echo ""

# Устанавливаем webhook
RESPONSE=$(curl -s "http://localhost:5000/set_webhook?url=${WEBHOOK_URL}")

if echo "$RESPONSE" | grep -q '"ok":true'; then
    echo "✅ Webhook успешно установлен!"
    echo ""
    echo "📱 URL webhook: $WEBHOOK_URL"
    echo ""
    echo "🎉 Готово! Теперь отправьте /start боту в Telegram"
    echo ""
    echo "Для остановки нажмите Ctrl+C или выполните:"
    echo "  kill $SERVER_PID $NGROK_PID"
else
    echo "❌ Ошибка установки webhook:"
    echo "$RESPONSE"
fi

echo ""
echo "Сервер работает. Нажмите Ctrl+C для остановки."
echo "Ngrok dashboard: http://localhost:4040"

# Ждём завершения
wait






