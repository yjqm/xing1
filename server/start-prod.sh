#!/usr/bin/env bash
# 互动课堂后端启动脚本（Linux / Ubuntu 生产模式）
# 用法：./start-prod.sh   （首次运行前先 chmod +x start-prod.sh）
#
# 与 start.sh 的区别：设置 NODE_ENV=production。
# 注意：Cookie 是否仅 HTTPS 由 .env 的 COOKIE_SECURE 控制（1=仅HTTPS，0=纯HTTP），
#       与本脚本无关，所以无论前面是否挂 HTTPS 都能正常工作。

set -e
cd "$(dirname "$0")"

export NODE_ENV=production

PORT="${PORT:-3000}"

if command -v ss >/dev/null 2>&1; then
  if ss -ltn 2>/dev/null | grep -q ":$PORT "; then
    echo "[info] Port $PORT is already in use - a backend instance is running."
    echo "       Just open the browser: http://localhost:$PORT/app.html"
    exit 0
  fi
elif command -v lsof >/dev/null 2>&1; then
  if lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "[info] Port $PORT is already in use - a backend instance is running."
    exit 0
  fi
fi

echo "Syncing front-end files into server/public ..."
node scripts/sync-public.js

echo "Starting interactive-classroom backend (production mode)..."
echo "On first run it auto-creates the database and tables."
echo "Press Ctrl+C to stop."
echo

exec node src/index.js
