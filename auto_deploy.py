#!/usr/bin/env python3
"""
Автоматическая настройка деплоя на Render через API
"""
import requests
import json
import os
import time

# Render API (нужен API ключ)
RENDER_API_KEY = ""  # Нужно получить на render.com
RENDER_API_URL = "https://api.render.com/v1"

def create_render_service():
    """Создаёт сервис на Render"""
    headers = {
        "Authorization": f"Bearer {RENDER_API_KEY}",
        "Content-Type": "application/json"
    }
    
    service_data = {
        "type": "web_service",
        "name": "klyro-bot",
        "repo": "https://github.com/kobravania/klyro_app",
        "branch": "main",
        "buildCommand": "pip install -r requirements.txt",
        "startCommand": "gunicorn bot_server:app",
        "envVars": [
            {
                "key": "BOT_TOKEN",
                "value": os.environ.get('BOT_TOKEN', '')  # ⚠️ Используйте переменную окружения!
            },
            {
                "key": "WEB_APP_URL",
                "value": "https://kobravania.github.io/klyro_app/"
            }
        ]
    }
    
    response = requests.post(
        f"{RENDER_API_URL}/services",
        headers=headers,
        json=service_data
    )
    
    return response.json()

if __name__ == "__main__":
    print("Для использования Render API нужен API ключ")
    print("Получите его на: https://dashboard.render.com/account/api-keys")

