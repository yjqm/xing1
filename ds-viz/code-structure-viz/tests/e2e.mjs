// 数据结构可视化平台 —— 端到端测试（puppeteer-core + 系统 Edge/Chrome 无头）
// 运行：npm test（会自动启动 vite dev server，跑完自动关闭）
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);
const BASE = 'http://localhost:5173/';
const PORT = 5173;

// ---- 查找 puppeteer-core（优先项目依赖，其次受管运行时） ----
const PUPPETEER_CANDIDATES = [
  path.join(ROOT, 'node_modules', 'puppeteer-core'),
  'C:/Users/n/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core',
];
let puppeteer = null;
for (const c of PUPPETEER_CANDIDATES) { try { puppeteer = require(c); break; } catch { /* next */ } }
if (!puppeteer) { console.error('✗ 未找到 puppeteer-core。请先在项目根执行：npm i -D puppeteer-core'); process.exit(1); }

// ---- 查找浏览器 ----
const BROWSER_CANDIDATES = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
];
const executablePath = BROWSER_CANDIDATES.find(p => fs.existsSync(p));
if (!executablePath) { console.error('✗ 未找到 Edge/Chrome'); process.exit(1); }

// ---- 测试框架 ----
let passed = 0, failed = 0;
const results = [];
async function test(name, fn) {
  try { await fn(); passed++; results.push({ name, ok: true }); console.log('  ✓ ' + name); }
  catch (e) { failed++; results.push({ name, ok: false, error: e.message }); console.log('  ✗ ' + name + '\n    → ' + e.message); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || '断言失败'); }
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

// ---- server 管理 ----
async function isUp() { try { const r = await fetch(BASE); return r.status < 500; } catch { return false; } }
async function waitUp(timeoutMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) { if (await isUp()) return true; await wait(300); }
  return false;
}

let server = null;
if (!(await isUp())) {
  server = spawn(process.execPath, [path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(PORT)], { cwd: ROOT, stdio: 'ignore' });
  if (!(await waitUp(20000))) { console.error('✗ dev server 启动超时'); if (server) server.kill(); process.exit(1); }
  console.log('· 已启动 vite dev server');
} else {
  console.log('· 复用已运行的 dev server');
}

// ---- 主流程 ----
let browser = null, page = null;
const pageErrors = [];
try {
  browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-features=TrackingPrevention'],
  });
  page = await browser.newPage();
  page.on('pageerror', e => pageErrors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') { const t = m.text(); if (!t.includes('ERR_CONNECTION_RESET')) pageErrors.push('CONSOLE: ' + t); } });

  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForFunction(() => typeof addStruct !== 'undefined' && typeof startRecord !== 'undefined' && typeof parseAutoScript !== 'undefined', { timeout: 50000 });

  await test('页面加载：核心模块就绪', async () => {
    const ok = await page.evaluate(() => typeof addStruct === 'function' && typeof generateCCode === 'function' && typeof autoTreeRemove === 'function');
    assert(ok, '核心函数未就绪');
  });

  await test('手动操作：栈 入栈/出栈 状态正确', async () => {
    const r = await page.evaluate(async () => {
      addStruct('stack');
      addElement('10'); addElement('20');
      const s = state.play.structs.find(x => x.kind === 'stack');
      commitPick(s, state.play.elements.find(e => e.label === '10'), { mode: 'push' });
      commitPick(s, state.play.elements.find(e => e.label === '20'), { mode: 'push' });
      const after2 = s.items.length;
      s.items.pop();  // 模拟出栈
      return { after2, afterPop: s.items.length };
    });
    assert(r.after2 === 2 && r.afterPop === 1, JSON.stringify(r));
  });

  await test('自动可视化：解析示例代码，结构类型自动推断', async () => {
    const r = await page.evaluate(() => {
      const res = parseAutoScript('Stack s;\npush(s, 10);\npush(s, x);\npop(s);\nQueue q;\nenqueue(q, 1);');
      return { decls: res.decls.map(d => d.kind + ':' + d.name), steps: res.steps.length, skipped: res.skipped };
    });
    assert(r.decls.length === 2 && r.steps === 4, JSON.stringify(r));
  });

  await test('自动可视化：未定义变量提示输入并复用', async () => {
    const r = await page.evaluate(() => {
      const res = parseAutoScript('Stack s;\npush(s, x);\npush(s, x);');
      return { decls: res.decls, steps: res.steps.map(st => st.op) };
    });
    assert(r.decls[0].kind === 'stack' && r.steps.length === 2, JSON.stringify(r));
  });

  await test('记录模式：图 增删节点/边 + 移除结构 + 丢弃元素 完整记录', async () => {
    const r = await page.evaluate(() => {
      startRecord();
      addStruct('graph');
      addElement('A'); addElement('B'); addElement('C');
      const g = state.play.structs.find(s => s.kind === 'graph');
      commitPick(g, state.play.elements.find(e => e.label === 'A'), { mode: 'graphNode' });
      commitPick(g, state.play.elements.find(e => e.label === 'B'), { mode: 'graphNode' });
      g.connect = true;
      onGraphNodeClick(g, g.nodes[0]);
      onGraphNodeClick(g, g.nodes[1]);          // addEdge A-B
      removeGraphNode(g, g.nodes[1].id);        // removeNode B
      removeElement(state.play.elements.find(e => e.label === 'C').id);  // drop C
      removeStruct(g.id);                       // destroy graph
      const ops = state.record.ops.map(o => o.t);
      const code = generateCCode();
      return { ops, hasRemoveNode: code.includes('removeNode'), hasDrop: ops.includes('drop'), hasDestroy: ops.includes('destroy') };
    });
    assert(r.ops.includes('addEdge') && r.ops.includes('removeNode') && r.hasDrop && r.hasDestroy, JSON.stringify(r.ops));
    assert(r.hasRemoveNode, '生成代码缺少 removeNode');
  });

  await test('记录模式：生成代码包含 scanf 数据输入', async () => {
    const code = await page.evaluate(() => {
      state.record.ops = [
        { t: 'input', var: 'v1', value: '10' },
        { t: 'create', kind: 'stack', var: 's1' },
        { t: 'push', var: 's1', value: 'v1', raw: '10' },
      ];
      return generateCCode();
    });
    assert(code.includes('scanf("%d", &v1)') && code.includes('push(&s1, v1)'), 'scanf 或变量引用缺失');
  });

  await test('树：标准 BST 删除（双子女节点用后继替换）', async () => {
    const r = await page.evaluate(() => {
      const s = { id: 'x', kind: 'tree', label: 't', nodes: [], nextNodeId: 1 };
      const vals = [50, 30, 70, 20, 40, 60, 80];
      state.play.elements = vals.map(v => ({ id: 'e' + v, label: String(v), color: '#fff' }));
      vals.forEach(v => autoTreeInsert(s, 'e' + v, String(v)));
      autoTreeRemove(s, '50', { silent: true });   // 删根（双子）
      const root = s.nodes.find(n => n.side === 'root');
      const labels = s.nodes.map(n => elementById(n.elId).label);
      return {
        count: s.nodes.length,
        rootLabel: elementById(root.elId).label,
        count60: labels.filter(l => l === '60').length,
        count50: labels.filter(l => l === '50').length,
      };
    });
    assert(r.count === 6 && r.rootLabel === '60' && r.count60 === 1 && r.count50 === 0, JSON.stringify(r));
  });

  await test('无 JS 错误', async () => {
    assert(pageErrors.length === 0, pageErrors.join(' | '));
  });
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) { server.kill(); console.log('· 已关闭 dev server'); }
}

console.log('\n========== 结果 ==========');
console.log(`通过 ${passed} / ${passed + failed}`);
if (failed) { console.log('失败用例：'); results.filter(r => !r.ok).forEach(r => console.log('  ✗ ' + r.name + ' → ' + r.error)); process.exit(1); }
process.exit(0);
