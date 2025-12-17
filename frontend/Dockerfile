FROM nginx:alpine

# Удаление дефолтной конфигурации
RUN rm -f /etc/nginx/conf.d/default.conf

# Копирование статических файлов
COPY index.html /usr/share/nginx/html/
COPY styles-apple.css /usr/share/nginx/html/
COPY styles-new.css /usr/share/nginx/html/
COPY styles.css /usr/share/nginx/html/
COPY data/ /usr/share/nginx/html/data/
COPY js/ /usr/share/nginx/html/js/

# Копирование конфигурации Nginx
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf

# Создание директорий для certbot
RUN mkdir -p /var/www/certbot

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]

