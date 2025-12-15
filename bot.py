#!/usr/bin/env python3
"""
Telegram бот для Klyro
Отправляет кнопку для открытия мини-аппы
"""
import os
import logging
from telegram import Update, WebAppInfo
from telegram.ext import Application, CommandHandler, ContextTypes

# Настройка логирования
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Токен бота из переменных окружения
BOT_TOKEN = os.environ.get('BOT_TOKEN')
WEB_APP_URL = os.environ.get('WEBHOOK_URL', 'https://klyro.69-67-173-216.sslip.io')

if not BOT_TOKEN:
    raise ValueError("BOT_TOKEN не установлен в переменных окружения!")

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработчик команды /start"""
    user = update.effective_user
    
    welcome_text = (
        "👋 Добро пожаловать в Klyro!\n\n"
        "Ваш персональный помощник по питанию и фитнесу.\n\n"
        "📊 Рассчитывайте калории\n"
        "🎯 Отслеживайте прогресс\n"
        "💪 Достигайте целей\n\n"
        "Нажмите кнопку ниже, чтобы начать:"
    )
    
    # Создаем кнопку с WebApp
    keyboard = [[
        {
            "text": "ОТКРЫТЬ",
            "web_app": WebAppInfo(url=WEB_APP_URL)
        }
    ]]
    
    await update.message.reply_text(
        welcome_text,
        reply_markup={"inline_keyboard": keyboard}
    )

def main() -> None:
    """Запуск бота"""
    # Создаем приложение
    application = Application.builder().token(BOT_TOKEN).build()
    
    # Регистрируем обработчики
    application.add_handler(CommandHandler("start", start))
    
    # Запускаем бота
    logger.info("Бот запущен...")
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == '__main__':
    main()

