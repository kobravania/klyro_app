"""
Gunicorn конфигурация для Klyro backend
Инициализирует БД один раз при старте master процесса
"""
import os
import sys

# Добавляем путь к модулю
sys.path.insert(0, os.path.dirname(__file__))

# Импортируем функцию инициализации
from bot_server import init_db

def when_ready(server):
    """
    Hook, вызываемый когда gunicorn готов принимать соединения
    Выполняется ОДИН РАЗ в master процессе перед запуском worker'ов
    """
    print("Инициализация базы данных...")
    try:
        init_db()
        print("✓ База данных готова")
    except Exception as e:
        print(f"КРИТИЧЕСКАЯ ОШИБКА: Не удалось инициализировать БД: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

