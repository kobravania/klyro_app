"""
Models for Klyro API
"""
from django.db import models


class User(models.Model):
    """Telegram user"""
    telegram_user_id = models.CharField(max_length=255, unique=True, db_index=True)
    username = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'users'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"User {self.telegram_user_id}"


class Profile(models.Model):
    """User profile with health data"""
    GENDER_CHOICES = [
        ('male', 'Мужской'),
        ('female', 'Женский'),
    ]
    
    GOAL_CHOICES = [
        ('lose', 'Похудение'),
        ('maintain', 'Поддержание'),
        ('gain', 'Набор массы'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    age = models.IntegerField()
    height = models.IntegerField()  # в см
    weight = models.DecimalField(max_digits=5, decimal_places=1)  # в кг
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES)
    goal = models.CharField(max_length=10, choices=GOAL_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'profiles'
    
    def __str__(self):
        return f"Profile for {self.user.telegram_user_id}"


class Product(models.Model):
    """Food products with nutritional info"""
    name = models.CharField(max_length=255)
    calories = models.IntegerField()  # ккал на 100г
    protein = models.DecimalField(max_digits=5, decimal_places=1)  # г на 100г
    fat = models.DecimalField(max_digits=5, decimal_places=1)  # г на 100г
    carbs = models.DecimalField(max_digits=5, decimal_places=1)  # г на 100г
    
    class Meta:
        db_table = 'products'
        ordering = ['name']
    
    def __str__(self):
        return self.name

