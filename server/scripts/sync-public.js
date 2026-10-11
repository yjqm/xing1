'use strict';

/**
 * 前端发布同步脚本
 * 把仓库根目录（前端源码）同步到 server/public，使 server/ 成为自包含的部署单元。
 *
 * 用法：
 *   node scripts/sync-public.js     （或 npm run public）
 *
 * 部署到服务器：
 *   在本地执行一次 npm run public → 把整个 server/ 目录上传到 Windows 服务器即可
 *   （服务器上可能没有仓库根目录；脚本检测不到前端源码时会自动跳过，不报错）。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');       // 仓库根（前端源码）
const PUBLIC = path.resolve(__dirname, '..', 'public'); // 部署静态目录

// 需要同步的前端顶层条目（文件或目录）
const INCLUDE = [
  'index.html',
  'app.html',
  'admin.html',
  'achievements.html',
  'app.js',
  'chapter-covers.js',
  'custom-cursor.js',
  'custom-cursor.css',
  'account.js',
  'community.js',
  'interact.js',
  'la_fallback.js',
  'la_viz_extra.js',
  'la_viz_pro.js',
  'la_interact.js',
  'la_predict.js',
  'la_formula.js',
  'la_guide.js',
  'la_styles.css',
  'role-center.js',
  'role-center.css',
  'learning-tools.js',
  'learning-tools.css',
  'ui-polish.js',
  'ui-polish.css',
  'mobile-optimizations.css',
  'achievements-core.js',
  'ds-questions.js',
  'leader-line.min.js',
  'style.css',
  'py-viz',
  'ds-viz',
  'algorithm-visualizer',
  'assets',
  'vendor'
];

function main() {
  const srcMarker = path.join(ROOT, 'app.html');
  if (!fs.existsSync(srcMarker)) {
    console.log('[public] 未找到仓库根前端源码，跳过同步（假定 public 已为最新发布产物）');
    console.log('[public]   期望源码位置: ' + ROOT);
    return;
  }

  fs.rmSync(PUBLIC, { recursive: true, force: true });
  fs.mkdirSync(PUBLIC, { recursive: true });

  let copied = 0;
  let skipped = 0;
  for (const item of INCLUDE) {
    const from = path.join(ROOT, item);
    const to = path.join(PUBLIC, item);
    if (!fs.existsSync(from)) {
      console.log('[public] 跳过（源不存在）: ' + item);
      skipped += 1;
      continue;
    }
    fs.cpSync(from, to, { recursive: true });
    copied += 1;
  }

  console.log('[public] 前端资源已同步 → ' + PUBLIC + '（拷贝 ' + copied + ' 项，跳过 ' + skipped + ' 项）');
}

main();
