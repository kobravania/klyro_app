"""
API URLs
"""
from django.urls import path
from . import views

urlpatterns = [
    path('init', views.init_user, name='init'),
    path('profile', views.get_profile, name='profile'),
]

