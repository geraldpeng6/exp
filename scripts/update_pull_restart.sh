#!/usr/bin/env bash
set -euo pipefail

# 安全的 git pull -> 安装依赖 -> 构建 -> 重启 脚本
# 用法:
#   chmod +x scripts/update_pull_restart.sh
#   ./scripts/update_pull_restart.sh [systemd:<service>|pm2:<name>|none] [port] [branch]
# 示例:
#   ./scripts/update_pull_restart.sh systemd:feebea-blog 3000
#   ./scripts/update_pull_restart.sh pm2:minimal-blog 3000
#   ./scripts/update_pull_restart.sh none 3000 main

MODE_ARG=${1:-"none"}
PORT_ARG=${2:-"3000"}
BRANCH_ARG=${3:-""}

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

step() { printf "\n[STEP] %s\n" "$*"; }
info() { printf "[INFO] %s\n" "$*"; }
warn() { printf "[WARN] %s\n" "$*" 1>&2; }
fail() { printf "[FAIL] %s\n" "$*" 1>&2; exit 1; }

step "工作目录: $ROOT_DIR"

# 1) Git 更新（保留本地修改，自动 rebase）
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
if [ -z "$CURRENT_BRANCH" ]; then
  fail "当前目录不是 Git 仓库"
fi

if [ -n "$BRANCH_ARG" ] && [ "$BRANCH_ARG" != "$CURRENT_BRANCH" ]; then
  warn "切换分支: $CURRENT_BRANCH -> $BRANCH_ARG"
  git fetch --all --prune
  git checkout "$BRANCH_ARG"
  CURRENT_BRANCH="$BRANCH_ARG"
fi

step "Git 同步: origin/$CURRENT_BRANCH"
# 尽量安全：先获取、自动清理远端、rebase + autostash
git fetch --all --prune
if git rev-parse --verify "origin/$CURRENT_BRANCH" >/dev/null 2>&1; then
  git pull --rebase --autostash origin "$CURRENT_BRANCH"
else
  warn "远端不存在 origin/$CURRENT_BRANCH，跳过 pull"
fi

# 2) 子模块（如无则跳过）
if [ -f .gitmodules ]; then
  step "更新子模块"
  git submodule update --init --recursive
fi

# 3) 安装依赖
step "安装依赖 (pnpm)"
if command -v pnpm >/dev/null 2>&1; then
  pnpm install --frozen-lockfile || pnpm install
else
  fail "未检测到 pnpm，请先安装：npm i -g pnpm"
fi

# 4) 构建（Next.js）
step "构建生产版本"
# 确保构建/运行在局域网可访问的 Host/Port（运行阶段也会传递）
export HOST=0.0.0.0
export PORT="$PORT_ARG"
pnpm build

# 5) 重启服务
step "重启服务: $MODE_ARG"
case "$MODE_ARG" in
  systemd:*)
    SVC_NAME="${MODE_ARG#systemd:}"
    info "使用 systemd 重启: $SVC_NAME"
    if command -v systemctl >/dev/null 2>&1; then
      sudo systemctl daemon-reload || true
      sudo systemctl restart "$SVC_NAME"
      sudo systemctl status --no-pager "$SVC_NAME" || true
    else
      fail "未检测到 systemctl，请确认系统支持 systemd 或改用 pm2 模式"
    fi
    ;;
  pm2:*)
    APP_NAME="${MODE_ARG#pm2:}"
    if command -v pm2 >/dev/null 2>&1; then
      info "使用 PM2 重启: $APP_NAME (0.0.0.0:$PORT_ARG)"
      # 尝试重启；不存在则以 pnpm start 启动，绑定 0.0.0.0
      pm2 restart "$APP_NAME" || pm2 start pnpm --name "$APP_NAME" -- start -- -H 0.0.0.0 -p "$PORT_ARG"
      pm2 save || true
      pm2 ls || true
    else
      fail "未检测到 PM2，请先安装：npm i -g pm2"
    fi
    ;;
  none)
    info "已完成更新与构建，未执行进程管理重启。"
    echo "可手动启动：pnpm start -- -H 0.0.0.0 -p $PORT_ARG"
    ;;
  *)
    fail "未知模式：$MODE_ARG。使用 systemd:<service> / pm2:<name> / none"
    ;;
 esac

printf "\n完成。\n"

