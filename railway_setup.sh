#!/bin/bash

echo "🚀 Настройка Railway для Klyro Bot"
echo ""

# Проверяем Railway CLI
if ! command -v railway &> /dev/null; then
    echo "📦 Установка Railway CLI..."
    curl -fsSL https://railway.app/install.sh | sh
fi

echo "✅ Railway CLI установлен"
echo ""
echo "📝 Следующие шаги:"
echo ""
echo "1. Войдите в Railway:"
echo "   railway login"
echo ""
echo "2. Создайте новый проект:"
echo "   railway init"
echo ""
echo "3. Добавьте переменные окружения:"
echo "   railway variables set BOT_TOKEN=${BOT_TOKEN}"
echo "   railway variables set WEB_APP_URL=https://kobravania.github.io/klyro_app/"
echo ""
echo "4. Задеплойте:"
echo "   railway up"
echo ""
echo "5. Получите URL:"
echo "   railway domain"
echo ""
echo "6. Установите webhook:"
echo "   curl \"https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=ВАШ_RAILWAY_URL/webhook\""
echo ""

