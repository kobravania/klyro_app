#!/bin/bash
# Настройка бота как systemd service для автоматического запуска и перезапуска

# Пробуем найти директорию проекта
PROJECT_DIR=""
if [ -d "/opt/klyro" ]; then
    PROJECT_DIR="/opt/klyro"
elif [ -d "/root/klyro" ]; then
    PROJECT_DIR="/root/klyro"
else
    echo "Директория проекта не найдена"
    exit 1
fi

cd "$PROJECT_DIR" || exit 1

echo "🔧 Настройка systemd service для бота..."

# Загружаем переменные окружения из .env
if [ -f "$PROJECT_DIR/.env" ]; then
    export $(cat "$PROJECT_DIR/.env" | grep -v '^#' | xargs)
fi

# Создаем systemd service для бота
cat > /etc/systemd/system/klyro-bot.service << EOF
[Unit]
Description=Klyro Telegram Bot
After=docker.service network.target
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/bin/docker-compose up -d bot
ExecStop=/usr/bin/docker-compose stop bot
ExecReload=/usr/bin/docker-compose restart bot
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Создаем также timer для периодической проверки
cat > /etc/systemd/system/klyro-bot-check.service << EOF
[Unit]
Description=Klyro Bot Health Check
After=docker.service

[Service]
Type=oneshot
WorkingDirectory=$PROJECT_DIR
ExecStart=/bin/bash -c 'if ! docker-compose ps bot | grep -q "Up"; then docker-compose up -d bot; fi'
EOF

cat > /etc/systemd/system/klyro-bot-check.timer << EOF
[Unit]
Description=Klyro Bot Health Check Timer
Requires=klyro-bot-check.service

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min
Unit=klyro-bot-check.service

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable klyro-bot.service
systemctl enable klyro-bot-check.timer
systemctl start klyro-bot.service
systemctl start klyro-bot-check.timer

echo "✅ Systemd service для бота настроен!"
echo "   - Автоматический запуск при загрузке системы"
echo "   - Автоматический перезапуск при падении"
echo "   - Периодическая проверка каждые 5 минут"

systemctl status klyro-bot.service --no-pager -l | head -15

