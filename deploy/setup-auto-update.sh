#!/bin/bash
# Настройка автоматического обновления через cron

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
EOF

cat > /etc/systemd/system/klyro-update.timer << 'EOF'
[Unit]
Description=Klyro Auto Update Timer
Requires=klyro-update.service

[Timer]
OnBootSec=2min
OnUnitActiveSec=2min
Unit=klyro-update.service

[Install]
WantedBy=timers.target
EOF

chmod +x /root/klyro/deploy/auto-update.sh

systemctl daemon-reload
systemctl enable klyro-update.timer
systemctl start klyro-update.timer

echo "✅ Автообновление настроено - каждые 2 минуты проверяются изменения в GitHub"
systemctl status klyro-update.timer --no-pager

