#!/bin/bash
# Автоматическое обновление - проверяет GitHub каждые 2 минуты
# Работает с Docker Compose

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
    cd /root/klyro
    docker-compose build --no-cache 2>&1 | tail -20
    docker-compose up -d 2>&1 | tail -10
    
    echo "$(date): Обновление завершено"
else
    echo "$(date): Изменений нет (LOCAL: $LOCAL, REMOTE: $REMOTE)"
fi

