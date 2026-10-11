'use strict';

// 单独建库建表：node src/setup.js
// 也可直接启动服务（index.js 启动时会自动建表）。
const { initSchema } = require('./db');

initSchema()
  .then(() => { console.log('[setup] 完成'); process.exit(0); })
  .catch(e => { console.error('[setup] 失败:', e.message); process.exit(1); });
