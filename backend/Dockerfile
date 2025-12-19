FROM python:3.11-slim

WORKDIR /app

# Установка системных зависимостей
# gcc не нужен, так как используем psycopg2-binary (бинарная версия)
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Копирование requirements
COPY requirements.txt .

# Установка Python зависимостей
RUN pip install --no-cache-dir -r requirements.txt

# Копирование кода backend
COPY bot_server.py .
COPY gunicorn_config.py .
COPY data/ ./data/

# Создание пользователя для безопасности
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose порт
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Запуск через gunicorn с конфигурацией для инициализации БД
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "--timeout", "120", "--access-logfile", "-", "--error-logfile", "-", "--config", "gunicorn_config.py", "bot_server:app"]


