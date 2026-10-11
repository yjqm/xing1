/* 临时：验证自定义代码示例能被引擎编译/录制/回放/渲染 */
"use strict";
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');

const sandbox = {
  console, Math, JSON, Date, Promise, Set, Map, RegExp, Object, Array,
  Number, String, Boolean, Error, TypeError, RangeError, SyntaxError,
  Infinity, NaN, undefined, parseInt, parseFloat, isFinite, isNaN,
  setTimeout, clearTimeout, setInterval, clearInterval
};
sandbox.window = sandbox; sandbox.globalThis = sandbox;
const ctx = vm.createContext(sandbox);
['js/core.js', 'js/player.js', 'js/render-graph.js'].forEach(f => {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
});
const AV = ctx.AV;

const CUSTOM = [
  "var t = new Array1DTracer('冒泡排序');",
  "var log = new LogTracer('过程日志');",
  "var a = [5, 2, 9, 1, 7, 3, 8, 4, 6, 0];",
  "t.set(a);",
  "log.println('初始: ' + a);",
  "for (var i = 0; i < a.length - 1; i++) {",
  "  for (var j = 0; j < a.length - 1 - i; j++) {",
  "    t.select(j, j + 1);",
  "    if (a[j] > a[j + 1]) {",
  "      var tmp = a[j];",
  "      a[j] = a[j + 1];",
  "      a[j + 1] = tmp;",
  "      t.patch(j, a[j]);",
  "      t.patch(j + 1, a[j + 1]);",
  "      log.println('交换 ' + j + ' 与 ' + (j + 1));",
  "    } else {",
  "      log.println('a[' + j + '] <= a[' + (j + 1) + ']，不动');",
  "    }",
  "    t.depatch();",
  "    t.deselect();",
  "  }",
  "}",
  "t.done();",
  "log.println('完成: ' + a);",
  ""
].join('\n');

reset();
AV.mode = 'recording';
const c = AV.compile(CUSTOM);
c.fn.apply(null, [function (n) { AV.curLine = n; }, AV,
  ctx.Array1DTracer, ctx.Array2DTracer, ctx.ChartTracer, ctx.GraphTracer,
  ctx.DirectedGraphTracer, ctx.UndirectedGraphTracer, ctx.TreeTracer,
  ctx.RecursionTracer, ctx.LogTracer, ctx.Randomize]);
const cmdN = AV.commands.length;
console.log('tracers:', AV.tracers.length, 'commands:', cmdN);
if (!cmdN) { console.log('FAIL 命令流为空'); process.exit(1); }
if (!AV.tracers.length) { console.log('FAIL 无 tracer'); process.exit(1); }

// 回放
AV.mode = 'ready';
AV.tracers.forEach(tr => tr._initState());
AV.pos = 0; AV.checkpoints = []; AV._pushCheckpoint();
AV._forwardTo(Math.floor(cmdN / 2));
AV._forwardTo(cmdN);

// 渲染 + 校验
let ok = true;
AV.tracers.forEach(tr => {
  if (tr.key === 'log') {
    const lines = tr.state.lines.join('\\n');
    console.log('LOG sample:', JSON.stringify(lines.slice(0, 80)));
    if (!lines.includes('完成')) ok = false;
  } else {
    const s = tr.buildSVG();
    if (typeof s !== 'string' || !s.length) { ok = false; console.log('FAIL render', tr.name); }
    else console.log('SVG', tr.name, 'len', s.length);
  }
});
console.log(ok ? 'CUSTOM PASS' : 'CUSTOM FAIL');
process.exit(ok ? 0 : 1);

function reset() {
  AV.tracers.forEach(tr => { try { tr._destroy(); } catch (e) {} });
  AV.tracers = []; AV.commands = []; AV.curLine = -1; AV.mode = 'idle'; AV.stack = [];
}
