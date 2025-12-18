#!/usr/bin/env python3
"""
Telegram бот для Klyro
Отправляет кнопку для открытия мини-аппы
"""
import os
import logging
import uuid
import psycopg2
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

def _get_db_connection():
    db_url = os.environ.get('DATABASE_URL')
    if db_url:
        return psycopg2.connect(db_url)

    required_vars = ['POSTGRES_HOST', 'POSTGRES_DB', 'POSTGRES_USER', 'POSTGRES_PASSWORD']
    missing = [v for v in required_vars if not os.environ.get(v)]
    if missing:
        raise ValueError(f"Missing env vars: {', '.join(missing)}")
    return psycopg2.connect(
        host=os.environ.get('POSTGRES_HOST'),
        port=os.environ.get('POSTGRES_PORT', '5432'),
        database=os.environ.get('POSTGRES_DB'),
        user=os.environ.get('POSTGRES_USER'),
        password=os.environ.get('POSTGRES_PASSWORD')
    )

def _ensure_session_for_user(telegram_user_id: str) -> str:
    """
    Bot is the only source of truth for telegram_user_id.
    Creates user if missing; creates a new session_token and stores mapping.
    """
    conn = _get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS public.users (
                telegram_user_id TEXT PRIMARY KEY,
                created_at TIMESTAMP DEFAULT now()
            )
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS public.sessions (
                session_token TEXT PRIMARY KEY,
                telegram_user_id TEXT NOT NULL REFERENCES public.users(telegram_user_id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT now(),
                last_used_at TIMESTAMP DEFAULT now(),
                expires_at TIMESTAMP DEFAULT (now() + interval '30 days')
            )
        """)
        cur.execute(
            "INSERT INTO public.users (telegram_user_id) VALUES (%s) ON CONFLICT (telegram_user_id) DO NOTHING",
            (telegram_user_id,)
        )
        session_token = str(uuid.uuid4())
        cur.execute(
            "INSERT INTO public.sessions (session_token, telegram_user_id) VALUES (%s, %s)",
            (session_token, telegram_user_id)
        )
        conn.commit()
        cur.close()
        return session_token
    finally:
        conn.close()

logger.info(f"Bot starting...")
logger.info(f"WEB_APP_URL: {WEB_APP_URL}")
logger.info(f"BOT_TOKEN present: {bool(BOT_TOKEN)}")

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработчик команды /start - FAIL FAST"""
    user = update.effective_user
    user_id = user.id if user else 'unknown'
    
    logger.info(f"Получена команда /start от пользователя {user_id}")
    
    # Проверяем WEB_APP_URL
    if not WEB_APP_URL:
        logger.error("КРИТИЧЕСКАЯ ОШИБКА: WEB_APP_URL не установлен!")
        if update.message:
            await update.message.reply_text("❌ Ошибка конфигурации бота. Обратитесь к администратору.")
        return
    
    welcome_text = (
        "Теперь ты можешь открывать Klyro из меню или списка чатов\n\n"
        "Нажми кнопку ниже, чтобы открыть:"
    )
    
    # Единственный путь входа: session в query
    session_token = _ensure_session_for_user(str(user_id))
    sep = '&' if '?' in WEB_APP_URL else '?'
    webapp_url = f"{WEB_APP_URL}{sep}session={session_token}"

    # Создаем кнопку с WebApp
    from telegram import InlineKeyboardMarkup, InlineKeyboardButton
    
    keyboard = [[
        InlineKeyboardButton(
            text="🚀 ОТКРЫТЬ KLYRO",
            web_app=WebAppInfo(url=webapp_url)
        )
    ]]
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    # Отправляем сообщение
    try:
        if update.message:
            await update.message.reply_text(
                welcome_text,
                reply_markup=reply_markup
            )
            logger.info(f"✅ Сообщение отправлено пользователю {user_id}")
        elif update.callback_query:
            await update.callback_query.answer()
            await update.callback_query.message.reply_text(
                welcome_text,
                reply_markup=reply_markup
            )
            logger.info(f"✅ Сообщение отправлено через callback_query пользователю {user_id}")
        else:
            logger.error(f"❌ update.message и update.callback_query равны None для пользователя {user_id}")
            raise ValueError("Не удалось определить способ отправки сообщения")
    except Exception as e:
        logger.error(f"КРИТИЧЕСКАЯ ОШИБКА при отправке сообщения пользователю {user_id}: {e}", exc_info=True)
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

