#!/bin/bash
# Скрипт для настройки SSL сертификата

set -e

echo "=== Настройка SSL для Telegram Mini App ==="

DOMAIN="${1:-69.67.173.216}"
EMAIL="${2:-admin@example.com}"

echo "Домен: $DOMAIN"
echo "Email: $EMAIL"

# Создаём директорию для SSL
mkdir -p nginx/ssl

# Вариант 1: Использовать самоподписанный сертификат (для тестирования)
echo ""
echo "Создаём самоподписанный сертификат..."
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout nginx/ssl/key.pem \
    -out nginx/ssl/cert.pem \
    -subj "/C=RU/ST=State/L=City/O=Klyro/CN=$DOMAIN"

echo ""
echo "✅ Сертификат создан в nginx/ssl/"
echo ""
echo "⚠️  ВАЖНО:"
echo "   Самоподписанный сертификат может не работать в Telegram Mini App"
echo "   Для продакшена используйте Let's Encrypt:"
echo ""
echo "   certbot certonly --standalone -d $DOMAIN --email $EMAIL --agree-tos"
echo "   Затем скопируйте сертификаты в nginx/ssl/"

