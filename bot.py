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
# URL для WebApp (не webhook!)
WEB_APP_URL = os.environ.get('WEB_APP_URL') or os.environ.get('DOMAIN') or 'https://klyro.69-67-173-216.sslip.io'

if not BOT_TOKEN:
    raise ValueError("BOT_TOKEN не установлен в переменных окружения!")

logger.info(f"Bot starting...")
logger.info(f"WEB_APP_URL: {WEB_APP_URL}")
logger.info(f"BOT_TOKEN present: {bool(BOT_TOKEN)}")

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработчик команды /start"""
    try:
        user = update.effective_user
        logger.info(f"Received /start from user {user.id if user else 'unknown'}")
        
        welcome_text = (
            "👋 Добро пожаловать в Klyro!\n\n"
            "Ваш персональный помощник по питанию и фитнесу.\n\n"
            "📊 Рассчитывайте калории\n"
            "🎯 Отслеживайте прогресс\n"
            "💪 Достигайте целей\n\n"
            "Нажмите кнопку ниже, чтобы начать:"
        )
        
        # Создаем кнопку с WebApp
        from telegram import InlineKeyboardMarkup, InlineKeyboardButton
        
        keyboard = [[
            InlineKeyboardButton(
                text="🚀 ОТКРЫТЬ KLYRO",
                web_app=WebAppInfo(url=WEB_APP_URL)
            )
        ]]
        
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        if update.message:
            await update.message.reply_text(
                welcome_text,
                reply_markup=reply_markup
            )
            logger.info(f"Sent welcome message to user {user.id if user else 'unknown'}")
        else:
            logger.error("update.message is None!")
    except Exception as e:
        logger.error(f"Error in start handler: {e}", exc_info=True)

def main() -> None:
    """Запуск бота"""
    try:
        # Создаем приложение
        logger.info("Creating bot application...")
        application = Application.builder().token(BOT_TOKEN).build()
        
        # Регистрируем обработчики
        application.add_handler(CommandHandler("start", start))
        logger.info("Command handlers registered")
        
        # Запускаем бота
        logger.info("Starting bot polling...")
        logger.info(f"Bot will respond to /start with WebApp URL: {WEB_APP_URL}")
        application.run_polling(
            allowed_updates=Update.ALL_TYPES,
            drop_pending_updates=True  # Игнорируем старые обновления
        )
    except Exception as e:
        logger.error(f"Fatal error in bot: {e}", exc_info=True)
        raise

if __name__ == '__main__':
    main()

