"""
API views for Klyro
"""
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from .models import User, Profile
from .telegram import validate_init_data, extract_user_id, extract_username
import os


@api_view(['POST'])
def init_user(request):
    """
    ЕДИНСТВЕННЫЙ обязательный init-endpoint для Mini App.
    Валидирует initData, создаёт/находит пользователя, проверяет наличие профиля.
    Возвращает: {user_id: str, has_profile: bool}
    """
    init_data_str = request.headers.get('X-Telegram-Init-Data', '')
    
    if not init_data_str:
        return Response(
            {'error': 'initData required'}, 
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    bot_token = os.environ.get('BOT_TOKEN')
    if not bot_token:
        return Response(
            {'error': 'Server configuration error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    # Валидируем initData
    if not validate_init_data(init_data_str, bot_token):
        return Response(
            {'error': 'invalid initData'}, 
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    # Извлекаем данные пользователя
    telegram_user_id = extract_user_id(init_data_str)
    username = extract_username(init_data_str)
    
    if not telegram_user_id:
        return Response(
            {'error': 'user_id not found in initData'}, 
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    # Создаём или находим пользователя
    with transaction.atomic():
        user, created = User.objects.get_or_create(
            telegram_user_id=telegram_user_id,
            defaults={'username': username or ''}
        )
        
        # Обновляем username если изменился
        if not created and username and user.username != username:
            user.username = username
            user.save(update_fields=['username'])
        
        # Проверяем наличие профиля
        has_profile = Profile.objects.filter(user=user).exists()
    
    return Response({
        'user_id': telegram_user_id,
        'has_profile': has_profile
    }, status=status.HTTP_200_OK)


@api_view(['GET', 'POST'])
def profile(request):
    """
    Получить или сохранить профиль пользователя.
    GET - получить профиль
    POST - сохранить профиль
    """
    init_data_str = request.headers.get('X-Telegram-Init-Data', '')
    
    if not init_data_str:
        return Response(
            {'error': 'initData required'}, 
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    bot_token = os.environ.get('BOT_TOKEN')
    if not bot_token or not validate_init_data(init_data_str, bot_token):
        return Response(
            {'error': 'invalid initData'}, 
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    telegram_user_id = extract_user_id(init_data_str)
    if not telegram_user_id:
        return Response(
            {'error': 'user_id not found'}, 
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    if request.method == 'GET':
        # Получить профиль
        try:
            user = User.objects.get(telegram_user_id=telegram_user_id)
            profile = Profile.objects.get(user=user)
            
            return Response({
                'age': profile.age,
                'height': profile.height,
                'weight': float(profile.weight),
                'gender': profile.gender,
                'goal': profile.goal,
            }, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Profile.DoesNotExist:
            return Response(
                {'error': 'Profile not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    # POST - сохранить профиль
    # Валидация данных
    age = request.data.get('age')
    height = request.data.get('height')
    weight = request.data.get('weight')
    gender = request.data.get('gender')
    goal = request.data.get('goal')
    
    if not all([age, height, weight, gender, goal]):
        return Response(
            {'error': 'Missing required fields'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if gender not in ['male', 'female']:
        return Response(
            {'error': 'Invalid gender'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if goal not in ['lose', 'maintain', 'gain']:
        return Response(
            {'error': 'Invalid goal'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Сохраняем профиль
    with transaction.atomic():
        user = User.objects.get(telegram_user_id=telegram_user_id)
        
        profile, created = Profile.objects.update_or_create(
            user=user,
            defaults={
                'age': int(age),
                'height': int(height),
                'weight': float(weight),
                'gender': gender,
                'goal': goal,
            }
        )
    
    return Response({
        'age': profile.age,
        'height': profile.height,
        'weight': float(profile.weight),
        'gender': profile.gender,
        'goal': profile.goal,
    }, status=status.HTTP_200_OK)

