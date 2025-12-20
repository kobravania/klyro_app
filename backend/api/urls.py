"""
API URLs
"""
from django.urls import path
from rest_framework.decorators import api_view
from rest_framework.response import Response
from . import views

@api_view(['GET'])
def health(request):
    return Response({'status': 'ok'}, status=200)

urlpatterns = [
    path('health', health, name='health'),
    path('init', views.init_user, name='init'),
    path('profile', views.profile, name='profile'),
]

