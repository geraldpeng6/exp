#!/usr/bin/env bash
set -euo pipefail

REMOTE_DIR="/srv/feebea-blog"
DOMAIN="blog.feebea.com"
USER_NAME="ubuntu"

if [ ! -d "$REMOTE_DIR" ]; then
  echo "[INFO] Creating $REMOTE_DIR"
  sudo mkdir -p "$REMOTE_DIR"
  sudo chown -R "$USER_NAME":"$USER_NAME" "$REMOTE_DIR"
fi

cd "$REMOTE_DIR"

# Ensure pnpm
if ! command -v pnpm >/dev/null 2>&1; then
  echo "[INFO] Installing pnpm@9.12.3 globally via npm..."
  sudo npm i -g pnpm@9.12.3
fi

echo "[INFO] pnpm version: $(pnpm -v)"

# Install and build
if [ -f package.json ]; then
  echo "[INFO] Installing dependencies with pnpm..."
  pnpm install --frozen-lockfile
  echo "[INFO] Building Next.js project..."
  pnpm build
else
  echo "[ERROR] No package.json found in $REMOTE_DIR" >&2
  exit 1
fi

# Create systemd unit
SERVICE_FILE="/etc/systemd/system/feebea-blog.service"
SERVICE_CONTENT=$(cat <<EOS
[Unit]
Description=feebea blog (Next.js)
After=network.target

[Service]
Type=simple
User=$USER_NAME
WorkingDirectory=$REMOTE_DIR
Environment=NODE_ENV=production
Environment=NEXT_PUBLIC_SITE_URL=https://$DOMAIN
Environment=ALLOW_DISK_WRITE=1
ExecStart=/usr/bin/env node node_modules/next/dist/bin/next start -H 127.0.0.1 -p 3000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOS
)

echo "[INFO] Writing systemd service to $SERVICE_FILE"
echo "$SERVICE_CONTENT" | sudo tee "$SERVICE_FILE" >/dev/null

sudo systemctl daemon-reload
sudo systemctl enable --now feebea-blog
sleep 1
sudo systemctl status --no-pager feebea-blog || true

# Nginx vhost (HTTP only first)
NGINX_VHOST="/etc/nginx/conf.d/${DOMAIN}.conf"
VHOST_CONTENT=$(cat <<'EOS'
server {
    listen 80;
    server_name blog.feebea.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOS
)

echo "[INFO] Writing Nginx vhost to $NGINX_VHOST"
echo "$VHOST_CONTENT" | sudo tee "$NGINX_VHOST" >/dev/null

sudo nginx -t
sudo systemctl reload nginx

# Quick health check
set +e
curl -sSf -I http://127.0.0.1:3000 | head -n 1 || true
curl -sSf -I http://$DOMAIN | head -n 1 || true
set -e

echo "[INFO] Trying to issue HTTPS certificate via certbot"
if command -v certbot >/dev/null 2>&1; then
  sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m admin@feebea.com --redirect || true
  sudo nginx -t && sudo systemctl reload nginx
  curl -sSf -I https://$DOMAIN | head -n 1 || true
else
  echo "[WARN] certbot not installed; skipping HTTPS issuance"
fi

echo "[DONE] Deployment script completed."

