#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont
import os

# Размеры изображения
width = 640
height = 360

# Создаем изображение с градиентным фоном
img = Image.new('RGB', (width, height), color='#F4F6F7')
draw = ImageDraw.Draw(img)

# Рисуем градиентный фон (простой вариант - два цвета)
primary_color = (93, 173, 226)  # #5DADE2
secondary_color = (130, 224, 170)  # #82E0AA
background_color = (244, 246, 247)  # #F4F6F7

# Заливаем фон
for y in range(height):
    # Простой градиент от синего к зеленому
    ratio = y / height
    r = int(primary_color[0] * (1 - ratio) + secondary_color[0] * ratio)
    g = int(primary_color[1] * (1 - ratio) + secondary_color[1] * ratio)
    b = int(primary_color[2] * (1 - ratio) + secondary_color[2] * ratio)
    draw.line([(0, y), (width, y)], fill=(r, g, b))

# Рисуем логотип (упрощенная версия)
logo_size = 120
logo_x = width // 2 - logo_size // 2
logo_y = height // 2 - logo_size // 2 - 20

# Внешний круг
circle_radius = 50
circle_center_x = width // 2
circle_center_y = logo_y + circle_radius
draw.ellipse(
    [circle_center_x - circle_radius, circle_center_y - circle_radius,
     circle_center_x + circle_radius, circle_center_y + circle_radius],
    outline=(93, 173, 226), width=4
)

# Буква K (упрощенная)
k_x = circle_center_x
k_y = circle_center_y - 20
# Вертикальная линия K
draw.line([(k_x - 15, k_y - 30), (k_x - 15, k_y + 30)], fill=(93, 173, 226), width=6)
# Верхняя диагональ K
draw.line([(k_x - 15, k_y - 10), (k_x + 15, k_y - 30)], fill=(93, 173, 226), width=6)
# Нижняя диагональ K
draw.line([(k_x - 15, k_y + 10), (k_x + 15, k_y + 30)], fill=(93, 173, 226), width=6)

# Центральная точка
draw.ellipse(
    [circle_center_x - 8, circle_center_y - 8,
     circle_center_x + 8, circle_center_y + 8],
    fill=(130, 224, 170)
)

# Название приложения
try:
    # Пытаемся использовать системный шрифт
    font_large = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 48)
except:
    try:
        font_large = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 48)
    except:
        font_large = ImageFont.load_default()

text = "Klyro"
text_bbox = draw.textbbox((0, 0), text, font=font_large)
text_width = text_bbox[2] - text_bbox[0]
text_height = text_bbox[3] - text_bbox[1]
text_x = (width - text_width) // 2
text_y = circle_center_y + circle_radius + 30

# Тень для текста
draw.text((text_x + 2, text_y + 2), text, font=font_large, fill=(0, 0, 0, 100))
# Основной текст
draw.text((text_x, text_y), text, font=font_large, fill=(255, 255, 255))

# Подзаголовок
try:
    font_small = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 20)
except:
    try:
        font_small = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 20)
    except:
        font_small = ImageFont.load_default()

subtitle = "Персональный помощник по питанию"
subtitle_bbox = draw.textbbox((0, 0), subtitle, font=font_small)
subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
subtitle_x = (width - subtitle_width) // 2
subtitle_y = text_y + text_height + 15

draw.text((subtitle_x, subtitle_y), subtitle, font=font_small, fill=(255, 255, 255, 200))

# Сохраняем изображение
output_path = 'web_app_banner.png'
img.save(output_path, 'PNG')
print(f"Изображение создано: {output_path}")
print(f"Размер: {width}x{height} пикселей")






