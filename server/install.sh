#!/usr/bin/env bash
# 互动课堂 Ubuntu 服务器一键安装脚本
# 用途：在已装好 Node.js 与 MySQL 的 Ubuntu 服务器上，完成依赖安装、.env 引导、启动。
#
# 用法（在 server/ 目录内执行）：
#   chmod +x install.sh
#   ./install.sh
#
# 前置条件（本脚本不负责安装，请先手动完成）：
#   1) Node.js LTS：  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs
#   2) MySQL 8：      sudo apt-get install -y mysql-server
#      并设置 root 密码（Ubuntu 默认 root 走 socket 认证，需手动改）：
#         sudo mysql
#         ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '你的密码';
#         FLUSH PRIVILEGES; EXIT;
#      然后允许 root 用密码从本机登录：DB_HOST=127.0.0.1 时还需：
#         CREATE USER IF NOT EXISTS 'root'@'127.0.0.1' IDENTIFIED BY '你的密码';
#         GRANT ALL PRIVILEGES ON *.* TO 'root'@'127.0.0.1' WITH GRANT OPTION;
#         FLUSH PRIVILEGES;
set -e
cd "$(dirname "$0")"

echo "================================================"
echo "  Interactive Classroom - Ubuntu Installer"
echo "================================================"
echo

# --- 1. 检查 Node / npm ---
if ! command -v node >/dev/null 2>&1; then
  echo "[x] 未检测到 Node.js，请先安装 Node.js LTS 再运行本脚本。"
  exit 1
fi
echo "[ok] Node.js: $(node -v)"

if ! command -v npm >/dev/null 2>&1; then
  echo "[x] 未检测到 npm，请先安装 npm。"
  exit 1
fi
echo "[ok] npm: $(npm -v)"
echo

# --- 2. 安装依赖 ---
echo "[1/3] Installing dependencies (npm install)..."
npm install --omit=dev
echo

# --- 3. 引导 .env ---
if [ -f ".env" ]; then
  echo "[2/3] .env 已存在，跳过（如需重配请手动编辑 .env）。"
else
  cp .env.example .env
  echo "[2/3] 已生成 .env（复制自 .env.example）。"
  echo "       请编辑 .env，至少修改："
  echo "         - DB_PASSWORD   服务器 MySQL root 密码"
  echo "         - JWT_SECRET    换成随机长字符串（生成命令见 .env 内注释）"
  echo "         - COOKIE_SECURE 若走 HTTPS 设为 1，纯 HTTP 保持 0"
  echo "       编辑命令：nano .env"
  echo
  echo "       （请编辑完成后，重新运行 ./start-prod.sh 或 pm2 启动）"
fi
echo

# --- 4. 提示启动方式 ---
echo "[3/3] 安装完成。启动方式（二选一）："
echo "   方式A（简单，前台跑）:  ./start-prod.sh"
echo "   方式B（推荐，守护进程）:"
echo "       npm i -g pm2"
echo "       pm2 start ecosystem.config.js"
echo "       pm2 save"
echo "       pm2 startup   # 按提示执行生成的开机自启命令"
echo
echo "启动后访问: http://服务器IP:3000/app.html"
echo "（记得在云控制台防火墙放行 3000 端口）"
