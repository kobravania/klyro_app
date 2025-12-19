#!/usr/bin/env python3
"""
Telegram бот для Klyro
Создает сессии при /start и отправляет кнопку с startapp
"""
import os
import logging
import uuid
import psycopg2
from datetime import datetime, timedelta
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
# URL для WebApp
WEB_APP_URL = os.environ.get('WEB_APP_URL') or os.environ.get('DOMAIN') or 'https://klyro.69-67-173-216.sslip.io'
# БД для сессий
POSTGRES_HOST = os.environ.get('POSTGRES_HOST', 'postgres')
POSTGRES_DB = os.environ.get('POSTGRES_DB', 'klyro')
POSTGRES_USER = os.environ.get('POSTGRES_USER', 'klyro')
POSTGRES_PASSWORD = os.environ.get('POSTGRES_PASSWORD')

if not BOT_TOKEN:
    raise ValueError("BOT_TOKEN не установлен в переменных окружения!")

logger.info(f"Bot starting...")
logger.info(f"WEB_APP_URL: {WEB_APP_URL}")
logger.info(f"BOT_TOKEN present: {bool(BOT_TOKEN)}")

def get_db_connection():
    """Получить подключение к базе данных"""
    return psycopg2.connect(
        host=POSTGRES_HOST,
        port=os.environ.get('POSTGRES_PORT', '5432'),
        database=POSTGRES_DB,
        user=POSTGRES_USER,
        password=POSTGRES_PASSWORD
    )

def _ensure_session_for_user(telegram_user_id):
    """
    Создает или обновляет сессию для пользователя.
    Возвращает session_id.
    """
    conn = get_db_connection()
    try:
        # Генерируем новый session_id
        session_id = str(uuid.uuid4())
        expires_at = datetime.now() + timedelta(days=30)  # Сессия на 30 дней
        
        cur = conn.cursor()
        
        # Проверяем, какая колонка используется (session_id или session_token)
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public' 
            AND table_name = 'sessions' 
            AND column_name IN ('session_id', 'session_token')
        """)
        col_row = cur.fetchone()
        session_col = col_row[0] if col_row else 'session_id'
        
        # Удаляем старые сессии пользователя
        cur.execute(f"""
            DELETE FROM public.sessions
            WHERE telegram_user_id = %s
        """, (str(telegram_user_id),))
        
        # Создаем новую сессию
        cur.execute(f"""
            INSERT INTO public.sessions ({session_col}, telegram_user_id, expires_at)
            VALUES (%s, %s, %s)
            ON CONFLICT ({session_col}) DO UPDATE
            SET telegram_user_id = EXCLUDED.telegram_user_id,
                expires_at = EXCLUDED.expires_at
        """, (session_id, str(telegram_user_id), expires_at))
        
        conn.commit()
        cur.close()
        
        logger.info(f"Создана сессия {session_id} для пользователя {telegram_user_id}")
        return session_id
    except Exception as e:
        logger.error(f"Ошибка при создании сессии: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработчик команды /start - создает сессию и отправляет кнопку с startapp"""
    user = update.effective_user
    if not user:
        logger.error("Получена команда /start без пользователя")
        return
    
    telegram_user_id = user.id
    logger.info(f"Получена команда /start от пользователя {telegram_user_id}")
    
    # Проверяем WEB_APP_URL
    if not WEB_APP_URL:
        logger.error("КРИТИЧЕСКАЯ ОШИБКА: WEB_APP_URL не установлен!")
        if update.message:
            await update.message.reply_text("❌ Ошибка конфигурации бота. Обратитесь к администратору.")
        return
    
    try:
        # Создаем сессию для пользователя
        session_id = _ensure_session_for_user(telegram_user_id)
        
        # Формируем startapp ссылку
        bot_username = context.bot.username
        if not bot_username:
            logger.error("Не удалось получить username бота")
            if update.message:
                await update.message.reply_text("❌ Ошибка конфигурации бота.")
            return
        
        welcome_text = (
            "Нажми кнопку ниже, чтобы открыть Klyro:"
        )
        
        # Создаем WebApp кнопку с startapp параметром
        # Telegram автоматически передаст startapp=<session_id> в initDataUnsafe.start_param
        # при открытии Mini App через эту кнопку
        webapp_url = f"{WEB_APP_URL.rstrip('/')}?startapp={session_id}"
        
        from telegram import InlineKeyboardMarkup, InlineKeyboardButton
        
        keyboard = [[
            InlineKeyboardButton(
                text="🚀 ОТКРЫТЬ KLYRO",
                web_app=WebAppInfo(url=webapp_url)
            )
        ]]
        
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        # Отправляем сообщение
        if update.message:
            await update.message.reply_text(
                welcome_text,
                reply_markup=reply_markup
            )
            logger.info(f"✅ Сообщение отправлено пользователю {telegram_user_id} с сессией {session_id}")
        elif update.callback_query:
            await update.callback_query.answer()
            await update.callback_query.message.reply_text(
                welcome_text,
                reply_markup=reply_markup
            )
            logger.info(f"✅ Сообщение отправлено через callback_query пользователю {telegram_user_id} с сессией {session_id}")
        else:
            logger.error(f"❌ update.message и update.callback_query равны None для пользователя {telegram_user_id}")
            raise ValueError("Не удалось определить способ отправки сообщения")
    except Exception as e:
        logger.error(f"КРИТИЧЕСКАЯ ОШИБКА при обработке /start для пользователя {telegram_user_id}: {e}", exc_info=True)
        if update.message:
            await update.message.reply_text("❌ Ошибка при создании сессии. Попробуйте позже.")
        raise

def main() -> None:
    """Запуск бота - FAIL FAST"""
    # Проверяем переменные окружения ПЕРЕД запуском
    if not BOT_TOKEN:
        logger.error("КРИТИЧЕСКАЯ ОШИБКА: BOT_TOKEN не установлен!")
        raise ValueError("BOT_TOKEN не установлен в переменных окружения!")
    
    if not WEB_APP_URL:
        logger.error("КРИТИЧЕСКАЯ ОШИБКА: WEB_APP_URL не установлен!")
        raise ValueError("WEB_APP_URL не установлен в переменных окружения!")
    
    logger.info("=" * 50)
    logger.info("Запуск бота Klyro")
    logger.info(f"WEB_APP_URL: {WEB_APP_URL}")
    logger.info(f"BOT_TOKEN: {'*' * 10} (установлен)")
    logger.info("=" * 50)
    
    # Создаем приложение
    try:
        application = Application.builder().token(BOT_TOKEN).build()
    except Exception as e:
        logger.error(f"КРИТИЧЕСКАЯ ОШИБКА: Не удалось создать приложение бота: {e}")
        raise
    
    # Регистрируем обработчики
    try:
        application.add_handler(CommandHandler("start", start))
        logger.info("✅ Обработчик /start зарегистрирован")
    except Exception as e:
        logger.error(f"КРИТИЧЕСКАЯ ОШИБКА: Не удалось зарегистрировать обработчики: {e}")
        raise
    
    # Запускаем бота - FAIL FAST при любой ошибке
    logger.info("Запуск polling...")
    logger.info(f"Бот будет отвечать на /start с WebApp URL: {WEB_APP_URL}")
    
    try:
        application.run_polling(
            allowed_updates=Update.ALL_TYPES,
            drop_pending_updates=True,
            close_loop=False
        )
    except KeyboardInterrupt:
        logger.info("Бот остановлен пользователем")
        raise
    except Exception as e:
        logger.error(f"КРИТИЧЕСКАЯ ОШИБКА в боте: {e}", exc_info=True)
        raise

if __name__ == '__main__':
    main()

