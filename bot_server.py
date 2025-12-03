#!/usr/bin/env python3
"""
Простой Flask сервер для раздачи статических файлов Telegram Web App
"""
from flask import Flask, send_from_directory, send_file
import os

app = Flask(__name__, static_folder='.', static_url_path='')

# Корневой маршрут - отдаем index.html
@app.route('/')
def index():
    return send_file('index.html')

# Маршруты для статических файлов
@app.route('/<path:path>')
def serve_static(path):
    # Проверяем, что файл существует
    if os.path.exists(path) and os.path.isfile(path):
        return send_from_directory('.', path)
    else:
        # Если файл не найден, возвращаем index.html (для SPA)
        return send_file('index.html')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)

