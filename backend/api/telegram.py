"""
Telegram initData validation
"""
import hmac
import hashlib
import json
import urllib.parse
import os


def validate_init_data(init_data_str: str, bot_token: str) -> bool:
    """
    Валидирует Telegram initData по HMAC-SHA256.
    """
    if not init_data_str or not bot_token:
        return False
    
    try:
        # Парсим initData
        parsed = urllib.parse.parse_qsl(init_data_str)
        data_dict = dict(parsed)
        
        # Извлекаем hash
        received_hash = data_dict.pop('hash', '')
        if not received_hash:
            return False
        
        # Формируем data_check_string
        data_check_string = '\n'.join(f"{k}={v}" for k, v in sorted(data_dict.items()))
        
        # Вычисляем секретный ключ
        secret_key = hmac.new(
            key=b"WebAppData",
            msg=bot_token.encode(),
            digestmod=hashlib.sha256
        ).digest()
        
        # Вычисляем ожидаемый hash
        expected_hash = hmac.new(
            key=secret_key,
            msg=data_check_string.encode(),
            digestmod=hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(received_hash, expected_hash)
    except Exception:
        return False


def extract_user_id(init_data_str: str) -> str | None:
    """
    Извлекает telegram_user_id из валидированного initData.
    """
    if not init_data_str:
        return None
    
    try:
        parsed = urllib.parse.parse_qsl(init_data_str)
        data_dict = dict(parsed)
        
        # Парсим user JSON
        user_str = data_dict.get('user', '')
        if not user_str:
            return None
        
        user_data = json.loads(user_str)
        user_id = user_data.get('id')
        
        if user_id:
            return str(user_id)
        return None
    except Exception:
        return None


def extract_username(init_data_str: str) -> str | None:
    """
    Извлекает username из валидированного initData.
    """
    if not init_data_str:
        return None
    
    try:
        parsed = urllib.parse.parse_qsl(init_data_str)
        data_dict = dict(parsed)
        
        user_str = data_dict.get('user', '')
        if not user_str:
            return None
        
        user_data = json.loads(user_str)
        return user_data.get('username') or None
    except Exception:
        return None

