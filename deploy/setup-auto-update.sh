#!/bin/bash
# Настройка автоматического обновления через systemd timer
# Этот скрипт можно запустить один раз, после чего всё будет обновляться автоматически

set -e

echo "🔧 Настройка автоматического обновления..."

# Пробуем найти директорию проекта
PROJECT_DIR=""
if [ -d "/opt/klyro" ]; then
    PROJECT_DIR="/opt/klyro"
elif [ -d "/root/klyro" ]; then
    PROJECT_DIR="/root/klyro"
else
    echo "❌ Директория проекта не найдена (проверены /opt/klyro и /root/klyro)!"
    exit 1
fi

cd "$PROJECT_DIR" || {
    echo "❌ Не удалось перейти в директорию $PROJECT_DIR!"
    exit 1
}

# Устанавливаем git если нужно
if ! command -v git &> /dev/null; then
    echo "📦 Установка git..."
    apt-get update -qq
    apt-get install -y -qq git
fi

# Делаем скрипт исполняемым
chmod +x "$PROJECT_DIR/deploy/auto-update.sh"

# Создаем systemd timer для автоматического обновления каждые 2 минуты
cat > /etc/systemd/system/klyro-update.service << EOF
[Unit]
Description=Klyro Auto Update (Docker)
After=network.target docker.service

[Service]
Type=oneshot
User=root
WorkingDirectory=$PROJECT_DIR
ExecStart=$PROJECT_DIR/deploy/auto-update.sh
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/klyro-update.timer << 'EOF'
[Unit]
Description=Klyro Auto Update Timer
Requires=klyro-update.service

[Timer]
OnBootSec=1min
OnUnitActiveSec=2min
Unit=klyro-update.service

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable klyro-update.timer
systemctl start klyro-update.timer

echo ""
echo "✅ Автообновление настроено!"
echo "   - Проверка каждые 2 минуты"
echo "   - Автоматический git pull и перезапуск Docker контейнеров"
echo ""
echo "📊 Статус:"
systemctl status klyro-update.timer --no-pager -l | head -15

