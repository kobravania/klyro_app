#!/usr/bin/env python3
"""
Простой Flask сервер для раздачи статических файлов Telegram Web App
"""
from flask import Flask, send_from_directory, send_file, Response, request, jsonify
import os
import json
from datetime import datetime

app = Flask(__name__, static_folder='.', static_url_path='')

# Хранилище логов (в памяти, для простоты)
logs_storage = []

def add_no_cache_headers(response):
    """Добавляет заголовки для предотвращения кэширования"""
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

# Корневой маршрут - отдаем index.html
@app.route('/')
def index():
    response = send_file('index.html')
    return add_no_cache_headers(response)

# Маршруты для статических файлов
@app.route('/<path:path>')
def serve_static(path):
    # Проверяем, что файл существует
    if os.path.exists(path) and os.path.isfile(path):
        response = send_from_directory('.', path)
        # Для HTML/JS/CSS добавляем заголовки no-cache
        if path.endswith(('.html', '.js', '.css')):
            response = add_no_cache_headers(response)
        return response
    else:
        # Если файл не найден, возвращаем index.html (для SPA)
        response = send_file('index.html')
        return add_no_cache_headers(response)

# Health check для Railway
@app.route('/health')
def health():
    return {'status': 'ok'}, 200

# Endpoint для получения логов
@app.route('/api/logs', methods=['GET'])
def get_logs():
    return jsonify(logs_storage[-100:]), 200  # Последние 100 логов

# Endpoint для отправки логов
@app.route('/api/log', methods=['POST'])
def add_log():
    try:
        data = request.json
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'level': data.get('level', 'info'),
            'message': data.get('message', ''),
            'error': data.get('error'),
            'context': data.get('context', {})
        }
        logs_storage.append(log_entry)
        # Храним только последние 1000 логов
        if len(logs_storage) > 1000:
            logs_storage.pop(0)
        return {'status': 'ok'}, 200
    except Exception as e:
        return {'error': str(e)}, 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)

