"""
Admin configuration
"""
from django.contrib import admin
from .models import User, Profile, Product

admin.site.register(User)
admin.site.register(Profile)
admin.site.register(Product)

