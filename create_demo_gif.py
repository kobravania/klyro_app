#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont
import os

# Цвета
primary_color = (93, 173, 226)  # #5DADE2
secondary_color = (130, 224, 170)  # #82E0AA
background_color = (244, 246, 247)  # #F4F6F7
white = (255, 255, 255)

# Размеры кадра
width = 640
height = 360

def create_frame(frame_num, total_frames):
    """Создает один кадр GIF"""
    img = Image.new('RGB', (width, height), color=background_color)
    draw = ImageDraw.Draw(img)
    
    # Определяем, какой экран показывать
    screen_type = (frame_num // 20) % 3  # 3 экрана, по 20 кадров каждый
    
    if screen_type == 0:
        # Экран 1: Логотип и название
        # Градиентный фон
        for y in range(height):
            ratio = y / height
            r = int(primary_color[0] * (1 - ratio) + secondary_color[0] * ratio)
            g = int(primary_color[1] * (1 - ratio) + secondary_color[1] * ratio)
            b = int(primary_color[2] * (1 - ratio) + secondary_color[2] * ratio)
            draw.line([(0, y), (width, y)], fill=(r, g, b))
        
        # Логотип
        circle_radius = 50
        circle_center_x = width // 2
        circle_center_y = height // 2 - 30
        
        draw.ellipse(
            [circle_center_x - circle_radius, circle_center_y - circle_radius,
             circle_center_x + circle_radius, circle_center_y + circle_radius],
            outline=white, width=4
        )
        
        # Буква K
        k_x = circle_center_x
        k_y = circle_center_y
        draw.line([(k_x - 15, k_y - 30), (k_x - 15, k_y + 30)], fill=white, width=6)
        draw.line([(k_x - 15, k_y - 10), (k_x + 15, k_y - 30)], fill=white, width=6)
        draw.line([(k_x - 15, k_y + 10), (k_x + 15, k_y + 30)], fill=white, width=6)
        draw.ellipse(
            [circle_center_x - 8, circle_center_y - 8,
             circle_center_x + 8, circle_center_y + 8],
            fill=secondary_color
        )
        
        # Название
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 48)
        except:
            try:
                font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 48)
            except:
                font = ImageFont.load_default()
        
        text = "Klyro"
        text_bbox = draw.textbbox((0, 0), text, font=font)
        text_width = text_bbox[2] - text_bbox[0]
        text_x = (width - text_width) // 2
        text_y = circle_center_y + circle_radius + 20
        draw.text((text_x, text_y), text, font=font, fill=white)
        
    elif screen_type == 1:
        # Экран 2: Форма ввода данных
        # Заголовок
        try:
            font_title = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 32)
            font_text = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 20)
        except:
            try:
                font_title = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 32)
                font_text = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 20)
            except:
                font_title = ImageFont.load_default()
                font_text = ImageFont.load_default()
        
        title = "Расскажите о себе"
        title_bbox = draw.textbbox((0, 0), title, font=font_title)
        title_width = title_bbox[2] - title_bbox[0]
        title_x = (width - title_width) // 2
        draw.text((title_x, 40), title, font=font_title, fill=(44, 62, 80))
        
        # Поля формы (упрощенные)
        y_start = 100
        field_height = 50
        field_width = 400
        field_x = (width - field_width) // 2
        
        # Поле 1
        draw.rectangle(
            [field_x, y_start, field_x + field_width, y_start + field_height],
            outline=primary_color, width=2, fill=white
        )
        draw.text((field_x + 15, y_start + 15), "Возраст: 25", font=font_text, fill=(127, 140, 141))
        
        # Поле 2
        draw.rectangle(
            [field_x, y_start + 70, field_x + field_width, y_start + 70 + field_height],
            outline=primary_color, width=2, fill=white
        )
        draw.text((field_x + 15, y_start + 85), "Пол: Мужской", font=font_text, fill=(127, 140, 141))
        
        # Кнопка
        button_y = y_start + 150
        draw.rectangle(
            [field_x, button_y, field_x + field_width, button_y + 50],
            fill=primary_color
        )
        draw.text((field_x + 150, button_y + 15), "Далее", font=font_title, fill=white)
        
    else:
        # Экран 3: Профиль с результатами
        # Заголовок профиля
        try:
            font_title = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 28)
            font_large = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 36)
            font_text = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 18)
        except:
            try:
                font_title = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 28)
                font_large = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 36)
                font_text = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 18)
            except:
                font_title = ImageFont.load_default()
                font_large = ImageFont.load_default()
                font_text = ImageFont.load_default()
        
        # Карточка с калориями
        card_y = 40
        card_height = 120
        draw.rectangle(
            [50, card_y, width - 50, card_y + card_height],
            fill=primary_color
        )
        
        draw.text((width // 2 - 100, card_y + 20), "Рекомендуемые калории", font=font_text, fill=white)
        draw.text((width // 2 - 60, card_y + 50), "2250", font=font_large, fill=white)
        draw.text((width // 2 - 20, card_y + 90), "ккал/день", font=font_text, fill=white)
        
        # Информация
        info_y = card_y + card_height + 20
        draw.text((80, info_y), "Возраст: 25  |  Рост: 175 см  |  Вес: 70 кг", font=font_text, fill=(44, 62, 80))
    
    return img

# Создаем кадры для GIF
frames = []
total_frames = 60  # 3 экрана × 20 кадров

print("Создание кадров GIF...")
for i in range(total_frames):
    frame = create_frame(i, total_frames)
    frames.append(frame)
    if (i + 1) % 10 == 0:
        print(f"Создано кадров: {i + 1}/{total_frames}")

# Сохраняем как GIF
output_path = 'web_app_demo.gif'
print(f"Сохранение GIF: {output_path}")
frames[0].save(
    output_path,
    save_all=True,
    append_images=frames[1:],
    duration=100,  # 100ms на кадр
    loop=0  # Бесконечный цикл
)

print(f"✅ Демо GIF создан: {output_path}")
print(f"Размер: {width}x{height} пикселей")
print(f"Кадров: {total_frames}")

