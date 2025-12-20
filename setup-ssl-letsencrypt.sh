#!/bin/bash
# Скрипт для настройки Let's Encrypt SSL

set -e

DOMAIN="${1}"
EMAIL="${2}"

if [ -z "$DOMAIN" ]; then
    echo "Использование: $0 <domain> <email>"
    echo "Пример: $0 klyro.example.com admin@example.com"
    exit 1
fi

if [ -z "$EMAIL" ]; then
    echo "Использование: $0 <domain> <email>"
    echo "Пример: $0 klyro.example.com admin@example.com"
    exit 1
fi

echo "=== Настройка Let's Encrypt SSL ==="
echo "Домен: $DOMAIN"
echo "Email: $EMAIL"

# Устанавливаем certbot если нет
if ! command -v certbot &> /dev/null; then
    echo "Устанавливаем certbot..."
    apt-get update
    apt-get install -y certbot
fi

# Останавливаем nginx временно
docker-compose stop nginx 2>/dev/null || true

# Получаем сертификат
echo ""
echo "Получаем сертификат от Let's Encrypt..."
certbot certonly --standalone -d "$DOMAIN" --email "$EMAIL" --agree-tos --non-interactive

# Копируем сертификаты
echo ""
echo "Копируем сертификаты..."
mkdir -p nginx/ssl
cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem nginx/ssl/cert.pem
cp /etc/letsencrypt/live/$DOMAIN/privkey.pem nginx/ssl/key.pem
chmod 644 nginx/ssl/cert.pem
chmod 600 nginx/ssl/key.pem

echo ""
echo "✅ SSL сертификат настроен!"
echo ""
echo "Запустите: docker-compose up -d"
echo ""
echo "URL для бота: https://$DOMAIN"

