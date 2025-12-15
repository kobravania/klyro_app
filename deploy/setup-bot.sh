#!/bin/bash
# Скрипт для настройки и запуска Telegram бота

set -e

echo "🔧 Настройка Telegram бота..."

# Переходим в директорию проекта
cd /root/klyro

# Обновляем код
git pull origin main || echo "⚠️  Не удалось обновить код"

# Устанавливаем зависимости для бота
echo "📦 Установка зависимостей..."
/root/klyro/venv/bin/pip install -q python-telegram-bot==20.7

# Создаем systemd сервис для бота
echo "⚙️  Создание systemd сервиса..."
cat > /etc/systemd/system/klyro-bot.service << 'EOF'
[Unit]
Description=Klyro Telegram Bot
After=network.target

[Service]
User=root
WorkingDirectory=/root/klyro
Environment="PATH=/root/klyro/venv/bin"
Environment="BOT_TOKEN=8515314140:AAGNbIyxtZidF5q8ZQga9hN8PIYHKMrUsPo"
Environment="WEBHOOK_URL=https://klyro.69-67-173-216.sslip.io"
ExecStartPre=/usr/bin/git -C /root/klyro pull origin main
ExecStart=/root/klyro/venv/bin/python3 /root/klyro/bot.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Перезагружаем systemd и запускаем бота
echo "🚀 Запуск бота..."
systemctl daemon-reload
systemctl enable klyro-bot
systemctl restart klyro-bot

# Ждем немного
sleep 2

# Показываем статус
echo "📊 Статус бота:"
systemctl status klyro-bot --no-pager -l

echo "✅ Бот настроен и запущен!"
echo "💡 Теперь настройте Menu Button в @BotFather:"
echo "   1. Откройте @BotFather"
echo "   2. /mybots → выберите @klyro_nutrition_bot"
echo "   3. Bot Settings → Menu Button → Edit"
echo "   4. URL: https://klyro.69-67-173-216.sslip.io"

