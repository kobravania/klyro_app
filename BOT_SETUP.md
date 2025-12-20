# Настройка Telegram бота для Mini App

## ⚠️ ВАЖНО: Telegram требует HTTPS!

Telegram Mini App **НЕ РАБОТАЕТ** с HTTP. Обязательно нужен HTTPS.

## Решение: Настройка HTTPS через nginx

### Вариант 1: С доменом (рекомендуется)

1. **Настройте DNS:**
   - Создайте A-запись для вашего домена, указывающую на IP `69.67.173.216`
   - Например: `klyro.yourdomain.com` → `69.67.173.216`

2. **Получите SSL сертификат:**
   ```bash
   cd /opt/klyro
   git pull origin main
   chmod +x setup-ssl-letsencrypt.sh
   ./setup-ssl-letsencrypt.sh klyro.yourdomain.com your@email.com
   ```

3. **Запустите с nginx:**
   ```bash
   docker-compose up -d --build
   ```

4. **Настройте бота:**
   - URL: `https://klyro.yourdomain.com`

### Вариант 2: Без домена (для тестирования)

1. **Используйте самоподписанный сертификат:**
   ```bash
   cd /opt/klyro
   git pull origin main
   chmod +x setup-ssl.sh
   ./setup-ssl.sh
   docker-compose up -d --build
   ```

2. **⚠️ Проблема:** Telegram может не принять самоподписанный сертификат

### Вариант 3: Использовать бесплатный домен

Используйте сервисы типа:
- [sslip.io](https://sslip.io) - `69-67-173-216.sslip.io`
- [nip.io](https://nip.io) - `69.67.173.216.nip.io`

**Настройка:**
```bash
# Получите сертификат для sslip.io домена
./setup-ssl-letsencrypt.sh 69-67-173-216.sslip.io your@email.com
docker-compose up -d
```

**URL для бота:** `https://69-67-173-216.sslip.io`

## Настройка в @BotFather

1. Откройте [@BotFather](https://t.me/BotFather)
2. `/mybots` → выберите `@klyro_nutrition_bot`
3. **"Bot Settings"** → **"Menu Button"**
4. **"Edit Menu Button"**
5. Введите:
   - **Text:** `Открыть приложение`
   - **URL:** `https://your-domain.com` или `https://69-67-173-216.sslip.io`
6. Сохраните

## Проверка

После настройки:
```bash
# Проверьте HTTPS
curl https://your-domain.com

# Проверьте API
curl https://your-domain.com/api/health
```

## Структура после настройки

```
Internet → nginx (443) → frontend (3000)
                    ↓
                 backend (8000)
```

- **Порт 80** → редирект на 443
- **Порт 443** → nginx с SSL → проксирует на frontend/backend
- **Порт 3000** → только внутри Docker (не открыт наружу)
- **Порт 8000** → только внутри Docker (не открыт наружу)

## Troubleshooting

### Сертификат не работает
```bash
# Проверьте сертификат
openssl x509 -in nginx/ssl/cert.pem -text -noout

# Проверьте логи nginx
docker-compose logs nginx
```

### Telegram не принимает сертификат
- Используйте Let's Encrypt (не самоподписанный)
- Убедитесь, что домен правильно настроен
- Проверьте, что порт 443 открыт в firewall

### Порт 443 занят
```bash
# Проверьте, что занимает порт
sudo lsof -i :443
sudo netstat -tulpn | grep 443
```
