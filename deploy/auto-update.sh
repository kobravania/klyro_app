#!/bin/bash
# Автоматическое обновление - проверяет GitHub каждые 2 минуты
# Работает с Docker Compose
# АВТОМАТИЧЕСКИ настраивает себя при первом запуске

# Пробуем найти директорию проекта
PROJECT_DIR=""
if [ -d "/opt/klyro" ]; then
    PROJECT_DIR="/opt/klyro"
elif [ -d "/root/klyro" ]; then
    PROJECT_DIR="/root/klyro"
else
    echo "$(date): Директория проекта не найдена (проверены /opt/klyro и /root/klyro)"
    exit 1
fi

cd "$PROJECT_DIR" || {
    echo "$(date): Не удалось перейти в директорию $PROJECT_DIR"
    exit 1
}

# АВТОМАТИЧЕСКАЯ НАСТРОЙКА: если systemd timer не настроен, настраиваем его автоматически
if ! systemctl is-enabled klyro-update.timer &>/dev/null; then
    echo "$(date): Автообновление не настроено, настраиваю автоматически..."
    
    # Делаем скрипт исполняемым
    chmod +x "$PROJECT_DIR/deploy/auto-update.sh" 2>/dev/null || true
    
    # Создаем systemd service
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

    # Создаем systemd timer
    cat > /etc/systemd/system/klyro-update.timer << EOF
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

    # Активируем timer
    systemctl daemon-reload
    systemctl enable klyro-update.timer
    systemctl start klyro-update.timer
    
    echo "$(date): Автообновление настроено автоматически!"
fi

# Проверяем наличие git
if ! command -v git &> /dev/null; then
    echo "$(date): Git не установлен, пропускаем обновление"
    exit 0
fi

# Проверяем наличие docker-compose
if ! command -v docker-compose &> /dev/null; then
    echo "$(date): docker-compose не установлен, пропускаем обновление"
    exit 0
fi

# Получаем последние изменения
git fetch origin main 2>&1 | grep -v "Permission denied" || true
LOCAL=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
REMOTE=$(git rev-parse origin/main 2>/dev/null || echo "unknown")

if [ "$LOCAL" != "$REMOTE" ] && [ "$REMOTE" != "unknown" ]; then
    echo "$(date): Обнаружены изменения (LOCAL: $LOCAL, REMOTE: $REMOTE), обновляю..."
    git pull origin main 2>&1
    
    # Пересобираем и перезапускаем контейнеры
    cd "$PROJECT_DIR"
    docker-compose build --no-cache 2>&1 | tail -20
    docker-compose up -d 2>&1 | tail -10
    
    # Проверяем и перезапускаем бота, если нужно
    sleep 5
    if ! docker-compose ps bot | grep -q "Up"; then
        echo "$(date): Бот не запущен, запускаю..."
        docker-compose up -d bot
    fi
    
    echo "$(date): Обновление завершено"
else
    echo "$(date): Изменений нет (LOCAL: $LOCAL, REMOTE: $REMOTE)"
    
    # Периодически проверяем, что бот работает (каждые 10 проверок = ~20 минут)
    CHECK_COUNT_FILE="$PROJECT_DIR/.bot_check_count"
    if [ -f "$CHECK_COUNT_FILE" ]; then
        COUNT=$(cat "$CHECK_COUNT_FILE")
        COUNT=$((COUNT + 1))
    else
        COUNT=1
    fi
    echo "$COUNT" > "$CHECK_COUNT_FILE"
    
    if [ $((COUNT % 10)) -eq 0 ]; then
        echo "$(date): Периодическая проверка бота..."
        if ! docker-compose ps bot | grep -q "Up"; then
            echo "$(date): Бот не запущен, запускаю..."
            docker-compose up -d bot
        fi
    fi
fi

