#!/bin/bash
# Скрипт для автоматической настройки автообновления
# Запускается автоматически при старте системы или контейнеров

# Пробуем найти директорию проекта
PROJECT_DIR=""
if [ -d "/opt/klyro" ]; then
    PROJECT_DIR="/opt/klyro"
elif [ -d "/root/klyro" ]; then
    PROJECT_DIR="/root/klyro"
else
    exit 0  # Проект не найден, выходим без ошибки
fi

cd "$PROJECT_DIR" || exit 0

# Если автообновление уже настроено, выходим
if systemctl is-enabled klyro-update.timer &>/dev/null; then
    exit 0
fi

# Если скрипт auto-update.sh существует, запускаем его для настройки
if [ -f "$PROJECT_DIR/deploy/auto-update.sh" ]; then
    chmod +x "$PROJECT_DIR/deploy/auto-update.sh" 2>/dev/null || true
    # Запускаем в фоне, чтобы не блокировать
    bash "$PROJECT_DIR/deploy/auto-update.sh" > /dev/null 2>&1 &
fi

# Также проверяем и запускаем бота, если он не запущен
if command -v docker-compose &> /dev/null; then
    if ! docker-compose ps bot 2>/dev/null | grep -q "Up"; then
        echo "$(date): Бот не запущен, запускаю..."
        docker-compose up -d bot 2>&1 || true
    fi
fi

exit 0

