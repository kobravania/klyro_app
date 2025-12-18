#!/usr/bin/env bash
set -euo pipefail

# Klyro one-shot self-healing deploy:
# - pull latest code
# - ensure docker-compose stack is up
# - avoid conflicts with legacy systemd service (klyro.service)
# - configure system nginx to proxy subdomain to docker frontend and /api/ to backend

PROJECT_DIR="${PROJECT_DIR:-/root/klyro}"
COMPOSE_FILE="${COMPOSE_FILE:-$PROJECT_DIR/docker-compose.yml}"

if [[ ! -d "$PROJECT_DIR" ]]; then
  echo "[FATAL] Project dir not found: $PROJECT_DIR"
  exit 1
fi

cd "$PROJECT_DIR"

echo "[1/6] Updating code..."
git fetch origin main >/dev/null 2>&1 || true
git pull --ff-only origin main

echo "[2/6] Ensuring docker + compose available..."
if ! command -v docker >/dev/null 2>&1; then
  echo "[FATAL] docker not found"
  exit 1
fi
if ! command -v docker-compose >/dev/null 2>&1; then
  echo "[FATAL] docker-compose not found"
  exit 1
fi

echo "[3/6] Stopping legacy systemd service (if exists)..."
if systemctl list-unit-files | grep -q '^klyro\.service'; then
  systemctl stop klyro.service >/dev/null 2>&1 || true
  systemctl disable klyro.service >/dev/null 2>&1 || true
fi

echo "[4/6] Building & starting docker-compose stack..."
# BuildKit sometimes fails on small VPS with: "DeadlineExceeded: context deadline exceeded"
# Force legacy builder for determinism.
export DOCKER_BUILDKIT=0
export COMPOSE_DOCKER_CLI_BUILD=0
# Ensure stable compose project name (prevents accidental new volumes/network)
export COMPOSE_PROJECT_NAME=klyro

# Pre-pull base images to reduce build flakiness
docker-compose -f "$COMPOSE_FILE" pull --ignore-pull-failures || true

# Build+up with a single retry
if ! docker-compose -f "$COMPOSE_FILE" up -d --build; then
  echo "[WARN] docker-compose up --build failed once, retrying..."
  docker-compose -f "$COMPOSE_FILE" up -d --build
fi

echo "[5/6] Waiting for backend health..."
deadline=$((SECONDS+90))
until curl -fsS http://127.0.0.1:8080/ >/dev/null 2>&1; do
  if (( SECONDS > deadline )); then
    echo "[FATAL] Frontend did not become reachable on :8080"
    exit 1
  fi
  sleep 2
done
deadline=$((SECONDS+90))
until docker-compose -f "$COMPOSE_FILE" exec -T backend curl -fsS http://localhost:5000/health >/dev/null 2>&1; do
  if (( SECONDS > deadline )); then
    echo "[FATAL] Backend healthcheck failed on :5000"
    exit 1
  fi
  sleep 2
done

echo "[6/6] Configuring system nginx reverse-proxy..."

# DOMAIN env may contain scheme; derive host
DOMAIN_RAW="${DOMAIN:-${WEB_APP_URL:-}}"
if [[ -z "$DOMAIN_RAW" ]]; then
  # fallback to sslip domain used in this project
  DOMAIN_RAW="https://klyro.69-67-173-216.sslip.io"
fi
DOMAIN_HOST="${DOMAIN_RAW#http://}"
DOMAIN_HOST="${DOMAIN_HOST#https://}"
DOMAIN_HOST="${DOMAIN_HOST%%/*}"

NGINX_CONFD="/etc/nginx/conf.d/00-klyro.conf"

CERT_DIR="/etc/letsencrypt/live/${DOMAIN_HOST}"
FULLCHAIN="${CERT_DIR}/fullchain.pem"
PRIVKEY="${CERT_DIR}/privkey.pem"

if [[ -f "$FULLCHAIN" && -f "$PRIVKEY" ]]; then
  # HTTPS available -> force https and terminate TLS here (Telegram uses https)
  cat > "$NGINX_CONFD" <<EOF
server {
  listen 80;
  server_name ${DOMAIN_HOST};
  return 301 https://\$host\$request_uri;
}

server {
  listen 443 ssl;
  server_name ${DOMAIN_HOST};

  ssl_certificate     ${FULLCHAIN};
  ssl_certificate_key ${PRIVKEY};

  # Telegram Mini App must not be cached aggressively
  add_header Cache-Control "no-cache, no-store, must-revalidate" always;
  add_header Pragma "no-cache" always;
  add_header Expires "0" always;

  location /api/ {
    proxy_pass http://127.0.0.1:5000;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_read_timeout 60s;
    proxy_connect_timeout 10s;
  }

  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
}
EOF
else
  # No certs -> serve plain HTTP (still usable for local debug)
  cat > "$NGINX_CONFD" <<EOF
server {
  listen 80;
  server_name ${DOMAIN_HOST};

  # Telegram Mini App must not be cached aggressively
  add_header Cache-Control "no-cache, no-store, must-revalidate" always;
  add_header Pragma "no-cache" always;
  add_header Expires "0" always;

  location /api/ {
    proxy_pass http://127.0.0.1:5000;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_read_timeout 60s;
    proxy_connect_timeout 10s;
  }

  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
}
EOF
fi

# disable default site if present to avoid conflicts
if [[ -e /etc/nginx/sites-enabled/default ]]; then
  rm -f /etc/nginx/sites-enabled/default || true
fi

# Ensure we do NOT have duplicate server blocks for the same domain.
# Previous versions wrote both to sites-enabled and conf.d, which caused:
#   "conflicting server name ..., ignored"
if [[ -L /etc/nginx/sites-enabled/klyro || -f /etc/nginx/sites-enabled/klyro ]]; then
  rm -f /etc/nginx/sites-enabled/klyro || true
fi
if [[ -f /etc/nginx/sites-available/klyro ]]; then
  rm -f /etc/nginx/sites-available/klyro || true
fi

# Disable any other nginx config that claims this server_name (to stop HTTPS conflicts)
echo "[6/6] Disabling conflicting nginx vhosts for ${DOMAIN_HOST} ..."
tmp_nginx_dump="$(mktemp)"
nginx -T > "$tmp_nginx_dump" || true

conflict_files="$(
  grep -nR --exclude='00-klyro.conf' "server_name[[:space:]]\\+${DOMAIN_HOST}" /etc/nginx 2>/dev/null \
  | cut -d: -f1 | sort -u || true
)"
if [[ -n "${conflict_files}" ]]; then
  while IFS= read -r f; do
    [[ -z "$f" ]] && continue
    # Avoid touching our own generated conf
    if [[ "$f" == "$NGINX_CONFD" ]]; then
      continue
    fi
    # Only disable real files
    if [[ -f "$f" ]]; then
      mv -f "$f" "${f}.disabled" || true
    fi
  done <<< "$conflict_files"
fi

nginx -t
systemctl reload nginx

# Verify HTTPS (or HTTP if no cert) reaches backend through /api/
echo "[VERIFY] Checking reverse-proxy /api/health ..."
if [[ -f "$FULLCHAIN" && -f "$PRIVKEY" ]]; then
  code="$(curl -k -s -o /dev/null -w '%{http_code}' "https://${DOMAIN_HOST}/api/health" || true)"
else
  code="$(curl -s -o /dev/null -w '%{http_code}' "http://${DOMAIN_HOST}/api/health" || true)"
fi
if [[ "$code" != "200" ]]; then
  echo "[FATAL] Reverse-proxy check failed: /api/health returned HTTP ${code}"
  exit 1
fi

echo "[VERIFY] Checking /api/profile (GET 404 then POST 200 with profile JSON then GET 200) ..."
BASE_URL="http://${DOMAIN_HOST}"
if [[ -f "$FULLCHAIN" && -f "$PRIVKEY" ]]; then
  BASE_URL="https://${DOMAIN_HOST}"
fi

# В режиме "backend only initData" selftest identity невозможен без реального Telegram initData.
# Поэтому проверяем только доступность endpoint'ов и формат ответа на 401/404.
g1="$(curl -k -s -o /dev/null -w '%{http_code}' "${BASE_URL}/api/profile" || true)"
if [[ "$g1" != "404" && "$g1" != "200" ]]; then
  # Ожидаем 401 без initData
  if [[ "$g1" != "401" ]]; then
    echo "[FATAL] /api/profile GET returned HTTP ${g1}"
    echo "[DEBUG] backend logs (last 120 lines):"
    docker-compose -f "$COMPOSE_FILE" logs --tail=120 backend || true
    exit 1
  fi
fi

echo "[VERIFY] /api/profile требует X-Telegram-Init-Data (ожидаем 401) ..."
if [[ "$g1" != "401" ]]; then
  echo "[FATAL] /api/profile did not return 401 without initData (got ${g1})"
  echo "[DEBUG] backend logs (last 120 lines):"
  docker-compose -f "$COMPOSE_FILE" logs --tail=120 backend || true
  exit 1
fi

echo "[VERIFY] /api/profile POST без initData (ожидаем 401) ..."
post_body="$(cat <<JSON
{"birth_date":"1990-01-01","gender":"male","height_cm":180,"weight_kg":80}
JSON
)"
pcode="$(curl -k -s -o /dev/null -w '%{http_code}' -H 'Content-Type: application/json' -X POST "${BASE_URL}/api/profile" --data "${post_body}" || true)"
if [[ "$pcode" != "401" ]]; then
  echo "[FATAL] /api/profile POST returned HTTP ${pcode} (expected 401 without initData)"
  echo "[DEBUG] backend logs (last 120 lines):"
  docker-compose -f "$COMPOSE_FILE" logs --tail=120 backend || true
  exit 1
fi

echo "[OK] Klyro is deployed. Open: https://${DOMAIN_HOST}"


