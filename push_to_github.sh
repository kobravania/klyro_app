#!/bin/bash

# Скрипт для загрузки проекта на GitHub
# Использование: ./push_to_github.sh

echo "🚀 Загрузка Klyro на GitHub..."

# Добавляем remote (замените на ваш URL репозитория)
git remote add origin https://github.com/kobravania/klyro_app.git 2>/dev/null || git remote set-url origin https://github.com/kobravania/klyro_app.git

# Отправляем на GitHub
git push -u origin main

echo "✅ Готово! Теперь включите GitHub Pages в настройках репозитория."
echo "📝 URL будет: https://kobravania.github.io/klyro_app/"

