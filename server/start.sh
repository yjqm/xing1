#!/usr/bin/env bash
# 互动课堂后端启动脚本（Linux / Ubuntu 开发模式）
# 用法：./start.sh   （首次运行前先 chmod +x start.sh）

set -e
cd "$(dirname "$0")"

PORT="${PORT:-3000}"

# --- 端口占用检测：若后端已在运行则提示并退出 ---
if command -v ss >/dev/null 2>&1; then
  if ss -ltn 2>/dev/null | grep -q ":$PORT "; then
    echo "[info] Port $PORT is already in use - a backend instance is running."
    echo "       Just open the browser: http://localhost:$PORT/app.html"
    echo "       To restart, stop the old process first (e.g. kill it or pkill -f src/index.js)."
    exit 0
  fi
elif command -v lsof >/dev/null 2>&1; then
  if lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "[info] Port $PORT is already in use - a backend instance is running."
    echo "       Just open the browser: http://localhost:$PORT/app.html"
    exit 0
  fi
fi

echo "Syncing front-end files into server/public ..."
node scripts/sync-public.js

echo "Starting interactive-classroom backend (development mode)..."
echo "On first run it auto-creates the database and tables."
echo "Press Ctrl+C to stop."
echo

exec node src/index.js
