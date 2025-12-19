#!/usr/bin/env python3
"""
Flask сервер для раздачи статических файлов Telegram Web App
+ API для хранения профилей пользователей в PostgreSQL
Session-based architecture: только через /start → startapp → сессия
"""
from flask import Flask, send_from_directory, send_file, Response, request, jsonify
from flask_cors import CORS
import os
import sys
import json
import psycopg2
from psycopg2 import errors as psycopg2_errors
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta
from functools import lru_cache
from datetime import date as _date

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
    """Инициализировать таблицы profiles и sessions. FAIL-FAST: выходит если не удалось."""
    conn = get_db_connection()
    
    try:
        # ВАЖНО: init_db может быть вызван конкурентно (gunicorn, рестарты).
        # Используем advisory lock, чтобы создание таблицы было строго одиночным.
        conn.autocommit = True
        cur = conn.cursor()

        # Глобальная блокировка на уровне БД (одна на весь кластер)
        cur.execute("SELECT pg_advisory_lock(hashtext('klyro_init_db_v1'))")
        try:
            # Таблица sessions для startapp-сессий
            cur.execute("""
                CREATE TABLE IF NOT EXISTS public.sessions (
                    session_id TEXT PRIMARY KEY,
                    telegram_user_id TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT now(),
                    expires_at TIMESTAMP NOT NULL
                )
            """)
            
            # Таблица profiles
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
            
            # Детерминированная проверка схемы
            cur.execute("SELECT to_regclass('public.profiles') AS reg")
            reg_profiles = cur.fetchone()[0]
            cur.execute("SELECT to_regclass('public.sessions') AS reg")
            reg_sessions = cur.fetchone()[0]
            
            if reg_profiles is None or reg_sessions is None:
                raise RuntimeError("Таблицы не созданы/не видны")
        finally:
            cur.execute("SELECT pg_advisory_unlock(hashtext('klyro_init_db_v1'))")

        print("✓ Таблицы profiles и sessions инициализированы")
        cur.close()
    except Exception as e:
        print(f"КРИТИЧЕСКАЯ ОШИБКА: Не удалось создать таблицы: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        conn.close()

def ensure_schema_ready(conn):
    """
    Fail-fast: если схема не готова (нет таблиц profiles и sessions) — сервер не должен работать.
    """
    try:
        cur = conn.cursor()
        cur.execute("SELECT to_regclass('public.profiles') AS reg")
        reg_profiles = cur.fetchone()[0]
        cur.execute("SELECT to_regclass('public.sessions') AS reg")
        reg_sessions = cur.fetchone()[0]
        if reg_profiles is None or reg_sessions is None:
            print("КРИТИЧЕСКАЯ ОШИБКА: схема БД не готова (нет таблиц public.profiles или public.sessions)")
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

def _get_session_id_from_request(req):
    """
    Извлекает session_id из заголовка X-Klyro-Session.
    Единственный источник истины для аутентификации.
    """
    return req.headers.get('X-Klyro-Session')

def _get_telegram_user_id_from_session(session_id):
    """
    Получает telegram_user_id из таблицы sessions по session_id.
    Проверяет, что сессия не истекла.
    Возвращает telegram_user_id или None.
    """
    if not session_id:
        return None
    
    conn = get_db_connection()
    try:
        ensure_schema_ready(conn)
        cur = conn.cursor()
        
        # Проверяем, существует ли сессия и не истекла ли она
        cur.execute("""
            SELECT telegram_user_id
            FROM public.sessions
            WHERE session_id = %s AND expires_at > now()
        """, (session_id,))
        
        row = cur.fetchone()
        cur.close()
        
        if row:
            return str(row[0])
        return None
    except Exception as e:
        print(f"Ошибка при получении user_id из сессии: {e}")
        return None
    finally:
        conn.close()

def _get_telegram_user_id_from_request(req):
    """
    Единственный источник истины = сессия из X-Klyro-Session.
    Нет сессии → None (вернет 401)
    """
    session_id = _get_session_id_from_request(req)
    if not session_id:
        return None
    
    return _get_telegram_user_id_from_session(session_id)

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
# Session-based: только через X-Klyro-Session
# ============================================

@app.route('/api/profile', methods=['GET'])
def get_profile():
    """
    Получить профиль пользователя
    Session-based: telegram_user_id из сессии (X-Klyro-Session)
    Возвращает: 200 + profile JSON если есть, 404 если нет, 401 если нет сессии
    """
    print(f"[API] GET /api/profile - запрос получен")
    
    # СТРОГАЯ ПРОВЕРКА: нет сессии → 401 (не 500)
    session_id = request.headers.get('X-Klyro-Session')
    print(f"[API] Session ID из заголовка: {session_id}")
    
    if not session_id:
        print("[API] GET /api/profile: нет заголовка X-Klyro-Session → 401")
        return jsonify({'error': 'unauthorized'}), 401
    
    # Проверяем сессию в БД
    telegram_user_id = _get_telegram_user_id_from_session(session_id)
    print(f"[API] Telegram User ID из сессии: {telegram_user_id}")
    
    if not telegram_user_id:
        print("[API] GET /api/profile: сессия не найдена или истекла → 401")
        return jsonify({'error': 'unauthorized'}), 401
    
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

@app.route('/api/profile', methods=['POST'])
def save_profile():
    """
    Сохранить или обновить профиль пользователя (upsert, idempotent)
    Session-based: telegram_user_id из сессии (X-Klyro-Session)
    Возвращает: 200 + сохранённый профиль, 401 если нет сессии
    """
    print(f"[API] POST /api/profile - запрос получен")
    
    # СТРОГАЯ ПРОВЕРКА: нет сессии → 401 (не 500)
    session_id = request.headers.get('X-Klyro-Session')
    print(f"[API] Session ID из заголовка: {session_id}")
    
    if not session_id:
        print("[API] POST /api/profile: нет заголовка X-Klyro-Session → 401")
        return jsonify({'error': 'unauthorized'}), 401
    
    # Проверяем сессию в БД
    telegram_user_id = _get_telegram_user_id_from_session(session_id)
    print(f"[API] Telegram User ID из сессии: {telegram_user_id}")
    
    if not telegram_user_id:
        print("[API] POST /api/profile: сессия не найдена или истекла → 401")
        return jsonify({'error': 'unauthorized'}), 401
    
    data = request.json
    if not data:
        return jsonify({'error': 'Service unavailable'}), 500
        
        # Извлекаем данные профиля (игнорируем лишние поля)
        birth_date = data.get('birth_date') or data.get('dateOfBirth')
        gender = data.get('gender')
        height_cm = data.get('height_cm') or data.get('height')
        weight_kg = data.get('weight_kg') or data.get('weight')
        
        # Минимальная валидация - только проверяем наличие обязательных полей
        if not birth_date or not gender or not height_cm or not weight_kg:
            return jsonify({'error': 'Service unavailable'}), 500
        
        # Нормализация gender
        gender = str(gender).lower().strip()
        if gender not in ('male', 'female'):
            return jsonify({'error': 'Service unavailable'}), 500
        
        # Преобразование типов
        try:
            height_cm = int(height_cm)
            weight_kg = int(weight_kg)
        except (ValueError, TypeError):
            return jsonify({'error': 'Service unavailable'}), 500
        
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
                return jsonify({'error': 'Service unavailable'}), 500
            return jsonify(_row_to_profile(row)), 200
        finally:
            conn.close()

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
