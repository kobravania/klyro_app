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
        logger.info("=" * 50)
        logger.info(f"Received /start command from user {user.id if user else 'unknown'}")
        logger.info(f"Update: {update}")
        logger.info(f"Message: {update.message}")
        logger.info(f"WEB_APP_URL: {WEB_APP_URL}")
        
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
            logger.info("Sending welcome message...")
            await update.message.reply_text(
                welcome_text,
                reply_markup=reply_markup
            )
            logger.info(f"✅ Welcome message sent to user {user.id if user else 'unknown'}")
        elif update.callback_query:
            # Если это callback query, отвечаем на него
            logger.info("Received callback query, answering...")
            await update.callback_query.answer()
            await update.callback_query.message.reply_text(
                welcome_text,
                reply_markup=reply_markup
            )
        else:
            logger.error("❌ update.message is None and update.callback_query is None!")
            logger.error(f"Update type: {type(update)}")
            logger.error(f"Update dict: {update.to_dict() if hasattr(update, 'to_dict') else 'N/A'}")
    except Exception as e:
        logger.error(f"❌ Error in start handler: {e}", exc_info=True)
        # Пробуем отправить простое сообщение об ошибке
        try:
            if update.message:
                await update.message.reply_text("Произошла ошибка. Попробуйте еще раз.")
        except:
            pass

def main() -> None:
    """Запуск бота"""
    try:
        # Проверяем переменные окружения
        if not BOT_TOKEN:
            logger.error("BOT_TOKEN не установлен!")
            raise ValueError("BOT_TOKEN не установлен в переменных окружения!")
        
        logger.info("=" * 50)
        logger.info("Запуск бота Klyro")
        logger.info(f"WEB_APP_URL: {WEB_APP_URL}")
        logger.info(f"BOT_TOKEN: {'*' * 10} (установлен)")
        logger.info("=" * 50)
        
        # Создаем приложение
        logger.info("Creating bot application...")
        application = Application.builder().token(BOT_TOKEN).build()
        logger.info("Application created successfully")
        
        # Регистрируем обработчики
        application.add_handler(CommandHandler("start", start))
        logger.info("Command handlers registered: /start")
        
        # Запускаем бота
        logger.info("Starting bot polling...")
        logger.info(f"Bot will respond to /start with WebApp URL: {WEB_APP_URL}")
        logger.info("Bot is ready to receive commands!")
        
        application.run_polling(
            allowed_updates=Update.ALL_TYPES,
            drop_pending_updates=True,  # Игнорируем старые обновления
            close_loop=False
        )
    except KeyboardInterrupt:
        logger.info("Bot stopped by user")
    except Exception as e:
        logger.error(f"Fatal error in bot: {e}", exc_info=True)
        # Не падаем сразу, ждем немного и перезапускаемся
        import time
        time.sleep(5)
        raise

if __name__ == '__main__':
    main()

