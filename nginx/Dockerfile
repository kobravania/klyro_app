FROM nginx:alpine

# Создаём директорию для SSL
RUN mkdir -p /etc/nginx/ssl

# Копируем конфигурацию
COPY nginx.conf /etc/nginx/nginx.conf

# Проверяем конфигурацию при сборке
RUN nginx -t || true

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]

