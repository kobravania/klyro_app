#!/bin/bash
# Автоматическое обновление - проверяет GitHub каждые 2 минуты

cd /root/klyro 2>/dev/null || {
    echo "$(date): Директория /root/klyro не найдена"
    exit 1
}

# Проверяем наличие git
if ! command -v git &> /dev/null; then
    echo "$(date): Git не установлен, пропускаем обновление"
    exit 0
fi

# Получаем последние изменения
git fetch origin main 2>&1 | grep -v "Permission denied" || true
LOCAL=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
REMOTE=$(git rev-parse origin/main 2>/dev/null || echo "unknown")

if [ "$LOCAL" != "$REMOTE" ] && [ "$REMOTE" != "unknown" ]; then
    echo "$(date): Обнаружены изменения (LOCAL: $LOCAL, REMOTE: $REMOTE), обновляю..."
    git pull origin main 2>&1
    
    # Устанавливаем зависимости если нужно
    if [ -f requirements.txt ]; then
        /root/klyro/venv/bin/pip install -q -r requirements.txt 2>&1 | grep -v "already satisfied" || true
    fi
    
    # Перезапускаем сервисы
    systemctl restart klyro 2>&1 || echo "Ошибка перезапуска klyro"
    systemctl restart klyro-bot 2>&1 || echo "Бот не запущен, пропускаем"
    
    echo "$(date): Обновление завершено"
fi

