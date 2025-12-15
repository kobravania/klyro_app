# 🚀 Деплой Klyro на сервер с существующим проектом

## 📋 Ситуация

На вашем сервере уже работает **crypto assist bot** на портах 80/443.  
Klyro будет работать на **поддомене** (например, `klyro.yourdomain.com`) через порты 8080/8443.

## ✅ Что будет настроено:

- ✅ Klyro на портах **8080** (HTTP) и **8443** (HTTPS)
- ✅ Отдельная база данных PostgreSQL на порту **5433**
- ✅ Отдельные Docker контейнеры с префиксом `klyro_`
- ✅ Отдельные volumes для данных
- ✅ Основной Nginx на сервере будет проксировать поддомен на Klyro

## 🏗️ Архитектура

```
Основной домен (example.com)
    └──> crypto assist bot (порты 80/443)

Поддомен (klyro.example.com)
    └──> Основной Nginx на сервере
         └──> Klyro контейнеры (порты 8080/8443)
```

## 📦 Шаг 1: Подключитесь к серверу

```bash
ssh root@69.67.173.216
```

## 📦 Шаг 2: Установите Klyro

```bash
# Создайте отдельную директорию для Klyro
cd /opt
git clone https://github.com/kobravania/klyro_app.git klyro
cd klyro

# Запустите установку
chmod +x deploy/setup.sh
sudo ./deploy/setup.sh
```

**Важно:** Скрипт автоматически использует порты 8080/8443, чтобы не конфликтовать с существующим проектом.

## 📦 Шаг 3: Настройте .env файл

Когда скрипт попросит, отредактируйте `.env`:

```bash
nano .env
```

Установите:
- `DOMAIN=klyro.yourdomain.com` (поддомен!)
- `SSL_EMAIL=your-email@example.com`
- `POSTGRES_PASSWORD=strong_password`
- `BOT_TOKEN=your_telegram_bot_token`

## 📦 Шаг 4: Настройте основной Nginx на сервере

После того, как Klyro запустится, нужно настроить основной Nginx для проксирования поддомена.

### 4.1 Найдите конфигурацию основного Nginx

```bash
# Обычно конфигурация находится здесь:
ls -la /etc/nginx/sites-available/
ls -la /etc/nginx/conf.d/
```

### 4.2 Создайте конфигурацию для поддомена

```bash
nano /etc/nginx/sites-available/klyro
```

Добавьте:

```nginx
# HTTP - редирект на HTTPS
server {
    listen 80;
    server_name klyro.yourdomain.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS - проксирование на Klyro
server {
    listen 443 ssl http2;
    server_name klyro.yourdomain.com;

    # SSL сертификаты (получите через certbot)
    ssl_certificate /etc/letsencrypt/live/klyro.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/klyro.yourdomain.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Проксирование на Klyro контейнер
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # API endpoints
    location /api/ {
        proxy_pass http://localhost:8080/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 4.3 Активируйте конфигурацию

```bash
# Если используете sites-available/sites-enabled
ln -s /etc/nginx/sites-available/klyro /etc/nginx/sites-enabled/

# Или если используете conf.d, просто скопируйте файл
# cp /etc/nginx/sites-available/klyro /etc/nginx/conf.d/klyro.conf
```

### 4.4 Получите SSL сертификат для поддомена

```bash
certbot --nginx -d klyro.yourdomain.com
```

### 4.5 Проверьте и перезапустите Nginx

```bash
nginx -t
systemctl restart nginx
```

## 📦 Шаг 5: Настройте DNS

Добавьте A-запись для поддомена:

```
Тип: A
Имя: klyro
Значение: 69.67.173.216
TTL: 3600
```

## ✅ Проверка

1. **Проверьте контейнеры Klyro:**
```bash
cd /opt/klyro
docker-compose ps
```

2. **Проверьте, что порты не конфликтуют:**
```bash
netstat -tulpn | grep -E ':(80|443|8080|8443|5432|5433)'
```

Должны быть:
- `:80` - основной Nginx (crypto assist bot)
- `:443` - основной Nginx (crypto assist bot)
- `:8080` - Klyro frontend
- `:8443` - Klyro frontend (HTTPS)
- `:5433` - Klyro PostgreSQL (если открыт)

3. **Проверьте в браузере:**
   - Основной проект: `https://yourdomain.com`
   - Klyro: `https://klyro.yourdomain.com`

## 🔍 Управление

### Просмотр логов Klyro:
```bash
cd /opt/klyro
docker-compose logs -f
```

### Остановка/запуск Klyro:
```bash
cd /opt/klyro
docker-compose stop
docker-compose start
docker-compose restart
```

### Обновление Klyro:
```bash
cd /opt/klyro
./deploy/update.sh
```

## ⚠️ Важно

- ✅ Klyro использует **отдельные порты** (8080/8443)
- ✅ Klyro использует **отдельную БД** на порту 5433
- ✅ Klyro использует **отдельные контейнеры** с префиксом `klyro_`
- ✅ Основной проект **не затронут**
- ✅ Оба проекта работают **независимо**

## 🐛 Решение проблем

### Проблема: Порт 8080 занят

Измените порт в `docker-compose.yml`:
```yaml
ports:
  - "8081:80"  # Вместо 8080
  - "8444:443" # Вместо 8443
```

И обновите конфигурацию Nginx соответственно.

### Проблема: Конфликт с существующей БД

Klyro использует порт 5433, основной проект - 5432. Они не конфликтуют.

### Проблема: SSL сертификат не получен

Убедитесь, что:
1. DNS запись для поддомена создана
2. Поддомен указывает на IP сервера
3. Порт 80 открыт для Let's Encrypt

---

**Готово! Оба проекта работают на одном сервере без конфликтов! 🎉**
