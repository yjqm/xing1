'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const { attachUser } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const progressRoutes = require('./routes/progress');
const communityRoutes = require('./routes/community');
const learningRoutes = require('./routes/learning');
const teacherRoutes = require('./routes/teacher');
const adminRoutes = require('./routes/admin');
const aiRoutes = require('./routes/ai');

const app = express();

// 处于反向代理（nginx / IIS ARR / 云负载均衡）之后时，在 .env 设 TRUST_PROXY=1，
// 使 req.ip 与登录限流能取到真实客户端 IP；Node 直接暴露公网时保持 0（防伪造头绕过限流）。
if (config.trustProxy) {
  app.set('trust proxy', 1);
}

// 基础安全头（关闭 CSP 以免干扰前端内联脚本）
app.use(helmet({ contentSecurityPolicy: false }));

// 社区附件上传走 base64 JSON，需要更大的请求体上限。
// 必须在全局 express.json() 之前挂载：body-parser 解析过一次后，后续解析器会自动跳过。
app.use('/api/community/upload', express.json({ limit: '12mb' }));
app.use(express.json());

// 同域部署时前端通过 fetch 带 cookie 调用，需要 credentials。
// 开发环境：允许 localhost / 127.0.0.1 任意端口 + .env 配置的 FRONTEND_ORIGIN。
function isAllowedOrigin(origin) {
  if (config.frontendOrigin && origin === config.frontendOrigin) return true;
  try {
    const host = new URL(origin).hostname;
    return host === 'localhost' || host === '127.0.0.1';
  } catch (e) {
    return false;
  }
}
app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true); // 非浏览器请求（curl/内部调用）不做跨域限制
    cb(null, isAllowedOrigin(origin) ? origin : false);
  },
  credentials: true
}));

app.use(cookieParser());

// 所有请求先尝试解析登录态（失败不影响匿名访问）
app.use(attachUser);

// ---- 同源部署：由后端直接托管前端页面（单端口，规避 CORS 与 Cookie 跨源问题）----
// 前端静态文件来自 server/public（由 `npm run public` 从仓库根同步）。
// 后端源码位于 server/src，不在静态目录内，不会通过静态服务暴露。
app.use((req, res, next) => {
  const p = req.path.toLowerCase();
  if (p.startsWith('/.') || p.endsWith('.env') || p.endsWith('.bat') || p.endsWith('.sh') ||
      p === '/package.json' || p === '/package-lock.json') {
    return res.status(404).end();
  }
  next();
});

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// 课程与管理页面必须登录后访问。前端跳转只能改善体验，真正的访问限制在这里执行。
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  const p = req.path.toLowerCase();
  const protectedPage =
    p === '/app' || p === '/app.html' ||
    p === '/admin' || p === '/admin.html' ||
    p === '/achievements' || p === '/achievements.html' ||
    p.startsWith('/algorithm-visualizer/') ||
    p.startsWith('/ds-viz/') ||
    p.startsWith('/py-viz/');
  if (!protectedPage || req.user) return next();
  const nextPath = encodeURIComponent(req.originalUrl || '/app.html');
  return res.redirect('/?login=required&next=' + nextPath);
});

app.use(express.static(PUBLIC_DIR, { extensions: ['html'], index: false }));

// 社区附件静态目录（server/uploads，独立于 public，重建前端不会丢）
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
try { fs.mkdirSync(path.join(UPLOAD_DIR, 'community'), { recursive: true }); } catch (e) {}
app.use('/uploads', express.static(UPLOAD_DIR, { index: false, maxAge: '7d' }));

// 根路径 → 导航首页 index.html；若该文件不存在（旧发布产物）则回退到主应用
app.get('/', (req, res) => {
  const indexPath = path.join(PUBLIC_DIR, 'index.html');
  if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
  return res.redirect('/app.html');
});

// 登录/注册接口限流，缓解暴力破解
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '请求过于频繁，请稍后再试' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

const aiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI 请求过于频繁，请稍后再试' }
});
app.use('/api/ai', aiLimiter);

// 健康检查（不依赖数据库）
app.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);

// 兜底错误处理
app.use((err, req, res, next) => {
  console.error('[server] unhandled error:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

module.exports = app;
