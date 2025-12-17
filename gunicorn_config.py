"""
Gunicorn конфигурация для Klyro backend
Инициализирует БД один раз при старте master процесса
"""
import os
import sys

def when_ready(server):
    """
    Hook, вызываемый когда gunicorn готов принимать соединения
    Выполняется ОДИН РАЗ в master процессе перед запуском worker'ов
    """
    # Импортируем функцию инициализации здесь, чтобы избежать циклических импортов
    from bot_server import init_db
    
    print("Инициализация базы данных...")
    try:
        init_db()
        print("✓ База данных готова")
    except Exception as e:
        print(f"КРИТИЧЕСКАЯ ОШИБКА: Не удалось инициализировать БД: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

