#!/usr/bin/env bash
set -euo pipefail

cd /srv/feebea-blog

# Ensure pnpm is available
if ! command -v pnpm >/dev/null 2>&1; then
  echo "[INFO] Installing pnpm@9.12.3 via npm..."
  sudo npm i -g pnpm@9.12.3
fi

echo "[INFO] Versions:"
pnpm -v || true
node -v || true
node -p "process.versions.modules" || true

# Clean any previous native build artifacts of better-sqlite3
set -x
rm -rf node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3/build || true
rm -rf node_modules/better-sqlite3/build || true
set +x

# Rebuild native module to match current Node ABI
echo "[INFO] Rebuilding better-sqlite3..."
if ! pnpm rebuild better-sqlite3 --verbose; then
  echo "[WARN] Targeted rebuild failed, running full pnpm rebuild"
  pnpm rebuild
fi

# Restart service
sudo systemctl restart feebea-blog
sleep 1
sudo systemctl status --no-pager feebea-blog | sed -n '1,50p' || true

# Health checks
echo "[INFO] Local health check:"
curl -sS -i http://127.0.0.1:3000/api/health | head -n 20 || true

echo "[INFO] Public health check:"
curl -sS -i https://blog.feebea.com/api/health | head -n 20 || true

