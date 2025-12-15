#!/bin/bash
# Полная настройка Klyro: Flask сервер + Telegram бот

set -e

echo "🚀 Полная настройка Klyro..."

# Проверяем и устанавливаем git если нужно
if ! command -v git &> /dev/null; then
    echo "📦 Установка git..."
    apt-get update -qq
    apt-get install -y -qq git
fi

cd /root/klyro

# 1. Обновляем код
echo "📥 Обновление кода..."
if [ -d .git ]; then
    git pull origin main || echo "⚠️  Не удалось обновить через git, продолжаем..."
else
    echo "⚠️  Это не git репозиторий, пропускаем обновление"
fi

# 2. Устанавливаем все зависимости
echo "📦 Установка зависимостей..."
/root/klyro/venv/bin/pip install -q -r requirements.txt

# 3. Настраиваем и перезапускаем Flask сервер
echo "⚙️  Настройка Flask сервера..."
systemctl daemon-reload
systemctl restart klyro
sleep 2

# 4. Настраиваем и запускаем бота
echo "🤖 Настройка Telegram бота..."
bash /root/klyro/deploy/setup-bot.sh

# 5. Проверка статуса
echo ""
echo "📊 Статус сервисов:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
systemctl status klyro --no-pager -l | head -10
echo ""
systemctl status klyro-bot --no-pager -l | head -10
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "✅ Настройка завершена!"
echo ""
echo "💡 Следующие шаги:"
echo "   1. Откройте @BotFather в Telegram"
echo "   2. Отправьте: /mybots"
echo "   3. Выберите: @klyro_nutrition_bot"
echo "   4. Bot Settings → Menu Button → Edit"
echo "   5. URL: https://klyro.69-67-173-216.sslip.io"
echo "   6. Сохраните"
echo ""
echo "   7. Откройте бота @klyro_nutrition_bot"
echo "   8. Нажмите кнопку 'ОТКРЫТЬ' или Menu Button"
echo "   9. Мини-аппа должна открыться!"

