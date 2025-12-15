#!/bin/bash
# Скрипт для настройки и запуска Telegram бота

# Создаем systemd сервис для бота
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
ExecStart=/root/klyro/venv/bin/python3 /root/klyro/bot.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Перезагружаем systemd и запускаем бота
systemctl daemon-reload
systemctl enable klyro-bot
systemctl start klyro-bot
systemctl status klyro-bot --no-pager

