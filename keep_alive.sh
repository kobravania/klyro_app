#!/bin/bash

# Скрипт для автоматического поддержания работы webhook

BOT_TOKEN="${BOT_TOKEN:-}"  # ⚠️ Используйте переменную окружения! export BOT_TOKEN="ваш_токен"
SERVER_PORT=5002

echo "🔄 Автоматический мониторинг и перезапуск webhook..."

while true; do
    # Проверяем сервер
    if ! curl -s http://localhost:$SERVER_PORT/ > /dev/null 2>&1; then
        echo "[$(date)] ⚠️  Сервер не отвечает, перезапускаю..."
        pkill -f "python3 bot_server.py"
        sleep 2
        cd /Users/kobra/PycharmProjects/klyro_app
        PORT=$SERVER_PORT nohup python3 bot_server.py > /tmp/klyro_server.log 2>&1 &
        sleep 3
    fi
    
    # Проверяем ngrok
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | python3 -c "import sys, json; t=json.load(sys.stdin); tunnels = t.get('tunnels', []); print(tunnels[0]['public_url'] if tunnels else '')" 2>/dev/null)
    
    if [ -z "$NGROK_URL" ] || [ "$NGROK_URL" == "" ]; then
        echo "[$(date)] ⚠️  Ngrok не работает, перезапускаю..."
        pkill -f "ngrok http"
        sleep 2
        /opt/homebrew/bin/ngrok http $SERVER_PORT > /tmp/ngrok.log 2>&1 &
        sleep 10
        
        # Получаем новый URL
        NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | python3 -c "import sys, json; t=json.load(sys.stdin); tunnels = t.get('tunnels', []); print(tunnels[0]['public_url'] if tunnels else '')" 2>/dev/null)
        
        if [ -n "$NGROK_URL" ] && [ "$NGROK_URL" != "" ]; then
            echo "[$(date)] ✅ Ngrok запущен: $NGROK_URL"
            # Обновляем webhook
            curl -s "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${NGROK_URL}/webhook&drop_pending_updates=true" > /dev/null
            echo "[$(date)] ✅ Webhook обновлён"
        fi
    else
        # Проверяем webhook
        WEBHOOK_URL=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('result', {}).get('url', ''))" 2>/dev/null)
        
        if [ "$WEBHOOK_URL" != "${NGROK_URL}/webhook" ]; then
            echo "[$(date)] ⚠️  Webhook URL не совпадает, обновляю..."
            curl -s "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${NGROK_URL}/webhook&drop_pending_updates=true" > /dev/null
            echo "[$(date)] ✅ Webhook обновлён на: ${NGROK_URL}/webhook"
        fi
    fi
    
    # Ждём 30 секунд перед следующей проверкой
    sleep 30
done

