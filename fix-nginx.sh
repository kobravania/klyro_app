#!/bin/bash
# Скрипт для исправления проблем с nginx

set -e

echo "=== Исправление проблем с nginx ==="

cd /opt/klyro || exit 1

echo ""
echo "1. Проверка логов nginx:"
docker-compose logs --tail=50 nginx

echo ""
echo "2. Останавливаем nginx:"
docker-compose stop nginx

echo ""
echo "3. Создаём SSL сертификат (если нет):"
mkdir -p nginx/ssl
if [ ! -f nginx/ssl/cert.pem ] || [ ! -f nginx/ssl/key.pem ]; then
    echo "Создаём самоподписанный сертификат..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/key.pem \
        -out nginx/ssl/cert.pem \
        -subj "/C=RU/ST=State/L=City/O=Klyro/CN=localhost" 2>/dev/null
    echo "✅ Сертификат создан"
else
    echo "✅ Сертификат уже существует"
fi

echo ""
echo "4. Проверяем конфигурацию nginx:"
docker-compose run --rm nginx nginx -t || {
    echo "⚠️  Ошибка в конфигурации nginx"
    echo "Используем упрощённую конфигурацию без SSL..."
    cp nginx/nginx-simple.conf nginx/nginx.conf
}

echo ""
echo "5. Запускаем nginx:"
docker-compose up -d nginx

echo ""
echo "6. Проверяем статус:"
sleep 3
docker-compose ps nginx

echo ""
echo "7. Проверяем логи:"
docker-compose logs --tail=20 nginx

echo ""
echo "=== Готово ==="
echo "Проверьте доступность:"
echo "  curl http://localhost:8080"
echo "  curl http://localhost:8080/api/health"

