#!/usr/bin/env bash
set -euo pipefail

# This script prepares and runs the blog service on the remote host.
# - Installs nvm+Node 20 for the current user if missing
# - Ensures pnpm 9.x is available
# - Installs & builds the project in /srv/feebea-blog
# - Creates a start script that sources nvm and runs Next.js on 127.0.0.1:3000
# - Creates a systemd service feebea-blog
# - Adds an Nginx HTTP (80) server for blog.feebea.com and reloads Nginx
# - Note: HTTPS certificate issuance (certbot) is left for a next step.

REMOTE_DIR="/srv/feebea-blog"
DOMAIN="blog.feebea.com"
USER_NAME="$(id -un)"

# 1) Ensure nvm + Node 20
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  echo "[INFO] Installing nvm..."
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
fi
# shellcheck source=/dev/null
. "$NVM_DIR/nvm.sh"

if ! command -v node >/dev/null 2>&1; then
  echo "[INFO] Installing Node.js 20..."
  nvm install 20
  nvm alias default 20
else
  echo "[INFO] Node already present: $(node -v)"
  nvm install 20 >/dev/null 2>&1 || true
  nvm alias default 20 >/dev/null 2>&1 || true
fi

echo "[INFO] Using Node: $(node -v)"

# 2) Ensure pnpm 9.x
if ! command -v pnpm >/dev/null 2>&1; then
  echo "[INFO] Installing pnpm@9.12.3 globally..."
  npm i -g pnpm@9.12.3
fi

echo "[INFO] pnpm version: $(pnpm -v)"

# 3) Install & build project
cd "$REMOTE_DIR"

# Don't overwrite user's .env.local; build will read env at runtime via start.sh

echo "[INFO] Installing dependencies..."
pnpm install --frozen-lockfile

echo "[INFO] Building project..."
pnpm build

# 4) Create start script
START_SH="$REMOTE_DIR/start.sh"
cat > "$START_SH" <<'EOS'
#!/usr/bin/env bash
set -e
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
cd /srv/feebea-blog
export NODE_ENV=production
export NEXT_PUBLIC_SITE_URL=https://blog.feebea.com
export ALLOW_DISK_WRITE=1
exec node node_modules/next/dist/bin/next start -H 127.0.0.1 -p 3000
EOS
chmod +x "$START_SH"

echo "[INFO] Created start script at $START_SH"

# 5) Create systemd service
SERVICE_FILE="/etc/systemd/system/feebea-blog.service"
if [ -w "$SERVICE_FILE" ] || sudo -n true 2>/dev/null; then
  echo "[INFO] Writing systemd unit $SERVICE_FILE"
  sudo -n tee "$SERVICE_FILE" >/dev/null <<EOS
[Unit]
Description=feebea blog (Next.js)
After=network.target

[Service]
Type=simple
User=$USER_NAME
WorkingDirectory=$REMOTE_DIR
ExecStart=$START_SH
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOS
  echo "[INFO] Enabling and starting service..."
  sudo -n systemctl daemon-reload
  sudo -n systemctl enable --now feebea-blog
else
  echo "[WARN] sudo without password not available; please install unit manually." >&2
fi

# 6) Add Nginx HTTP vhost for DOMAIN and reload (HTTPS will be added later)
NGINX_VHOST="/etc/nginx/conf.d/${DOMAIN}.conf"
if sudo -n true 2>/dev/null; then
  echo "[INFO] Writing Nginx vhost $NGINX_VHOST (port 80 only for now)"
  sudo -n tee "$NGINX_VHOST" >/dev/null <<'EOS'
server {
    listen 80;
    server_name blog.feebea.com;

    # Proxy to local Next.js
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
  echo "[INFO] Testing and reloading Nginx..."
  sudo -n nginx -t
  sudo -n systemctl reload nginx
else
  echo "[WARN] Cannot modify Nginx without sudo access." >&2
fi

# 7) Health checks
set +e
curl -sSf -I http://127.0.0.1:3000 | head -n 1 || true
curl -sSf -I http://$DOMAIN | head -n 1 || true
set -e

echo "[DONE] Remote setup completed. Next step: issue HTTPS cert with certbot --nginx -d $DOMAIN"

