#!/usr/bin/env python3
"""
Простой Flask сервер для раздачи статических файлов Telegram Web App
"""
from flask import Flask, send_from_directory, send_file, Response
import os

app = Flask(__name__, static_folder='.', static_url_path='')

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

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)

