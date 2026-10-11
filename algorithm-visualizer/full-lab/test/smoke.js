/* 无头冒烟测试：真实编译执行每个算法 + 回放命令流，验证无异常 */
"use strict";
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');

// 模拟浏览器 window —— 多个 <script> 共享同一全局
const sandbox = {
  console, Math, JSON, Date, Promise, Set, Map, RegExp, Object, Array,
  Number, String, Boolean, Error, TypeError, RangeError, SyntaxError,
  Infinity, NaN, undefined, parseInt, parseFloat, isFinite, isNaN,
  setTimeout, clearTimeout, setInterval, clearInterval
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
const ctx = vm.createContext(sandbox);

const files = [
  'js/core.js', 'js/player.js', 'js/render-graph.js',
  'js/algorithms/alg-sort.js', 'js/algorithms/alg-search.js',
  'js/algorithms/alg-graph.js', 'js/algorithms/alg-graph2.js',
  'js/algorithms/alg-tree.js', 'js/algorithms/alg-dp.js'
];
files.forEach(f => {
  const code = fs.readFileSync(path.join(ROOT, f), 'utf8');
  vm.runInContext(code, ctx, { filename: f });
});

const ALGS = [].concat(
  ctx.__ALG_SORT, ctx.__ALG_SEARCH, ctx.__ALG_GRAPH,
  ctx.__ALG_GRAPH2, ctx.__ALG_TREE, ctx.__ALG_DP
);
const AV = ctx.AV;
function fnArgs() {
  return [function (n) { AV.curLine = n; }, AV,
    ctx.Array1DTracer, ctx.Array2DTracer, ctx.ChartTracer, ctx.GraphTracer,
    ctx.DirectedGraphTracer, ctx.UndirectedGraphTracer, ctx.TreeTracer,
    ctx.RecursionTracer, ctx.LogTracer, ctx.Randomize];
}
function reset() {
  AV.tracers = []; AV.commands = []; AV.curLine = -1; AV.mode = 'idle'; AV.stack = [];
}
let pass = 0, fail = 0;
function runOnce(alg) {
  reset();
  AV.mode = 'recording';   // 浏览器里由 runAlgorithm 设置
  const c = AV.compile(alg.code);
  const t0 = Date.now();
  c.fn.apply(null, fnArgs());
  const cmdN = AV.commands.length;
  if (!cmdN) throw new Error('命令流为空');
  // 回放一半 & 全量
  AV.mode = 'ready';
  AV.tracers.forEach(tr => tr._initState());
  AV.pos = 0; AV.checkpoints = []; AV._pushCheckpoint();
  AV._forwardTo(Math.floor(cmdN / 2));
  AV._forwardTo(cmdN);
  // 渲染字符串验证（Log 除外）
  const svg = AV.tracers.map(tr => {
    if (tr.key === 'log') return '(log)';
    const s = tr.buildSVG ? tr.buildSVG() : '';
    return typeof s === 'string' ? s.length : 'ERR';
  });
  const bad = svg.filter(s => typeof s === 'string' && s === 'ERR');
  if (bad.length) throw new Error('渲染返回非字符串');
  const ms = Date.now() - t0;
  return { cmdN, svg, ms };
}
for (let round = 0; round < 3; round++) {
  console.log('==== 第 ' + (round + 1) + ' 轮 ====');
  ALGS.forEach(a => {
    try {
      const r = runOnce(a);
      pass++;
      console.log('PASS  [' + String(r.cmdN).padStart(5) + ' cmds ' + String(r.ms).padStart(3) + 'ms] ' + a.cat + ' / ' + a.name);
    } catch (e) {
      fail++;
      console.log('FAIL  ' + a.cat + ' / ' + a.name + '  → ' + e.message);
      const st = (e.stack || '').split('\n');
      console.log(st.slice(0, 5).join('\n'));
    }
  });
}
console.log('\n结果: PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
