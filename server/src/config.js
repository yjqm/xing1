'use strict';

const path = require('path');
const crypto = require('crypto');

require('dotenv').config();

const configuredJwtSecret = process.env.JWT_SECRET || '';

/**
 * 集中配置。数据库连接信息从环境变量 / .env 读取。
 * 本机 MySQL 5.5 已运行于 127.0.0.1:3306，请将 .env 中的 DB_PASSWORD
 * 改成你本机 MySQL 的密码（详见 .env.example）。
 */
const config = {
  port: parseInt(process.env.PORT || '3000', 10),

  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'interactive_classroom',
    charset: 'utf8mb4',
    // 连接池大小：本机开发 10 够用；200~400 人并发建议 30。
    connectionLimit: 30,
    waitForConnections: true,
    timezone: 'local'
  },

  // JWT 签名密钥（生产环境务必改成随机长字符串，可用 `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` 生成）
  // 未配置时仅为本次开发进程生成临时密钥；生产环境会在启动前强制校验。
  jwtSecret: configuredJwtSecret || crypto.randomBytes(48).toString('hex'),
  jwtSecretConfigured: configuredJwtSecret.length >= 32,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  isProduction: process.env.NODE_ENV === 'production',

  // 写入浏览器的 Cookie 名称
  cookieName: 'ic_token',

  // 前端域名（用于设置 Cookie 的 sameSite / domain；同域部署时留空即可）
  frontendOrigin: process.env.FRONTEND_ORIGIN || '',

  // 是否信任第一跳反向代理（nginx / IIS / 云负载均衡）。
  // 部署在代理后时 .env 设 TRUST_PROXY=1，使 req.ip 与登录限流取到真实客户端 IP；
  // Node 直接暴露公网端口时保持 0（防止攻击者伪造 X-Forwarded-For 绕过限流）。
  trustProxy: process.env.TRUST_PROXY === '1',

  // Cookie 是否只在 HTTPS 下发送。
  // 走 HTTPS（或云负载均衡 TLS 终止）时 .env 设 COOKIE_SECURE=1；
  // 纯 HTTP 临时访问时保持 0，否则登录 Cookie 无法写入浏览器。
  cookieSecure: process.env.COOKIE_SECURE === '1',

  // 生产环境首批管理员账号。多个用户名以英文逗号分隔；不要在代码中写默认密码。
  adminUsernames: (process.env.ADMIN_USERNAMES || '')
    .split(',')
    .map(function (name) { return name.trim(); })
    .filter(Boolean),

  // 社区附件（图片/文档）落盘目录：server/uploads（不随 public 重建而清空）
  uploadDir: path.resolve(__dirname, '..', 'uploads'),

  // 服务端 LLM 配置：供 AI 辅导和「每日挑战」使用。
  // 密钥只允许放在服务器环境变量中，绝不能写进前端文件或同步到用户数据。
  llm: {
    apiKey: process.env.LLM_API_KEY || '',
    baseUrl: process.env.LLM_BASE_URL || '',
    model: process.env.LLM_MODEL || ''
  }
};

module.exports = config;
