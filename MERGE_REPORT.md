# 互动教学平台安全合并说明

合并日期：2026-09-27  
主基线：马康乐本地部署版  
合并工作目录：独立 Git 仓库；四份原始目录均未修改

## 已合并内容

### 马康乐版本（主基线）

- Node.js + Express + MySQL 生产结构
- JWT HttpOnly Cookie 登录、注册、资料、密码和注销
- 学习进度云端同步、社区、附件、每日挑战
- React/Vite 代码结构可视化子项目
- `server/public` 自包含部署流程

### GitHub 线上版本

- 合并基线之后的 6 个提交
- 修复 Python 可视化脚本问题
- Python 预测输出挑战、Canvas 点击推进、键盘快捷键和概念翻牌卡
- C/C++ 内存练习悬浮窗、拖拽与缩放

### 个人线性代数版本

- 36 个线性代数可视化标识对应的专属/兜底渲染
- Canvas 拖拽参数、预测—验证挑战、概念翻转、导学卡片
- 公式渲染、线代徽章和课程进度面板
- 进度改为复用主基线的学习状态和账号同步

未加载旧版 `la_user.js`：它使用 localStorage 保存账号并包含默认管理员逻辑，与生产账号系统冲突且不适合上线。

### 李赫版本

- `algorithm-visualizer/`：排序、查找、DFS/BFS、N 皇后及 C++ 轨迹页面
- 主站算法页面提供独立入口
- 会编译执行用户 C++ 的服务放在 `tools/algorithm-runtime/`，不会进入 `server/public`
- 运行服务默认拒绝启动，仅能通过显式环境变量在隔离的本机开发环境启用

### 周文宇版本

- 将学习事件、教师统计、学生详情和管理员角色调整迁移到现有 Node/MySQL
- 增加 `student`、`teacher`、`admin` 角色，不启用冲突的 FastAPI/SQLite 账号服务
- 增加 Ctrl/Cmd+K 全局命令面板、章节导航、知识图谱
- 增加公式实验室模板、计算历史和复制结果

## 安全决策

- 没有复制任何 `.env`，仓库继续忽略 `server/.env`。
- 没有复制原版本中硬编码的前端 AI 凭据。
- 生产环境未设置至少 32 位 `JWT_SECRET` 时，服务器会拒绝启动。
- 管理员通过 `ADMIN_USERNAMES` 环境变量声明，不提供默认管理员密码。
- C++ 原生编译服务不接入公网 Node API；公网启用前必须增加容器隔离和资源限制。
- 马康乐版本已移除的旧数据结构演示文件保持删除状态，避免重复脚本和全局 CSS 冲突。

## 部署前配置

```powershell
cd server
Copy-Item .env.example .env
npm ci
npm run public
npm run setup
npm start
```

至少修改 `.env` 中的：

- `NODE_ENV=production`
- `DB_HOST`、`DB_PORT`、`DB_USER`、`DB_PASSWORD`、`DB_NAME`
- `JWT_SECRET`：长度至少 32 位的随机值
- `ADMIN_USERNAMES`：逗号分隔的管理员用户名
- 使用 HTTPS 时设置 `COOKIE_SECURE=1`
- 反向代理部署时按实际情况设置 `TRUST_PROXY=1` 和 `FRONTEND_ORIGIN`

## 回滚节点

- `06ac0f1`：马康乐部署版原样快照
- `cda412e`：合并 GitHub 6 个后续提交
- `4df6212`：线性代数增强
- `8dcb4cf`：李赫算法子应用
- `780bef3`：教师/管理员与学习分析
- `d061b46`：快捷命令、知识图谱与实验历史

## 已执行验证

- 所有新增/修改 JavaScript 通过 `node --check`
- Python 运行服务通过 AST 语法解析
- Express 应用在依赖可用时可完整加载，检测到 6 组 API 路由
- `server/public` 可由同步脚本完整重建
- 浏览器实测主站无控制台错误
- 浏览器实测线性代数 6 章 35 个知识点、导学卡、参数交互、预测挑战
- 浏览器实测 Ctrl/Cmd+K、知识图谱、公式模板和算法动画

## 上线前仍需在真实服务器验证

- 使用实际 MySQL 账号执行 schema 初始化与迁移
- 创建配置在 `ADMIN_USERNAMES` 中的管理员并验证角色管理
- 使用 HTTPS 域名验证 Cookie、CORS 和反向代理头
- 对 200–400 人并发目标做 API 与数据库连接池压测
- 如需公网代码运行，先实现容器级沙箱；当前仅允许本机开发用途
