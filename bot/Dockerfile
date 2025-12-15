FROM python:3.11-slim

WORKDIR /app

# Установка системных зависимостей
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Копирование requirements для бота (если есть отдельный файл)
# Если нет, используем общий requirements.txt
COPY requirements.txt .

# Установка дополнительных зависимостей для бота
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir python-telegram-bot==20.7

# Копирование кода бота
# Если файл bot.py существует, он будет скопирован
# Если нет, создайте его на основе вашей логики
COPY bot_server.py ./bot_server.py

# Создание пользователя для безопасности
RUN useradd -m -u 1000 botuser && chown -R botuser:botuser /app
USER botuser

# Запуск бота
# Если у вас есть отдельный файл bot.py, измените команду
CMD ["python", "bot_server.py"]


