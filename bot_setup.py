#!/usr/bin/env python3
"""
Скрипт для настройки Telegram бота Klyro
Настраивает приветственное сообщение с кнопкой Web App
"""

import requests
import json

# ВАЖНО: Замените на токен вашего бота
# Получить токен можно у @BotFather командой /token
BOT_TOKEN = "ВАШ_ТОКЕН_БОТА"

# URL вашего Web App
WEB_APP_URL = "https://kobravania.github.io/klyro_app/"

def set_start_command():
    """Устанавливает команду /start с кнопкой Web App"""
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/setMyCommands"
    
    commands = [
        {
            "command": "start",
            "description": "Открыть Klyro - помощник по питанию"
        }
    ]
    
    data = {
        "commands": json.dumps(commands)
    }
    
    response = requests.post(url, data=data)
    return response.json()

def send_welcome_message(chat_id):
    """Отправляет приветственное сообщение с кнопкой Web App"""
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    
    keyboard = {
        "inline_keyboard": [[
            {
                "text": "ОТКРЫТЬ",
                "web_app": {
                    "url": WEB_APP_URL
                }
            }
        ]]
    }
    
    data = {
        "chat_id": chat_id,
        "text": "👋 Добро пожаловать в Klyro!\n\nВаш персональный помощник по питанию и фитнесу.\n\nНажмите кнопку ниже, чтобы начать:",
        "reply_markup": json.dumps(keyboard)
    }
    
    response = requests.post(url, data=data)
    return response.json()

def set_webhook():
    """Настраивает webhook (опционально, для автоматических ответов)"""
    # Это для более продвинутой настройки
    # Пока не требуется
    pass

if __name__ == "__main__":
    print("⚠️  ВАЖНО: Замените BOT_TOKEN на токен вашего бота!")
    print("Получить токен: @BotFather → /token")
    print("\nДля тестирования отправьте команду /start боту")
    print("Бот должен ответить сообщением с кнопкой 'ОТКРЫТЬ'")






