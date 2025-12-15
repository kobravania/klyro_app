#!/bin/bash
# Полная настройка Klyro: Flask сервер + Telegram бот

set -e

echo "🚀 Полная настройка Klyro..."

cd /root/klyro

# 1. Обновляем код
echo "📥 Обновление кода..."
git pull origin main

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

