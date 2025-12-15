#!/bin/bash

set -e

echo "🚀 Начало установки Klyro на Bitlaunch..."

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

# Обновление системы
echo -e "${YELLOW}📦 Обновление системы...${NC}"
apt-get update
apt-get upgrade -y

# Установка необходимых пакетов
echo -e "${YELLOW}📦 Установка зависимостей...${NC}"
apt-get install -y \
    curl \
    git \
    ufw \
    certbot \
    python3-certbot-nginx

# Установка Docker
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

# Установка Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}🐳 Установка Docker Compose...${NC}"
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
else
    echo -e "${GREEN}✅ Docker Compose уже установлен${NC}"
fi

# Настройка firewall
echo -e "${YELLOW}🔥 Настройка firewall...${NC}"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Создание директории проекта
PROJECT_DIR="/opt/klyro"
echo -e "${YELLOW}📁 Создание директории проекта: ${PROJECT_DIR}...${NC}"
mkdir -p $PROJECT_DIR
cd $PROJECT_DIR

# Клонирование репозитория (если еще не склонирован)
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}📥 Клонирование репозитория...${NC}"
    read -p "Введите URL вашего GitHub репозитория: " REPO_URL
    git clone $REPO_URL .
else
    echo -e "${GREEN}✅ Репозиторий уже склонирован${NC}"
    git pull
fi

# Создание .env файлов из шаблонов
echo -e "${YELLOW}⚙️  Создание .env файлов...${NC}"

if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${YELLOW}📝 Отредактируйте .env файл перед продолжением!${NC}"
        echo -e "${YELLOW}Нажмите Enter после редактирования...${NC}"
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
if [ -z "$DOMAIN" ] || [ -z "$POSTGRES_PASSWORD" ] || [ -z "$SSL_EMAIL" ]; then
    echo -e "${RED}❌ Пожалуйста, установите DOMAIN, POSTGRES_PASSWORD и SSL_EMAIL в .env файле${NC}"
    exit 1
fi

# Создание директорий для certbot
mkdir -p nginx/certbot/conf
mkdir -p nginx/certbot/www

# Первоначальный запуск без HTTPS для получения сертификата
echo -e "${YELLOW}🔧 Запуск контейнеров для получения SSL сертификата...${NC}"
echo -e "${YELLOW}ℹ️  Используются порты 8080/8443, чтобы не конфликтовать с существующими проектами${NC}"
docker-compose up -d postgres backend frontend

# Ожидание запуска сервисов
echo -e "${YELLOW}⏳ Ожидание запуска сервисов (30 секунд)...${NC}"
sleep 30

# Получение SSL сертификата
echo -e "${YELLOW}🔒 Получение SSL сертификата...${NC}"
docker run --rm \
    -v $(pwd)/nginx/certbot/conf:/etc/letsencrypt \
    -v $(pwd)/nginx/certbot/www:/var/www/certbot \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $SSL_EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN \
    -d www.$DOMAIN || echo -e "${YELLOW}⚠️  Не удалось получить сертификат автоматически. Получите вручную после настройки DNS.${NC}"

# Перезапуск frontend с SSL
echo -e "${YELLOW}🔄 Перезапуск frontend с SSL...${NC}"
docker-compose restart frontend

# Запуск всех сервисов
echo -e "${YELLOW}🚀 Запуск всех сервисов...${NC}"
docker-compose up -d

# Ожидание полного запуска
echo -e "${YELLOW}⏳ Ожидание полного запуска (20 секунд)...${NC}"
sleep 20

# Проверка статуса
echo -e "${YELLOW}🔍 Проверка статуса сервисов...${NC}"
docker-compose ps

# Настройка автообновления сертификата (cron job)
echo -e "${YELLOW}🔄 Настройка автообновления SSL сертификата...${NC}"
(crontab -l 2>/dev/null; echo "0 3 * * * cd $PROJECT_DIR && docker run --rm -v \$(pwd)/nginx/certbot/conf:/etc/letsencrypt -v \$(pwd)/nginx/certbot/www:/var/www/certbot certbot/certbot renew && docker-compose restart frontend") | crontab -

# Настройка автоматического обновления кода из GitHub
echo -e "${YELLOW}🔄 Настройка автоматического обновления кода...${NC}"
if [ -f "$PROJECT_DIR/deploy/setup-auto-update.sh" ]; then
    bash "$PROJECT_DIR/deploy/setup-auto-update.sh"
else
    echo -e "${YELLOW}⚠️  Скрипт setup-auto-update.sh не найден, пропускаем${NC}"
fi

echo -e "${GREEN}✅ Установка завершена!${NC}"
echo -e "${GREEN}🌐 Приложение доступно по адресу: https://${DOMAIN}${NC}"
echo -e "${GREEN}🔄 Автообновление настроено - код будет обновляться каждые 2 минуты${NC}"
echo -e "${YELLOW}📝 Для просмотра логов: docker-compose logs -f${NC}"
echo -e "${YELLOW}📝 Для остановки: docker-compose down${NC}"
echo -e "${YELLOW}📝 Для перезапуска: docker-compose restart${NC}"

