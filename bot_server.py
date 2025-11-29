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
BOT_TOKEN = os.environ.get('BOT_TOKEN', '8515314140:AAHdCnEUIxYRoJqRRA9k5byj2wbXMj79C_Y')
WEB_APP_URL = os.environ.get('WEB_APP_URL', 'https://kobravania.github.io/klyro_app/')
WEBHOOK_SECRET = os.environ.get('WEBHOOK_SECRET', '')

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
    return jsonify({
        'status': 'ok',
        'bot': 'Klyro Bot',
        'message': 'Server is running'
    })

@app.route('/webhook', methods=['POST', 'GET'])
def webhook():
    """Обработка webhook от Telegram"""
    # Обработка GET запросов (для проверки)
    if request.method == 'GET':
        return jsonify({'status': 'ok', 'message': 'Webhook is ready'}), 200
    
    # Проверка заголовков от Telegram
    if not request.is_json:
        return jsonify({'ok': True}), 200
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'ok': True}), 200
        
        # Проверяем, что это сообщение
        if 'message' in data:
            message = data['message']
            chat_id = message['chat']['id']
            text = message.get('text', '')
            
            # Обработка команды /start
            if text == '/start' or text.startswith('/start'):
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
                
                # Очень короткое сообщение - как у Crypto Bot и BotFather
                # Это важно для отображения кнопки в списке чатов
                # БЕЗ parse_mode - это критично для отображения кнопки в списке чатов!
                welcome_text = 'Klyro'
                
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
        print(f'Error: {e}')
        return jsonify({'ok': False, 'error': str(e)}), 500

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

