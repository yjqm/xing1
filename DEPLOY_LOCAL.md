# 本地部署说明（Agentic AI 互动教学平台 · 安全合并版 20261009）

> 由 WorkBuddy 于 2026-10-11 在本机完成部署。后端同源托管前端，单端口访问，无需跨域配置。

## 一、访问地址

| 页面 | 地址 |
| --- | --- |
| 首页 | http://localhost:3000/ |
| 主应用（课程/可视化/题库） | http://localhost:3000/app.html |
| 成就 | http://localhost:3000/achievements.html |
| 管理后台 | http://localhost:3000/admin.html |
| 健康检查 | http://localhost:3000/api/health |

未登录访问课程/成就等页面会被后端 302 重定向到登录页（安全合并版的设计），登录后可正常进入。

## 二、账号

| 项 | 值 |
| --- | --- |
| 管理员账号 | `admin` |
| 初始密码 | `Admin@2026` |
| 邮箱 | admin@local.dev |

- 用户名在 `server/.env` 的 `ADMIN_USERNAMES` 中列出的账号自动获得 admin 角色。
- 学生账号直接在首页注册即可（注册接口 `POST /api/auth/register`）。
- **上线前请修改管理员密码**，并为统一初始密码增加首次登录强制改密流程。

## 三、数据库（免安装版 MySQL 8.4.9）

本机没有预装 MySQL，且当前账户非管理员，因此采用官方免安装 ZIP 版，以普通进程方式运行，不写入 Program Files、不注册系统服务。

| 项 | 值 |
| --- | --- |
| 程序目录 | `C:\Users\Lenovo\.workbuddy\binaries\mysql\mysql-8.4.9-winx64` |
| 配置文件 | `C:\Users\Lenovo\.workbuddy\binaries\mysql\my.ini` |
| 数据目录 | `...\mysql-8.4.9-winx64\data` |
| 连接 | `127.0.0.1:3306`，用户 `root`，密码 `ic_local_2026` |
| 库名 | `interactive_classroom`（首次启动自动建库建表，13 张表） |

已启用 `mysql_native_password` 认证，兼容 Node `mysql2` 驱动。

## 四、手机访问

项目监听 `0.0.0.0:3000`，同一局域网内的手机可以直接用电脑的 IP 打开，前端请求走相对路径，无需额外配置。

**方式 A：手机与电脑连同一个 WiFi**

1. 双击 `phone-url.bat`（或 `python phone-url.py`）。
2. 脚本会检测服务、列出所有网卡 IP 并逐个探测连通性，把可访问的地址生成二维码页面 `phone-access.html` 并自动打开。
3. 手机扫码，或用浏览器打开页面上的地址。

**方式 B：手机开热点，电脑连上去**（校园网 / 公司网的 AP 隔离导致手机连不上电脑时用它）

1. 手机开启个人热点，电脑连接该热点。
2. 重新双击 `phone-url.bat` —— 脚本通过路由表取「上网出口 IP」，热点下会自动切换到热点网段的地址（Android 常见 `192.168.43.x`，iPhone 常见 `172.20.10.x`），二维码同步刷新。
3. 手机浏览器打开新地址即可。

排查：

- 地址必须带 `:3000`，且是 `http://`（浏览器自动补成 https 会失败）。
- 电脑若把热点识别为「公用网络」，Windows 防火墙可能拦截入站。在「设置 → 网络和 Internet → 属性」把网络类型改为「专用」。
- IP 由 DHCP 分配，换网络后会变，重新运行 `phone-url.bat` 即可拿到新地址。

## 五、启动 / 停止

- **启动**：双击项目根目录 `start-local.bat`
  - 依次拉起 MySQL（3306）→ Node 后端（3000）→ 自动打开浏览器
  - 已运行的端口会自动跳过，不会重复启动
- **停止**：双击 `stop-local.bat`
  - 关闭 3000 端口进程，并对 MySQL 执行 `mysqladmin shutdown` 优雅关闭

后端日志在启动后的 `IC-Backend` 窗口中查看；MySQL 日志在 `IC-MySQL` 窗口。

## 六、配置文件

`server/.env` 已生成本地配置（`JWT_SECRET` 为随机 64 位十六进制串）：

- `PORT=3000`、`DB_*`、`JWT_SECRET`、`JWT_EXPIRES_IN=7d`
- `COOKIE_SECURE=0`（纯 HTTP 本地访问，若改 HTTPS 需设为 1）
- `TRUST_PROXY=0`（无反向代理）
- `ADMIN_USERNAMES=admin`
- `LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL`：**留空**，AI 辅导与每日挑战的自动生成暂不可用，填写后可启用

`.env` 已在 `.gitignore` 中，不会被提交。

## 七、部署验证结果

- `/api/health` → 200
- MySQL 连接 → 正常，13 张表已建
- 注册接口 → 成功写入 `users` 表
- 登录接口 → 200，下发 HttpOnly Cookie `ic_token`，`/api/auth/me` 返回 admin 角色
- 带 Cookie 访问 `/app.html` → 200

## 八、注意事项

1. `server/public/` 是前端发布目录，由 `server/scripts/sync-public.js` 从仓库根目录生成。当前已是最新，若修改了根目录前端源码，需重新同步（注意该脚本会先删除 public 目录）。
2. 后端依赖已安装在 `server/node_modules`（使用了 `--ignore-scripts`，避免 postinstall 触发 public 目录重建）。
3. 若将来要对外提供服务：启用 HTTPS 后设 `COOKIE_SECURE=1`，经 Nginx 代理时设 `TRUST_PROXY=1`。
4. AI 功能需要有效的 `LLM_*` 配置才会工作。
