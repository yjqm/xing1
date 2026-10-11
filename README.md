# 互动课堂 · Interactive Classroom

一个面向数据结构与算法教学的交互式学习平台，提供 5 大数据结构（栈 Stack、队列 Queue、树 Tree、图 Graph、链表 List）可视化演示、Auto 可视化工具、代码运行实验室、题库练习与账号体系。

本目录是以马康乐部署版为主基线的安全合并版本。合并来源、取舍、安全约束、回滚提交和上线清单见 [MERGE_REPORT.md](MERGE_REPORT.md)。

## 技术栈

- **后端**：Node.js + Express + MySQL（账号 / JWT 登录 / 学习进度同步）
- **前端**：原生 HTML + CSS + JavaScript（单页应用 `app.html`）
- **可视化**：自研 Canvas/SVG 动画（`ds-viz/`、`py-viz/`）
- **代码运行**：`code-structure-viz/`（自包含单文件，C/C++ 可视化运行）

## 目录结构

```
interactive-classroom/
├── app.html                 # 主应用入口（单页应用）
├── app.js                   # 前端主逻辑
├── account.js               # 账号/登录前端逻辑
├── achievements-core.js     # 成就系统
├── ds-questions.js          # 题库
├── style.css                # 全局样式
├── ds-viz/                  # 数据结构可视化模块
│   ├── ds-basic-viz.js      #   栈/队列基础可视化
│   ├── ds-core-viz.js       #   核心可视化引擎
│   ├── tree-viz.js          #   树可视化
│   ├── algo-viz.js          #   算法可视化
│   ├── c-cpp-viz.js         #   C/C++ 可视化
│   ├── coding-lab.js        #   代码实验室
│   └── code-structure-viz/  #   代码实例结构可视化（index.html 为运行入口）
├── py-viz/                  # Python 可视化
├── vendor/                  # 第三方库（math.min.js 等）
├── docs/                    # 设计文档
└── server/                  # 后端（Node + Express + MySQL）
    ├── src/                 #   后端源码（app.js / controllers / routes / middleware）
    ├── scripts/sync-public.js  # 前端同步脚本（根目录 → server/public）
    ├── .env                 #   环境配置（含数据库密码/JWT密钥，勿提交）
    ├── start.bat / start.sh      #   本机/Ubuntu 启动脚本
    └── ecosystem.config.js  #   pm2 集群配置
```

## 快速开始

### 本机（Windows）

1. 确保本机已启动 MySQL，并准备 `server/.env`（复制 `server/.env.example` 改密码）
2. 双击 `start-all.bat`：自动启动后端（端口 3000）+ 前端静态服务（端口 8765）并打开浏览器
   - 或只启动后端：双击 `server/start.bat`，访问 `http://localhost:3000/app.html`

### Ubuntu 服务器

前置：先手动装好 Node.js 20 与 MySQL 8（命令见 `server/install.sh` 顶部注释），并给 MySQL root 设密码、允许 `127.0.0.1` 用密码登录。

1. `cd server && ./install.sh`：安装依赖（`npm install`）、生成 `.env`
2. 编辑 `server/.env`：填 `DB_PASSWORD`，把 `JWT_SECRET` 换成随机长字符串（`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`）；走 HTTPS 时设 `COOKIE_SECURE=1`、挂 Nginx 时设 `TRUST_PROXY=1`
3. 用 pm2 启动（推荐，开机自启、崩溃自动重启）：
   ```bash
   npm i -g pm2
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup   # 按提示执行生成的开机自启命令
   ```
   或前台运行：`./start-prod.sh`
4. 访问 `http://服务器公网IP:3000/app.html`（先在云控制台防火墙放行 3000 端口）

## 账号体系

- 注册 / 登录接口：`POST /api/auth/register`、`POST /api/auth/login`
- 学习进度：`/api/progress/*`（JWT 鉴权）
- 登录态通过 HttpOnly Cookie（`ic_token`）保存，同源部署单端口无需跨域配置

## 部署说明

- 前端源码在仓库根目录，部署时由 `sync-public.js` 同步到 `server/public/`（`npm run public`），使 `server/` 成为自包含部署单元
- 后端同源托管前端静态文件，根路径 `/` 重定向到 `/app.html`
- 数据库保留在本机 MySQL；上线数百用户规模建议调整 `server/src/config.js` 的 `connectionLimit`
- 敏感配置（`.env`）与 `server/public/` 已加入 `.gitignore`，不会提交到 Git

## 环境变量

见 `server/.env.example`：`PORT`、`DB_*`、`JWT_SECRET`、`FRONTEND_ORIGIN`、`TRUST_PROXY`、`COOKIE_SECURE`。
