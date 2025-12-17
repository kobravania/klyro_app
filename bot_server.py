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
                telegram_user_id BIGINT PRIMARY KEY,
                birth_date VARCHAR(10),
                age INTEGER,
                gender VARCHAR(10),
                height INTEGER,
                weight DECIMAL(5,2),
                activity VARCHAR(20),
                goal VARCHAR(20),
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    Требует: telegram_user_id в query параметрах или initData в headers
    """
    try:
        # Получаем telegram_user_id из query параметров
        telegram_user_id = request.args.get('telegram_user_id')
        
        # Если не передан напрямую, пробуем извлечь из initData (опционально, для валидации)
        if not telegram_user_id:
            init_data = request.headers.get('X-Telegram-Init-Data')
            if init_data:
                bot_token = os.environ.get('BOT_TOKEN', '')
                if bot_token:
                    is_valid, user_id = validate_telegram_init_data(init_data, bot_token)
                    if is_valid:
                        telegram_user_id = str(user_id)
        
        if not telegram_user_id:
            return {'error': 'Service unavailable'}, 500
        
        try:
            telegram_user_id = int(telegram_user_id)
        except (ValueError, TypeError):
            return {'error': 'Service unavailable'}, 500
        
        # Загружаем профиль из БД
        conn = get_db_connection()
        
        try:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute("""
                SELECT telegram_user_id, birth_date, age, gender, height, weight, 
                       activity, goal, updated_at, created_at
                FROM profiles
                WHERE telegram_user_id = %s
            """, (telegram_user_id,))
            
            row = cur.fetchone()
            cur.close()
            
            if row:
                # Преобразуем в JSON-совместимый формат
                profile = {
                    'dateOfBirth': row['birth_date'],
                    'age': row['age'],
                    'gender': row['gender'],
                    'height': int(row['height']) if row['height'] else None,
                    'weight': float(row['weight']) if row['weight'] else None,
                    'activity': row['activity'],
                    'goal': row['goal']
                }
                return jsonify(profile), 200
            else:
                return {'error': 'Profile not found'}, 404
        finally:
            conn.close()
            
    except ValueError as e:
        print(f"Ошибка валидации telegram_user_id: {e}")
        return {'error': 'Service unavailable'}, 500
    except Exception as e:
        print(f"Ошибка при получении профиля: {e}")
        import traceback
        traceback.print_exc()
        return {'error': 'Service unavailable'}, 500

@app.route('/api/profile', methods=['POST'])
def save_profile():
    """
    Сохранить или обновить профиль пользователя
    Требует: telegram_user_id и profile данные в JSON body
    """
    try:
        data = request.json
        if not data:
            return {'error': 'Service unavailable'}, 500
        
        # Получаем telegram_user_id из body
        telegram_user_id = data.get('telegram_user_id')
        
        # Если не передан, пробуем извлечь из initData (опционально, для валидации)
        if not telegram_user_id:
            init_data = request.headers.get('X-Telegram-Init-Data')
            if init_data:
                bot_token = os.environ.get('BOT_TOKEN', '')
                if bot_token:
                    is_valid, user_id = validate_telegram_init_data(init_data, bot_token)
                    if is_valid:
                        telegram_user_id = user_id
        
        if not telegram_user_id:
            return {'error': 'telegram_user_id required'}, 400
        
        telegram_user_id = int(telegram_user_id)
        
        # Извлекаем данные профиля
        profile_data = {
            'birth_date': data.get('dateOfBirth') or data.get('birthDate'),
            'age': data.get('age'),
            'gender': data.get('gender'),
            'height': data.get('height'),
            'weight': data.get('weight'),
            'activity': data.get('activity'),
            'goal': data.get('goal')
        }
        
        # Сохраняем в БД
        conn = get_db_connection()
        
        try:
            cur = conn.cursor()
            # Используем INSERT ... ON CONFLICT для upsert
            cur.execute("""
                INSERT INTO profiles (
                    telegram_user_id, birth_date, age, gender, height, weight, activity, goal, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (telegram_user_id) 
                DO UPDATE SET
                    birth_date = EXCLUDED.birth_date,
                    age = EXCLUDED.age,
                    gender = EXCLUDED.gender,
                    height = EXCLUDED.height,
                    weight = EXCLUDED.weight,
                    activity = EXCLUDED.activity,
                    goal = EXCLUDED.goal,
                    updated_at = CURRENT_TIMESTAMP
            """, (
                telegram_user_id,
                profile_data['birth_date'],
                profile_data['age'],
                profile_data['gender'],
                profile_data['height'],
                profile_data['weight'],
                profile_data['activity'],
                profile_data['goal']
            ))
            
            conn.commit()
            cur.close()
            
            return {'status': 'ok', 'telegram_user_id': telegram_user_id}, 200
        finally:
            conn.close()
            
    except ValueError as e:
        print(f"Ошибка валидации telegram_user_id: {e}")
        return {'error': 'Service unavailable'}, 500
    except Exception as e:
        # Логируем для сервера, но не возвращаем технические детали клиенту
        print(f"Ошибка при сохранении профиля: {e}")
        import traceback
        traceback.print_exc()
        return {'error': 'Service unavailable'}, 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)

