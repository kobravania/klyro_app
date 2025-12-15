#!/bin/bash
# Настройка автоматического обновления через systemd timer
# Этот скрипт можно запустить один раз, после чего всё будет обновляться автоматически

set -e

echo "🔧 Настройка автоматического обновления..."

# Убеждаемся что мы в правильной директории
cd /root/klyro 2>/dev/null || {
    echo "❌ Директория /root/klyro не найдена!"
    exit 1
}

# Устанавливаем git если нужно
if ! command -v git &> /dev/null; then
    echo "📦 Установка git..."
    apt-get update -qq
    apt-get install -y -qq git
fi

# Делаем скрипт исполняемым
chmod +x /root/klyro/deploy/auto-update.sh

# Создаем systemd timer для автоматического обновления каждые 2 минуты
cat > /etc/systemd/system/klyro-update.service << 'EOF'
[Unit]
Description=Klyro Auto Update
After=network.target

[Service]
Type=oneshot
User=root
WorkingDirectory=/root/klyro
ExecStart=/root/klyro/deploy/auto-update.sh
StandardOutput=journal
StandardError=journal
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
echo "   - Автоматический git pull и перезапуск сервисов"
echo ""
echo "📊 Статус:"
systemctl status klyro-update.timer --no-pager -l | head -15

