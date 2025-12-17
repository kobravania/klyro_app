#!/usr/bin/env python3
"""
Flask сервер для раздачи статических файлов Telegram Web App
+ API для хранения профилей пользователей в PostgreSQL
"""
from flask import Flask, send_from_directory, send_file, Response, request, jsonify
from flask_cors import CORS
import os
import sys
import json
import psycopg2
from psycopg2 import errors as psycopg2_errors
from psycopg2.extras import RealDictCursor
from datetime import datetime
import hashlib
import hmac
import urllib.parse

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)  # Разрешаем CORS для API запросов

# Хранилище логов (в памяти, для простоты)
logs_storage = []

# Подключение к PostgreSQL
def get_db_connection():
    """Получить подключение к базе данных"""
    # Проверяем обязательные переменные окружения
    required_vars = ['POSTGRES_HOST', 'POSTGRES_DB', 'POSTGRES_USER', 'POSTGRES_PASSWORD']
    missing_vars = [var for var in required_vars if not os.environ.get(var)]
    if missing_vars:
        print(f"КРИТИЧЕСКАЯ ОШИБКА: Отсутствуют переменные окружения: {', '.join(missing_vars)}")
        sys.exit(1)
    
    try:
        conn = psycopg2.connect(
            host=os.environ.get('POSTGRES_HOST'),
            port=os.environ.get('POSTGRES_PORT', '5432'),
            database=os.environ.get('POSTGRES_DB'),
            user=os.environ.get('POSTGRES_USER'),
            password=os.environ.get('POSTGRES_PASSWORD')
        )
        return conn
    except Exception as e:
        print(f"КРИТИЧЕСКАЯ ОШИБКА: Не удалось подключиться к БД: {e}")
        sys.exit(1)

def init_db():
    """Инициализировать таблицу profiles. FAIL-FAST: выходит если не удалось."""
    conn = get_db_connection()
    
    try:
        cur = conn.cursor()
        # Используем IF NOT EXISTS для атомарной проверки и создания
        # Это предотвращает гонки условий при параллельной инициализации worker'ов
        cur.execute("""
            CREATE TABLE IF NOT EXISTS profiles (
                telegram_user_id TEXT PRIMARY KEY,
                birth_date DATE NOT NULL,
                gender TEXT CHECK (gender IN ('male','female')) NOT NULL,
                height_cm INTEGER NOT NULL,
                weight_kg INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT now(),
                updated_at TIMESTAMP DEFAULT now()
            )
        """)
        conn.commit()
        print("✓ Таблица profiles инициализирована")
        cur.close()
    except Exception as e:
        conn.rollback()
        print(f"КРИТИЧЕСКАЯ ОШИБКА: Не удалось создать таблицу: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        conn.close()

def validate_telegram_init_data(init_data, bot_token):
    """
    Валидация Telegram WebApp initData
    Проверяет подпись данных от Telegram
    """
    try:
        # Парсим init_data
        parsed_data = urllib.parse.parse_qs(init_data)
        
        # Извлекаем hash и остальные данные
        received_hash = parsed_data.get('hash', [None])[0]
        if not received_hash:
            return False, None
        
        # Создаем строку для проверки
        data_check_string = []
        for key in sorted(parsed_data.keys()):
            if key != 'hash':
                data_check_string.append(f"{key}={parsed_data[key][0]}")
        data_check_string = '\n'.join(data_check_string)
        
        # Вычисляем секретный ключ
        secret_key = hmac.new(
            b"WebAppData",
            bot_token.encode(),
            hashlib.sha256
        ).digest()
        
        # Вычисляем hash
        calculated_hash = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256
        ).hexdigest()
        
        # Сравниваем
        if calculated_hash != received_hash:
            return False, None
        
        # Извлекаем user_id
        user_str = parsed_data.get('user', [None])[0]
        if user_str:
            user_data = json.loads(user_str)
            telegram_user_id = user_data.get('id')
            return True, telegram_user_id
        
        return False, None
    except Exception as e:
        print(f"Ошибка валидации initData: {e}")
        return False, None

# Инициализация БД теперь выполняется через gunicorn hook (gunicorn_config.py)
# Это предотвращает гонки условий при параллельной инициализации worker'ов

def add_no_cache_headers(response):
    """Добавляет заголовки для предотвращения кэширования"""
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

# Health check
@app.route('/health')
def health():
    return {'status': 'ok'}, 200

# ============================================
# API ДЛЯ ПРОФИЛЯ ПОЛЬЗОВАТЕЛЯ
# Источник истины = PostgreSQL
# ============================================

@app.route('/api/profile', methods=['GET'])
def get_profile():
    """
    Получить профиль пользователя
    Требует: telegram_user_id в query параметрах
    Возвращает: 200 + profile JSON если есть, 404 если нет
    """
    try:
        telegram_user_id = request.args.get('telegram_user_id')
        if not telegram_user_id:
            return {'error': 'Service unavailable'}, 500
        
        # Загружаем профиль из БД
        conn = get_db_connection()
        
        try:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute("""
                SELECT telegram_user_id, birth_date, gender, height_cm, weight_kg, 
                       created_at, updated_at
                FROM profiles
                WHERE telegram_user_id = %s
            """, (str(telegram_user_id),))
            
            row = cur.fetchone()
            cur.close()
            
            if row:
                # Преобразуем в JSON-совместимый формат
                profile = {
                    'telegram_user_id': row['telegram_user_id'],
                    'birth_date': row['birth_date'].isoformat() if row['birth_date'] else None,
                    'gender': row['gender'],
                    'height_cm': int(row['height_cm']),
                    'weight_kg': int(row['weight_kg'])
                }
                return jsonify(profile), 200
            else:
                return {'error': 'Profile not found'}, 404
        finally:
            conn.close()
            
    except Exception as e:
        print(f"Ошибка при получении профиля: {e}")
        import traceback
        traceback.print_exc()
        return {'error': 'Service unavailable'}, 500

@app.route('/api/profile', methods=['POST'])
def save_profile():
    """
    Сохранить или обновить профиль пользователя (upsert, idempotent)
    Требует: telegram_user_id и profile данные в JSON body
    Возвращает: 200 если данные сохранены (даже если частично)
    Backend игнорирует лишние поля, принимает только нужные
    """
    try:
        data = request.json
        if not data:
            return {'error': 'Service unavailable'}, 500
        
        telegram_user_id = data.get('telegram_user_id')
        if not telegram_user_id:
            return {'error': 'Service unavailable'}, 500
        
        # Извлекаем данные профиля (игнорируем лишние поля)
        birth_date = data.get('birth_date') or data.get('dateOfBirth')
        gender = data.get('gender')
        height_cm = data.get('height_cm') or data.get('height')
        weight_kg = data.get('weight_kg') or data.get('weight')
        
        # Минимальная валидация - только проверяем наличие обязательных полей
        if not birth_date or not gender or not height_cm or not weight_kg:
            return {'error': 'Service unavailable'}, 500
        
        # Нормализация gender
        gender = str(gender).lower().strip()
        if gender not in ('male', 'female'):
            return {'error': 'Service unavailable'}, 500
        
        # Преобразование типов
        try:
            height_cm = int(height_cm)
            weight_kg = int(weight_kg)
        except (ValueError, TypeError):
            return {'error': 'Service unavailable'}, 500
        
        # Сохраняем в БД (idempotent - всегда успешно, если данные валидны)
        conn = get_db_connection()
        
        try:
            cur = conn.cursor()
            # Используем INSERT ... ON CONFLICT для upsert
            cur.execute("""
                INSERT INTO profiles (
                    telegram_user_id, birth_date, gender, height_cm, weight_kg, updated_at
                ) VALUES (%s, %s, %s, %s, %s, now())
                ON CONFLICT (telegram_user_id) 
                DO UPDATE SET
                    birth_date = EXCLUDED.birth_date,
                    gender = EXCLUDED.gender,
                    height_cm = EXCLUDED.height_cm,
                    weight_kg = EXCLUDED.weight_kg,
                    updated_at = now()
            """, (
                str(telegram_user_id),
                birth_date,
                gender,
                height_cm,
                weight_kg
            ))
            
            conn.commit()
            cur.close()
            
            # Всегда возвращаем 200 если сохранение прошло успешно
            return {'status': 'ok'}, 200
        finally:
            conn.close()
            
    except Exception as e:
        print(f"Ошибка при сохранении профиля: {e}")
        import traceback
        traceback.print_exc()
        return {'error': 'Service unavailable'}, 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)

