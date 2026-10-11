'use strict';

const app = require('./app');
const config = require('./config');
const { initSchema, testConnection } = require('./db');
const { ensureDailyStats } = require('./controllers/communityController');

async function main() {
  if (config.isProduction && !config.jwtSecretConfigured) {
    throw new Error('生产环境必须配置长度至少 32 位的 JWT_SECRET');
  }
  if (!config.jwtSecretConfigured) {
    console.warn('[security] 未配置 JWT_SECRET，当前使用仅本次进程有效的开发密钥');
  }
  if (config.isProduction && !config.cookieSecure) {
    console.warn('[security] 生产环境 COOKIE_SECURE=0；启用 HTTPS 后应设置为 1');
  }
  // 启动即建表，确保账号/进度表存在
  try {
    await initSchema();
  } catch (e) {
    console.warn('[db] 初始化表失败（将继续启动，但数据库相关接口不可用）：', e.message);
  }

  try {
    const alive = await testConnection();
    console.log(alive ? '[db] MySQL 连接正常' : '[db] MySQL 连接异常');
  } catch (e) {
    console.warn('[db] 无法连接 MySQL：', e.message);
  }

  // 社区热度每日统计：每 10 分钟检查一次，跨天后自动重算帖子热度并落当天话题快照
  try {
    await ensureDailyStats();
  } catch (e) {
    console.warn('[community] 热度统计初始化失败：', e.message);
  }
  setInterval(function () {
    ensureDailyStats().catch(function (e) {
      console.warn('[community] 热度统计失败：', e.message);
    });
  }, 10 * 60 * 1000);

  app.listen(config.port, () => {
    console.log('[server] 互动课堂后端已启动: http://localhost:' + config.port);
    console.log('[server] 数据库: ' + config.db.user + '@' + config.db.host + ':' + config.db.port + '/' + config.db.database);
  });
}

main();
