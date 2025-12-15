#!/bin/bash
# Автоматическое обновление при получении webhook от GitHub
# Этот скрипт должен быть запущен как сервис или через cron

cd /root/klyro || exit 1

# Получаем последние изменения
git fetch origin main
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" != "$REMOTE" ]; then
    echo "$(date): Обнаружены изменения, обновляю..."
    git pull origin main
    
    # Перезапускаем сервисы
    systemctl restart klyro
    systemctl restart klyro-bot 2>/dev/null || echo "Бот не запущен, пропускаем"
    
    echo "$(date): Обновление завершено"
fi

