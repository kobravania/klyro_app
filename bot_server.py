#!/usr/bin/env python3
"""
Простой сервер для обработки команд Telegram бота Klyro
Автоматически отвечает на /start сообщением с кнопкой Web App
"""

from flask import Flask, request, jsonify
import requests
import os

app = Flask(__name__)

# Конфигурация
BOT_TOKEN = os.environ.get('BOT_TOKEN', '')  # ⚠️ НЕ ХРАНИТЕ ТОКЕН В КОДЕ! Используйте переменные окружения

# Проверка токена при запуске
if not BOT_TOKEN:
    print('[ERROR] BOT_TOKEN environment variable is not set!')
    print('[ERROR] Please set BOT_TOKEN in Railway variables')
else:
    print(f'[INFO] BOT_TOKEN loaded (first 10 chars: {BOT_TOKEN[:10]}...)')
WEB_APP_URL = os.environ.get('WEB_APP_URL', 'https://kobravania.github.io/klyro_app/')
WEBHOOK_SECRET = os.environ.get('WEBHOOK_SECRET', '')

# Функция для проверки конфигурации при первом запросе
def check_config():
    """Проверяет конфигурацию и логирует статус"""
    if not BOT_TOKEN:
        print('[ERROR] BOT_TOKEN environment variable is not set!')
        print('[ERROR] Please set BOT_TOKEN in Railway variables')
        return False
    else:
        print(f'[INFO] BOT_TOKEN loaded (first 10 chars: {BOT_TOKEN[:10]}...)')
        print(f'[INFO] WEB_APP_URL: {WEB_APP_URL}')
        return True

def send_message(chat_id, text, reply_markup=None, parse_mode=None):
    """Отправляет сообщение пользователю"""
    url = f'https://api.telegram.org/bot{BOT_TOKEN}/sendMessage'
    data = {
        'chat_id': chat_id,
        'text': text
    }
    # Добавляем parse_mode только если нужен (для HTML форматирования)
    if parse_mode:
        data['parse_mode'] = parse_mode
    if reply_markup:
        data['reply_markup'] = reply_markup
    
    try:
        response = requests.post(url, json=data, timeout=5)
        result = response.json()
        if not result.get('ok'):
            print(f'[ERROR] Failed to send message: {result}')
        return result
    except Exception as e:
        print(f'[ERROR] Exception sending message: {e}')
        return {'ok': False, 'error': str(e)}

@app.route('/', methods=['GET'])
def index():
    """Главная страница - проверка работы сервера"""
    # Проверяем конфигурацию при первом запросе
    check_config()
    return jsonify({
        'status': 'ok',
        'bot': 'Klyro Bot',
        'message': 'Server is running',
        'token_set': bool(BOT_TOKEN)
    }), 200

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint для Railway"""
    print('[HEALTH] Health check requested')
    return jsonify({
        'status': 'healthy',
        'bot': 'Klyro Bot',
        'token_set': bool(BOT_TOKEN)
    }), 200

@app.route('/ping', methods=['GET'])
def ping():
    """Простой ping endpoint для keep-alive"""
    return jsonify({'status': 'pong'}), 200

@app.route('/webhook', methods=['POST', 'GET'])
def webhook():
    """Обработка webhook от Telegram"""
    # Проверяем конфигурацию при первом запросе
    if not hasattr(webhook, '_config_checked'):
        check_config()
        webhook._config_checked = True
    
    # Обработка GET запросов (для проверки)
    if request.method == 'GET':
        return jsonify({'status': 'ok', 'message': 'Webhook is ready', 'token_set': bool(BOT_TOKEN)}), 200
    
    # Логируем входящий запрос
    print(f'[WEBHOOK] Received {request.method} request')
    print(f'[WEBHOOK] Headers: {dict(request.headers)}')
    print(f'[WEBHOOK] Content-Type: {request.content_type}')
    
    # Проверка заголовков от Telegram
    if not request.is_json:
        print('[WEBHOOK] Request is not JSON, returning OK')
        return jsonify({'ok': True}), 200
    
    try:
        data = request.get_json()
        print(f'[WEBHOOK] Received data: {data}')
        if not data:
            print('[WEBHOOK] Empty data, returning OK')
            return jsonify({'ok': True}), 200
        
        # Проверяем, что это сообщение
        if 'message' in data:
            message = data['message']
            chat_id = message['chat']['id']
            text = message.get('text', '')
            
            # Обработка команды /start
            if text == '/start' or text.startswith('/start'):
                print(f'[WEBHOOK] Processing /start command from chat {chat_id}')
                print(f'[WEBHOOK] BOT_TOKEN first 10 chars: {BOT_TOKEN[:10] if BOT_TOKEN else "EMPTY"}...')
                
                keyboard = {
                    'inline_keyboard': [[
                        {
                            'text': 'ОТКРЫТЬ',
                            'web_app': {
                                'url': WEB_APP_URL
                            }
                        }
                    ]]
                }
                
                # Приветственное сообщение с описанием функций
                welcome_text = (
                    '👋 Добро пожаловать в Klyro!\n\n'
                    'Ваш персональный помощник по питанию и фитнесу.\n\n'
                    '📊 Рассчитывайте калории\n'
                    '🎯 Отслеживайте прогресс\n'
                    '💪 Достигайте целей\n\n'
                    'Нажмите кнопку ниже, чтобы начать:'
                )
                
                result = send_message(chat_id, welcome_text, keyboard, parse_mode=None)
                print(f'[WEBHOOK] Sent /start response to {chat_id}: {result}')
                
                # Убеждаемся, что сообщение отправлено успешно
                if result.get('ok'):
                    message_id = result.get("result", {}).get("message_id")
                    print(f'[WEBHOOK] ✅ Message sent successfully, message_id: {message_id}')
                else:
                    print(f'[WEBHOOK] ❌ Failed to send message: {result}')
                
                return jsonify({'ok': True})
            
            # Обработка других команд
            elif text == '/help':
                help_text = (
                    'ℹ️ <b>Помощь по Klyro</b>\n\n'
                    'Klyro помогает вам:\n'
                    '• Рассчитывать дневную норму калорий\n'
                    '• Отслеживать параметры тела\n'
                    '• Достигать целей по весу\n\n'
                    'Используйте /start для открытия приложения.'
                )
                send_message(chat_id, help_text, parse_mode='HTML')
                return jsonify({'ok': True})
        
        return jsonify({'ok': True})
    
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f'[WEBHOOK] ❌ ERROR: {e}')
        print(f'[WEBHOOK] Traceback: {error_trace}')
        # Всегда возвращаем 200 OK для Telegram, даже при ошибке
        # Иначе Telegram будет считать webhook нерабочим
        return jsonify({'ok': True}), 200

@app.route('/set_webhook', methods=['GET'])
def set_webhook():
    """Установка webhook (вызывается один раз)"""
    webhook_url = request.args.get('url')
    if not webhook_url:
        return jsonify({'error': 'URL parameter required'}), 400
    
    url = f'https://api.telegram.org/bot{BOT_TOKEN}/setWebhook'
    data = {
        'url': webhook_url,
        'allowed_updates': ['message']
    }
    
    response = requests.post(url, json=data)
    return jsonify(response.json())

@app.route('/log', methods=['POST'])
def log():
    """Приём логов от клиента для отладки"""
    try:
        data = request.get_json()
        print(f"[CLIENT LOG] {data.get('level', 'info').upper()}: {data.get('message', '')}")
        print(f"  User Agent: {data.get('userAgent', 'Unknown')}")
        print(f"  Telegram: {data.get('telegram', 'Unknown')}")
        print(f"  Time: {data.get('timestamp', 'Unknown')}")
        return jsonify({'ok': True})
    except Exception as e:
        print(f"Error processing log: {e}")
        return jsonify({'ok': False}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))  # Используем 5001 если 5000 занят
    try:
        app.run(host='0.0.0.0', port=port, debug=False)
    except OSError:
        # Если порт занят, пробуем другой
        app.run(host='0.0.0.0', port=5002, debug=False)

