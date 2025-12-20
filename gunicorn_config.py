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
    # Добавляем текущую директорию в путь для импорта
    import sys
    if '/app' not in sys.path:
        sys.path.insert(0, '/app')
    
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

def post_worker_init(worker):
    """
    УБРАНА ИНИЦИАЛИЗАЦИЯ БД: инициализация выполняется ОДИН РАЗ в when_ready.
    Воркеры только проверяют, что схема готова, но не создают таблицы.
    """
    # Инициализация БД выполняется только в when_ready (master процесс)
    # Воркеры не должны создавать таблицы - это вызывает гонки
    pass

