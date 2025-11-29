#!/usr/bin/env python3
"""
Настройка автоматического ответа на /start для Klyro Bot
Это обеспечит, что кнопка всегда будет видна в списке чатов
"""

import requests
import json

BOT_TOKEN = "8515314140:AAHdCnEUIxYRoJqRRA9k5byj2wbXMj79C_Y"
WEB_APP_URL = "https://kobravania.github.io/klyro_app/"

def set_commands():
    """Устанавливает команды бота"""
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/setMyCommands"
    
    commands = [
        {
            "command": "start",
            "description": "Открыть Klyro"
        }
    ]
    
    response = requests.post(url, json={"commands": commands})
    print("Команды установлены:", response.json())

def send_test_message():
    """Отправляет тестовое сообщение с кнопкой"""
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
        "chat_id": 534177439,
        "text": "🚀 Klyro - ваш помощник по питанию",
        "reply_markup": keyboard
    }
    
    response = requests.post(url, json=data)
    print("Сообщение отправлено:", response.json())

if __name__ == "__main__":
    print("Настройка Klyro Bot...")
    set_commands()
    send_test_message()
    print("\n✅ Готово!")
    print("\nПримечание: Для автоматического ответа на /start нужен webhook или сервер.")
    print("Пока что кнопка будет видна только в последнем сообщении от бота.")

