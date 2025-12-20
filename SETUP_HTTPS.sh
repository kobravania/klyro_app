#!/bin/bash
# Полная настройка HTTPS для Telegram Mini App

set -e

echo "=== Настройка HTTPS для Klyro ==="

cd /opt/klyro || { echo "Ошибка: директория /opt/klyro не найдена"; exit 1; }

# Обновляем код
echo ""
echo "1. Обновляем код..."
git pull origin main

# Создаём SSL сертификат (самоподписанный для начала)
echo ""
echo "2. Создаём SSL сертификат..."
mkdir -p nginx/ssl

# Используем sslip.io для бесплатного домена с HTTPS
DOMAIN="69-67-173-216.sslip.io"
echo "Используем домен: $DOMAIN"

# Создаём самоподписанный сертификат
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout nginx/ssl/key.pem \
    -out nginx/ssl/cert.pem \
    -subj "/C=RU/ST=State/L=City/O=Klyro/CN=$DOMAIN" 2>/dev/null

echo "✅ Сертификат создан"

# Обновляем nginx.conf с правильным доменом
echo ""
echo "3. Обновляем конфигурацию nginx..."
sed -i "s/server_name 69.67.173.216;/server_name $DOMAIN;/g" nginx/nginx.conf 2>/dev/null || true

# Останавливаем старые контейнеры
echo ""
echo "4. Останавливаем старые контейнеры..."
docker-compose down

# Запускаем с nginx
echo ""
echo "5. Запускаем контейнеры с nginx..."
docker-compose up -d --build

# Ждём запуска
sleep 5

# Проверяем статус
echo ""
echo "6. Проверяем статус..."
docker-compose ps

echo ""
echo "=== Готово! ==="
echo ""
echo "URL для Telegram бота:"
echo "  https://$DOMAIN"
echo ""
echo "Проверка:"
echo "  curl https://$DOMAIN"
echo "  curl https://$DOMAIN/api/health"
echo ""
echo "⚠️  ВАЖНО:"
echo "  1. Откройте @BotFather"
echo "  2. /mybots → @klyro_nutrition_bot"
echo "  3. Bot Settings → Menu Button"
echo "  4. URL: https://$DOMAIN"
echo ""
echo "Если самоподписанный сертификат не работает, используйте Let's Encrypt:"
echo "  ./setup-ssl-letsencrypt.sh $DOMAIN your@email.com"

