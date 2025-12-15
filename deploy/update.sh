#!/bin/bash

set -e

echo "🔄 Обновление Klyro..."

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Определение директории проекта
PROJECT_DIR="/opt/klyro"
cd $PROJECT_DIR

# Проверка наличия .env
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Файл .env не найден!${NC}"
    exit 1
fi

# Загрузка переменных окружения
export $(cat .env | grep -v '^#' | xargs)

# Создание бэкапа базы данных перед обновлением
echo -e "${YELLOW}💾 Создание бэкапа базы данных...${NC}"
BACKUP_DIR="/opt/klyro/backups"
mkdir -p $BACKUP_DIR
BACKUP_FILE="$BACKUP_DIR/postgres_$(date +%Y%m%d_%H%M%S).sql"
docker-compose exec -T postgres pg_dump -U ${POSTGRES_USER:-klyro} ${POSTGRES_DB:-klyro} > $BACKUP_FILE
echo -e "${GREEN}✅ Бэкап создан: $BACKUP_FILE${NC}"

# Получение обновлений из Git
echo -e "${YELLOW}📥 Получение обновлений из Git...${NC}"
git fetch origin
git pull origin main

# Проверка изменений в docker-compose.yml
if git diff HEAD@{1} HEAD --name-only | grep -q "docker-compose.yml\|Dockerfile"; then
    echo -e "${YELLOW}🔨 Обнаружены изменения в Docker конфигурации, пересборка образов...${NC}"
    docker-compose build --no-cache
fi

# Пересборка измененных сервисов
echo -e "${YELLOW}🔨 Пересборка измененных сервисов...${NC}"
docker-compose build

# Применение миграций (если есть)
if docker-compose exec -T backend python manage.py migrate --check 2>/dev/null; then
    echo -e "${YELLOW}📊 Применение миграций базы данных...${NC}"
    docker-compose exec -T backend python manage.py migrate --noinput || echo -e "${YELLOW}⚠️  Миграции не требуются или не настроены${NC}"
fi

# Обновление SSL сертификата (если нужно)
echo -e "${YELLOW}🔒 Проверка SSL сертификата...${NC}"
docker run --rm \
    -v $(pwd)/nginx/certbot/conf:/etc/letsencrypt \
    -v $(pwd)/nginx/certbot/www:/var/www/certbot \
    certbot/certbot renew || echo -e "${YELLOW}⚠️  Обновление сертификата не требуется${NC}"

# Перезапуск сервисов
echo -e "${YELLOW}🔄 Перезапуск сервисов...${NC}"
docker-compose up -d

# Ожидание запуска
echo -e "${YELLOW}⏳ Ожидание запуска сервисов (15 секунд)...${NC}"
sleep 15

# Проверка статуса
echo -e "${YELLOW}🔍 Проверка статуса сервисов...${NC}"
docker-compose ps

# Проверка health checks
echo -e "${YELLOW}🏥 Проверка health checks...${NC}"
if curl -f https://${DOMAIN}/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend health check пройден${NC}"
else
    echo -e "${RED}❌ Backend health check не пройден${NC}"
fi

# Очистка старых образов (опционально)
echo -e "${YELLOW}🧹 Очистка неиспользуемых Docker образов...${NC}"
docker image prune -f

# Очистка старых бэкапов (оставляем последние 7)
echo -e "${YELLOW}🧹 Очистка старых бэкапов (оставляем последние 7)...${NC}"
cd $BACKUP_DIR
ls -t | tail -n +8 | xargs -r rm -f

echo -e "${GREEN}✅ Обновление завершено!${NC}"
echo -e "${YELLOW}📝 Для просмотра логов: docker-compose logs -f${NC}"

