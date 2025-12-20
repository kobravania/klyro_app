# Деплой Klyro

## Вариант 1: Автоматический деплой с локальной машины

```bash
export SERVER_HOST=your_server_ip
export SERVER_USER=root
./deploy.sh
```

## Вариант 2: Деплой прямо на сервере

1. Подключитесь к серверу:
```bash
ssh root@your_server_ip
```

2. Запустите скрипт:
```bash
cd /opt/klyro
bash <(curl -s https://raw.githubusercontent.com/kobravania/klyro_app/main/deploy-server.sh)
```

Или вручную:
```bash
cd /opt/klyro
git clone https://github.com/kobravania/klyro_app.git .
# или если уже есть: git pull origin main

# Создайте .env файл
cat > .env << EOL
BOT_TOKEN=your_telegram_bot_token
SECRET_KEY=$(openssl rand -hex 32)
POSTGRES_PASSWORD=$(openssl rand -hex 16)
DEBUG=False
EOL

# Запустите
docker-compose up -d --build
```

## Проверка

```bash
# Статус контейнеров
docker-compose ps

# Логи
docker-compose logs -f

# Логи только backend
docker-compose logs -f backend

# Логи только frontend
docker-compose logs -f frontend
```

## Обновление

```bash
cd /opt/klyro
git pull origin main
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Переменные окружения

Создайте `.env` файл в корне проекта:

```
BOT_TOKEN=your_telegram_bot_token
SECRET_KEY=your_secret_key
POSTGRES_PASSWORD=your_password
DEBUG=False
```

## Порты

- Backend: 8000
- Frontend: 3000
- PostgreSQL: 5432 (внутренний)

## Troubleshooting

### Контейнеры не запускаются
```bash
docker-compose logs
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Ошибка миграций
```bash
docker-compose exec backend python manage.py migrate
```

### Очистка и пересборка
```bash
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

