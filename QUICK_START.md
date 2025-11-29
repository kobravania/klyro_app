# Быстрый старт Webhook для Klyro Bot

## Самый простой способ (ngrok):

### 1. Запустите скрипт:

```bash
cd /Users/kobra/PycharmProjects/klyro_app
./start_webhook.sh
```

Скрипт автоматически:
- Запустит сервер
- Запустит ngrok
- Установит webhook

### 2. После запуска:

Отправьте `/start` боту в Telegram - он автоматически ответит с кнопкой "ОТКРЫТЬ"!

---

## Ручная настройка:

### Шаг 1: Запустите сервер

```bash
cd /Users/kobra/PycharmProjects/klyro_app
python3 bot_server.py
```

Сервер запустится на `http://localhost:5000`

### Шаг 2: В новом терминале запустите ngrok

```bash
ngrok http 5000
```

Скопируйте HTTPS URL (например: `https://abc123.ngrok.io`)

### Шаг 3: Установите webhook

Откройте в браузере:
```
https://abc123.ngrok.io/set_webhook?url=https://abc123.ngrok.io/webhook
```

Или через curl:
```bash
curl "https://abc123.ngrok.io/set_webhook?url=https://abc123.ngrok.io/webhook"
```

### Шаг 4: Готово!

Отправьте `/start` боту - он автоматически ответит!

---

## Постоянное решение (деплой на хостинг):

Для постоянной работы лучше задеплоить на бесплатный хостинг:

1. **Railway** (рекомендуется): https://railway.app
2. **Render**: https://render.com  
3. **Glitch**: https://glitch.com

Подробная инструкция в файле `WEBHOOK_SETUP.md`

---

## Проверка webhook:

```bash
curl "https://api.telegram.org/botYOUR_BOT_TOKEN_HERE/getWebhookInfo"
```

## Остановка:

Если запустили через скрипт, нажмите `Ctrl+C`

Или найдите процессы:
```bash
ps aux | grep bot_server
ps aux | grep ngrok
kill <PID>
```

