#!/bin/bash
# Script to create .env file on server

cd /root/klyro

cat > .env << 'EOF'
BOT_TOKEN=8515314140:AAGNbIyxtZidF5q8ZQga9hN8PIYHKMrUsPo
WEB_APP_URL=https://klyro.69-67-173-216.sslip.io
DOMAIN=https://klyro.69-67-173-216.sslip.io
POSTGRES_DB=klyro
POSTGRES_USER=klyro
POSTGRES_PASSWORD=StrongPass123!
EOF

echo "=== .env created ==="
cat .env

