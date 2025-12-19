FROM python:3.11-slim

WORKDIR /app

# Установка системных зависимостей
# gcc не нужен, так как используем psycopg2-binary (бинарная версия)
# Все зависимости Python устанавливаются через pip

# Копирование requirements для бота (если есть отдельный файл)
# Если нет, используем общий requirements.txt
COPY requirements.txt .

# Установка дополнительных зависимостей для бота
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir python-telegram-bot==20.7

# Копирование кода бота
COPY bot.py ./bot.py

# Создание пользователя для безопасности
# Временно запускаем от root для упрощения отладки
# RUN useradd -m -u 1000 botuser && chown -R botuser:botuser /app
# USER botuser

# Запуск бота
CMD ["python", "-u", "bot.py"]


