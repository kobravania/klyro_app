# Исправление Webhook для команды /start

## Проблема
Ngrok бесплатный туннель нестабилен и часто отключается. Это приводит к тому, что webhook не работает и команда /start не обрабатывается автоматически.

## Решение 1: Использовать постоянный хостинг (рекомендуется)

### Railway (бесплатно, простой)

1. Зайдите на [railway.app](https://railway.app)
2. Создайте новый проект
3. Подключите GitHub репозиторий `kobravania/klyro_app`
4. Railway автоматически определит Python
5. Добавьте переменную окружения:
   - `BOT_TOKEN` = `8515314140:AAHdCnEUIxYRoJqRRA9k5byj2wbXMj79C_Y`
6. Railway даст вам постоянный URL (например: `https://klyro-bot.railway.app`)
7. Установите webhook:
   ```bash
   curl "https://klyro-bot.railway.app/set_webhook?url=https://klyro-bot.railway.app/webhook"
   ```
8. Обновите webhook в Telegram:
   ```bash
   curl "https://api.telegram.org/bot8515314140:AAHdCnEUIxYRoJqRRA9k5byj2wbXMj79C_Y/setWebhook?url=https://klyro-bot.railway.app/webhook"
   ```

### Render (бесплатно)

Аналогично Railway, но на [render.com](https://render.com)

## Решение 2: Временное - перезапустить ngrok вручную

Если нужно быстро проверить:

```bash
# Остановить старый ngrok
pkill -f ngrok

# Запустить новый
ngrok http 5002

# Скопировать HTTPS URL из вывода
# Обновить webhook:
curl "https://api.telegram.org/bot8515314140:AAHdCnEUIxYRoJqRRA9k5byj2wbXMj79C_Y/setWebhook?url=ВАШ_NGROK_URL/webhook"
```

## Проверка работы

После настройки отправьте `/start` боту - он должен автоматически ответить с кнопкой "ОТКРЫТЬ".

Кнопка "ОТКРЫТЬ" появится в списке чатов автоматически, когда бот отправит сообщение с inline keyboard.

