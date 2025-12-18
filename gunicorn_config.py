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
    Дополнительная защита: если по какой-то причине when_ready не выполнился,
    гарантируем инициализацию схемы в каждом worker.
    init_db защищён advisory-lock'ом, поэтому гонок/конфликтов не будет.
    """
    try:
        if '/app' not in sys.path:
            sys.path.insert(0, '/app')
        from bot_server import init_db
        init_db()
    except Exception:
        # Fail-fast: worker не должен работать без схемы
        import traceback
        traceback.print_exc()
        sys.exit(1)

