#!/usr/bin/env python3
"""
Flask сервер для раздачи статических файлов Telegram Web App
+ API для хранения профилей пользователей в PostgreSQL
Wallet-like architecture: initData only, no sessions/cookies
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
from functools import lru_cache
from datetime import date as _date
import hmac
import hashlib
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
        # ВАЖНО: init_db может быть вызван конкурентно (gunicorn, рестарты).
        # Используем advisory lock, чтобы создание таблицы было строго одиночным.
        conn.autocommit = True
        cur = conn.cursor()

        # Глобальная блокировка на уровне БД (одна на весь кластер)
        cur.execute("SELECT pg_advisory_lock(hashtext('klyro_init_db_profiles_v1'))")
        try:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS public.profiles (
                    telegram_user_id TEXT PRIMARY KEY,
                    birth_date DATE NOT NULL,
                    gender TEXT CHECK (gender IN ('male','female')) NOT NULL,
                    height_cm INTEGER NOT NULL,
                    weight_kg INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT now(),
                    updated_at TIMESTAMP DEFAULT now()
                )
            """)
            # Детерминированная проверка схемы: таблица должна быть доступна
            cur.execute("SELECT to_regclass('public.profiles') AS reg")
            reg = cur.fetchone()[0]
            if reg is None:
                raise RuntimeError("Таблица public.profiles не создана/не видна")
        finally:
            cur.execute("SELECT pg_advisory_unlock(hashtext('klyro_init_db_profiles_v1'))")

        print("✓ Таблица profiles инициализирована")
        cur.close()
    except Exception as e:
        print(f"КРИТИЧЕСКАЯ ОШИБКА: Не удалось создать таблицу: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        conn.close()

def ensure_schema_ready(conn):
    """
    Fail-fast: если схема не готова (нет таблицы profiles) — сервер не должен работать.
    """
    try:
        cur = conn.cursor()
        cur.execute("SELECT to_regclass('public.profiles') AS reg")
        reg = cur.fetchone()[0]
        if reg is None:
            print("КРИТИЧЕСКАЯ ОШИБКА: схема БД не готова (нет таблицы public.profiles)")
            sys.exit(1)
        cur.close()
    except Exception as e:
        print(f"КРИТИЧЕСКАЯ ОШИБКА: не удалось проверить схему БД: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

@lru_cache(maxsize=1)
def _profiles_column_map():
    """
    Определяет реальные имена колонок в public.profiles.
    Мы НЕ меняем схему существующей БД; просто адаптируемся:
    - height_cm может называться height
    - weight_kg может называться weight
    """
    conn = get_db_connection()
    try:
        ensure_schema_ready(conn)
        cur = conn.cursor()
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'profiles'
        """)
        cols = {r[0] for r in cur.fetchall()}
        cur.close()

        cur = conn.cursor()
        cur.execute("""
            SELECT data_type
            FROM information_schema.columns
            WHERE table_schema='public' AND table_name='profiles' AND column_name='telegram_user_id'
        """)
        row = cur.fetchone()
        cur.close()
        if not row:
            print("КРИТИЧЕСКАЯ ОШИБКА: profiles.telegram_user_id колонка не найдена")
            sys.exit(1)
        telegram_user_id_type = row[0]  # e.g. 'bigint' or 'text'

        height_col = 'height_cm' if 'height_cm' in cols else ('height' if 'height' in cols else None)
        weight_col = 'weight_kg' if 'weight_kg' in cols else ('weight' if 'weight' in cols else None)

        if not height_col or not weight_col:
            # Fail-fast: без обязательных полей профиля работать нельзя
            print(f"КРИТИЧЕСКАЯ ОШИБКА: profiles не содержит необходимых колонок. Найдено: {sorted(cols)}")
            sys.exit(1)

        return {
            'telegram_user_id_type': telegram_user_id_type,
            'height': height_col,
            'weight': weight_col,
            'has_created_at': 'created_at' in cols,
            'has_updated_at': 'updated_at' in cols,
        }
    finally:
        conn.close()

def _normalize_telegram_user_id(raw_id, colmap):
    if colmap.get('telegram_user_id_type') == 'bigint':
        return int(str(raw_id))
    return str(raw_id)

def _row_to_profile(row):
    bd = row.get('birth_date')
    if isinstance(bd, (_date, datetime)):
        birth_date_out = bd.isoformat()
    elif bd is None:
        birth_date_out = None
    else:
        birth_date_out = str(bd)
    # IMPORTANT: client must not see telegram_user_id.
    return {
        'birth_date': birth_date_out,
        'gender': row['gender'],
        'height_cm': int(row['height_value']),
        'weight_kg': int(row['weight_value'])
    }

def _select_profile(conn, telegram_user_id, colmap):
    cur = conn.cursor(cursor_factory=RealDictCursor)
    select_cols = [
        "telegram_user_id",
        "birth_date",
        "gender",
        f"{colmap['height']} AS height_value",
        f"{colmap['weight']} AS weight_value",
    ]
    if colmap.get('has_created_at'):
        select_cols.append("created_at")
    if colmap.get('has_updated_at'):
        select_cols.append("updated_at")
    # IMPORTANT: we match by telegram_user_id as TEXT to be compatible with existing DBs
    # where the column might be BIGINT or TEXT. This avoids subtle type-mismatch issues.
    cur.execute(
        f"SELECT {', '.join(select_cols)} FROM public.profiles WHERE telegram_user_id::text = %s",
        (str(telegram_user_id),)
    )
    row = cur.fetchone()
    cur.close()
    return row

def _validate_init_data(init_data_str):
    """
    Wallet-like: валидирует Telegram initData через HMAC-SHA256.
    Возвращает telegram_user_id если валидация успешна, иначе None.
    """
    if not init_data_str:
        return None
    
    BOT_TOKEN = os.environ.get('BOT_TOKEN')
    if not BOT_TOKEN:
        print("КРИТИЧЕСКАЯ ОШИБКА: BOT_TOKEN не установлен для валидации initData")
        return None
    
    # Очистка BOT_TOKEN от пробелов и кавычек
    BOT_TOKEN = BOT_TOKEN.strip().strip('"').strip("'")
    if not BOT_TOKEN:
        print("КРИТИЧЕСКАЯ ОШИБКА: BOT_TOKEN пустой после очистки")
        return None
    
    try:
        # DEBUG: логируем входящий initData (первые 200 символов)
        print(f"[DEBUG] initData (первые 200 символов): {init_data_str[:200]}...")
        print(f"[DEBUG] BOT_TOKEN (первые/последние 10 символов): {BOT_TOKEN[:10]}...{BOT_TOKEN[-10:]}")
        
        # Парсим initData вручную, сохраняя оригинальные значения для валидации
        # initData приходит как URL-encoded query string
        pairs = init_data_str.split('&')
        params = {}
        hash_value = None
        
        for pair in pairs:
            if '=' not in pair:
                continue
            key, value = pair.split('=', 1)  # split только по первому =
            if key == 'hash':
                hash_value = value
            else:
                # Сохраняем оригинальное URL-encoded значение для валидации
                params[key] = value
        
        print(f"[DEBUG] Параметры в initData: {list(params.keys())}")
        print(f"[DEBUG] Hash из initData: {hash_value[:32] if hash_value else 'None'}...")
        
        if not hash_value:
            print("[DEBUG] Hash не найден в initData")
            return None
        
        # Формируем data_check_string: ключи сортируются, разделитель = \n
        # Используем оригинальные URL-encoded значения
        data_check_string = '\n'.join(
            f"{key}={params[key]}" 
            for key in sorted(params.keys())
        )
        
        print(f"[DEBUG] data_check_string (полная): {data_check_string}")
        print(f"[DEBUG] data_check_string bytes length: {len(data_check_string.encode('utf-8'))}")
        
        # Вычисляем секретный ключ: HMAC-SHA256("WebAppData", bot_token)
        secret_key = hmac.new(
            b"WebAppData",
            BOT_TOKEN.encode('utf-8'),
            hashlib.sha256
        ).digest()
        
        # Вычисляем ожидаемый hash: HMAC-SHA256(secret_key, data_check_string)
        expected_hash = hmac.new(
            secret_key,
            data_check_string.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        print(f"[DEBUG] Ожидаемый hash: {expected_hash}")
        print(f"[DEBUG] Полученный hash: {hash_value}")
        
        # Проверяем подпись (constant-time сравнение)
        if not hmac.compare_digest(hash_value, expected_hash):
            print(f"Валидация initData: неверная подпись")
            print(f"  Получен hash: {hash_value[:32]}...")
            print(f"  Ожидался hash: {expected_hash[:32]}...")
            print(f"  data_check_string (первые 200 символов): {data_check_string[:200]}...")
            print(f"  Параметры: {list(params.keys())}")
            return None
        
        # Извлекаем user из initData (нужно декодировать URL-encoded значение)
        user_encoded = params.get('user')
        if not user_encoded:
            return None
        
        user_str = urllib.parse.unquote(user_encoded)
        user_data = json.loads(user_str)
        telegram_user_id = user_data.get('id')
        
        if telegram_user_id is None:
            return None
        
        return str(telegram_user_id)
    except Exception as e:
        print(f"Ошибка валидации initData: {e}")
        import traceback
        traceback.print_exc()
        return None

def _get_telegram_user_id_from_request(req):
    """
    Wallet-like: единственный источник истины = валидированный initData.
    Извлекает telegram_user_id из X-Telegram-Init-Data header.
    """
    init_data = req.headers.get('X-Telegram-Init-Data')
    print(f"[DEBUG] X-Telegram-Init-Data header присутствует: {init_data is not None}")
    if not init_data:
        print("[DEBUG] X-Telegram-Init-Data header отсутствует или пустой")
        return None
    
    print(f"[DEBUG] X-Telegram-Init-Data (первые 100 символов): {init_data[:100] if len(init_data) > 100 else init_data}...")
    
    # Если initData приходит в заголовке, он может быть дополнительно URL-encoded
    # Пробуем декодировать один раз (на случай двойного encoding)
    try:
        decoded = urllib.parse.unquote(init_data)
        # Если декодирование изменило строку, используем декодированную версию
        if decoded != init_data:
            print(f"[DEBUG] initData был декодирован (длина до: {len(init_data)}, после: {len(decoded)})")
            init_data = decoded
        else:
            print("[DEBUG] initData не требовал декодирования")
    except Exception as e:
        print(f"[DEBUG] Ошибка при декодировании initData: {e}")
        pass  # Если не получилось декодировать, используем оригинал
    
    return _validate_init_data(init_data)

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

# Health check (API path) - needed for reverse-proxy verification via /api/
@app.route('/api/health')
def api_health():
    return {'status': 'ok'}, 200

# ============================================
# API ДЛЯ ПРОФИЛЯ ПОЛЬЗОВАТЕЛЯ
# Источник истины = PostgreSQL
# Wallet-like: только initData, никаких сессий
# ============================================

@app.route('/api/profile', methods=['GET'])
def get_profile():
    """
    Получить профиль пользователя
    Wallet-like: telegram_user_id из валидированного initData
    Возвращает: 200 + profile JSON если есть, 404 если нет
    """
    print(f"[API] GET /api/profile - запрос получен")
    try:
        telegram_user_id = _get_telegram_user_id_from_request(request)
        if not telegram_user_id:
            return {'error': 'Service unavailable'}, 500
        
        # Загружаем профиль из БД
        conn = get_db_connection()
        
        try:
            ensure_schema_ready(conn)
            colmap = _profiles_column_map()
            row = _select_profile(conn, telegram_user_id, colmap)
            
            if row:
                return jsonify(_row_to_profile(row)), 200
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
    Wallet-like: telegram_user_id из валидированного initData
    Возвращает: 200 + сохранённый профиль
    """
    print(f"[API] POST /api/profile - запрос получен")
    try:
        telegram_user_id = _get_telegram_user_id_from_request(request)
        if not telegram_user_id:
            return {'error': 'Service unavailable'}, 500
        
        data = request.json
        if not data:
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
        
        # Сохраняем в БД (upsert)
        conn = get_db_connection()
        
        try:
            ensure_schema_ready(conn)
            colmap = _profiles_column_map()
            telegram_user_id = str(telegram_user_id)
            cur = conn.cursor()
            # Используем INSERT ... ON CONFLICT для upsert
            height_col = colmap['height']
            weight_col = colmap['weight']

            # updated_at может отсутствовать в старой схеме — тогда не трогаем
            has_updated = colmap.get('has_updated_at', False)
            insert_cols = ["telegram_user_id", "birth_date", "gender", height_col, weight_col]
            insert_vals = ["%s", "%s", "%s", "%s", "%s"]
            params = [telegram_user_id, birth_date, gender, height_cm, weight_kg]

            if has_updated:
                insert_cols.append("updated_at")
                insert_vals.append("now()")

            update_sets = [
                "birth_date = EXCLUDED.birth_date",
                "gender = EXCLUDED.gender",
                f"{height_col} = EXCLUDED.{height_col}",
                f"{weight_col} = EXCLUDED.{weight_col}",
            ]
            if has_updated:
                update_sets.append("updated_at = now()")

            cur.execute(
                f"""
                INSERT INTO public.profiles ({', '.join(insert_cols)})
                VALUES ({', '.join(insert_vals)})
                ON CONFLICT (telegram_user_id)
                DO UPDATE SET {', '.join(update_sets)}
                """,
                tuple(params)
            )
            
            conn.commit()
            cur.close()
            
            # Возвращаем профиль, считанный из БД (реальный источник истины)
            row = _select_profile(conn, telegram_user_id, colmap)
            if not row:
                return {'error': 'Service unavailable'}, 500
            return jsonify(_row_to_profile(row)), 200
        finally:
            conn.close()
            
    except Exception as e:
        print(f"Ошибка при сохранении профиля: {e}")
        import traceback
        traceback.print_exc()
        return {'error': 'Service unavailable'}, 500

# ============================================
# СТАТИЧЕСКИЕ ФАЙЛЫ
# ============================================

@app.route('/')
def index():
    """Главная страница - отдаём index.html"""
    return send_file('index.html')

@app.route('/<path:path>')
def serve_static(path):
    """Отдаём статические файлы"""
    try:
        return send_from_directory('.', path)
    except:
        return {'error': 'Not found'}, 404

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=5000, debug=False)
