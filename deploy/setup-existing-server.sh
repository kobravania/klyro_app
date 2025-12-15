#!/bin/bash

set -e

echo "🚀 Установка Klyro на сервер с существующим проектом..."

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Проверка, что скрипт запущен от root или с sudo
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Пожалуйста, запустите скрипт с sudo${NC}"
    exit 1
fi

# Определение директории проекта
PROJECT_DIR="/opt/klyro"
cd $PROJECT_DIR

# Проверка наличия .env
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${YELLOW}📝 ВАЖНО: Отредактируйте .env файл!${NC}"
        echo -e "${YELLOW}   Используйте ПОДДОМЕН для Klyro (например, klyro.yourdomain.com)${NC}"
        echo -e "${YELLOW}   Нажмите Enter после редактирования...${NC}"
        read
    else
        echo -e "${RED}❌ Файл .env.example не найден!${NC}"
        exit 1
    fi
fi

# Загрузка переменных окружения
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Проверка обязательных переменных
if [ -z "$DOMAIN" ] || [ -z "$POSTGRES_PASSWORD" ]; then
    echo -e "${RED}❌ Пожалуйста, установите DOMAIN и POSTGRES_PASSWORD в .env файле${NC}"
    exit 1
fi

# Проверка, что используется поддомен
if [[ ! "$DOMAIN" == *.*.* ]]; then
    echo -e "${YELLOW}⚠️  Внимание: DOMAIN должен быть поддоменом (например, klyro.yourdomain.com)${NC}"
    read -p "Продолжить? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Установка Docker (если еще не установлен)
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}🐳 Установка Docker...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
else
    echo -e "${GREEN}✅ Docker уже установлен${NC}"
fi

# Установка Docker Compose (если еще не установлен)
if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}🐳 Установка Docker Compose...${NC}"
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
else
    echo -e "${GREEN}✅ Docker Compose уже установлен${NC}"
fi

# Создание директорий для certbot
mkdir -p nginx/certbot/conf
mkdir -p nginx/certbot/www

# Запуск сервисов (БЕЗ получения SSL - это сделает основной Nginx)
echo -e "${YELLOW}🚀 Запуск Docker контейнеров на портах 8080/8443...${NC}"
docker-compose up -d

# Ожидание запуска
echo -e "${YELLOW}⏳ Ожидание запуска сервисов (20 секунд)...${NC}"
sleep 20

# Проверка статуса
echo -e "${YELLOW}🔍 Проверка статуса сервисов...${NC}"
docker-compose ps

# Проверка health check
echo -e "${YELLOW}🏥 Проверка health check...${NC}"
if curl -f http://localhost:8080/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Klyro работает на порту 8080${NC}"
else
    echo -e "${RED}❌ Klyro не отвечает на порту 8080${NC}"
    echo -e "${YELLOW}Проверьте логи: docker-compose logs${NC}"
fi

echo ""
echo -e "${GREEN}✅ Установка завершена!${NC}"
echo ""
echo -e "${YELLOW}📝 СЛЕДУЮЩИЕ ШАГИ:${NC}"
echo -e "1. Настройте DNS: добавьте A-запись для ${DOMAIN} → IP сервера"
echo -e "2. Настройте основной Nginx для проксирования (см. DEPLOY_EXISTING_SERVER.md)"
echo -e "3. Получите SSL сертификат: certbot certonly --nginx -d ${DOMAIN}"
echo -e "4. Перезапустите Nginx: systemctl reload nginx"
echo ""
echo -e "${YELLOW}📝 Для просмотра логов: docker-compose logs -f${NC}"
echo -e "${YELLOW}📝 Для остановки: docker-compose down${NC}"

