# Настройка Webhook для Klyro Bot

## Что это даёт?

После настройки webhook бот будет автоматически отвечать на команду `/start` сообщением с кнопкой "ОТКРЫТЬ", и эта кнопка будет видна в списке чатов.

## Вариант 1: Использование ngrok (для локального тестирования)

### Шаг 1: Установите ngrok

```bash
brew install ngrok
# или скачайте с https://ngrok.com/
```

### Шаг 2: Запустите сервер

```bash
cd /Users/kobra/PycharmProjects/klyro_app
pip3 install -r requirements.txt
python3 bot_server.py
```

Сервер запустится на `http://localhost:5000`

### Шаг 3: Запустите ngrok

В новом терминале:

```bash
ngrok http 5000
```

Скопируйте HTTPS URL (например: `https://abc123.ngrok.io`)

### Шаг 4: Установите webhook

Откройте в браузере:
```
https://abc123.ngrok.io/set_webhook?url=https://abc123.ngrok.io/webhook
```

Или через curl:
```bash
curl "https://abc123.ngrok.io/set_webhook?url=https://abc123.ngrok.io/webhook"
```

## Вариант 2: Деплой на бесплатный хостинг (рекомендуется)

### Railway (бесплатно, простой)

1. Зайдите на [railway.app](https://railway.app)
2. Создайте новый проект
3. Подключите GitHub репозиторий
4. Railway автоматически определит Python и установит зависимости
5. Добавьте переменную окружения `BOT_TOKEN` с токеном бота
6. Railway даст вам URL (например: `https://klyro-bot.railway.app`)
7. Установите webhook:
   ```
   https://klyro-bot.railway.app/set_webhook?url=https://klyro-bot.railway.app/webhook
   ```

### Render (бесплатно)

1. Зайдите на [render.com](https://render.com)
2. Создайте новый Web Service
3. Подключите GitHub репозиторий
4. Настройки:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn bot_server:app`
5. Добавьте переменную окружения `BOT_TOKEN`
6. После деплоя получите URL и установите webhook

### Heroku (бесплатный план отменён, но можно использовать)

1. Установите Heroku CLI
2. Войдите: `heroku login`
3. Создайте приложение: `heroku create klyro-bot`
4. Добавьте переменную: `heroku config:set BOT_TOKEN=ваш_токен`
5. Деплой: `git push heroku main`
6. Установите webhook

## Вариант 3: Glitch (самый простой)

1. Зайдите на [glitch.com](https://glitch.com)
2. Создайте новый проект "Hello Flask"
3. Замените содержимое на файлы из проекта
4. Добавьте переменную `BOT_TOKEN` в .env
5. Glitch даст вам URL автоматически
6. Установите webhook

## После настройки webhook:

1. Отправьте `/start` боту
2. Бот автоматически ответит сообщением с кнопкой "ОТКРЫТЬ"
3. Кнопка будет видна в списке чатов!

## Проверка webhook:

```bash
curl "https://api.telegram.org/botYOUR_BOT_TOKEN_HERE/getWebhookInfo"
```

## Удаление webhook (если нужно):

```bash
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN_HERE/deleteWebhook"
```

