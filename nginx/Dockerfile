FROM nginx:alpine

COPY nginx.conf /etc/nginx/nginx.conf

# Создаём директорию для SSL
RUN mkdir -p /etc/nginx/ssl

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]

