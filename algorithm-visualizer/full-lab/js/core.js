/* =========================================================
 * Algorithm Visualizer 复现版 —— 核心引擎
 * 机制：算法=真实JS代码。运行时对源码逐行插桩，把 tracer
 * 方法调用录制为"命令流(含行号)"；播放器回放命令流驱动
 * 渲染器。支持 播放/暂停/步进/后退/变速。
 * ========================================================= */
"use strict";
var AV = window.AV = {
  tracers: [],        // 所有 tracer 实例
  commands: [],       // 命令流 [{tr, m, a, line}]
  pos: 0,             // 播放位置
  playing: false,
  speed: 40,          // 每 tick 应用命令条数
  tickMs: 50,
  curLine: -1,        // 插桩最近标记行号
  curAlg: null,
  timer: null,
  onUiUpdate: null,   // UI 回调 (进度/播放态/行高亮)
  stack: []           // 递归栈视图（RecursionTracer 用）
};

/* ---------------- 录制 & 编译 ---------------- */

// 判断某行是否可安全注入行号标记
AV._safeLine = function (raw) {
  const t = raw.trim();
  if (!t) return false;
  if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('*/')) return false;
  if (t.startsWith('}') || t.startsWith('else')) return false; // 块收尾 / else 不能前置语句
  if (t.endsWith('\\')) return false;           // 续行
  if (t.includes('`')) return false;            // 模板串（避免跨行模板）
  if (/^(case\s|default:)/.test(t)) return true; // switch 分支可注入
  return true;
};

// 把算法源码编译成可执行 async 函数（带行号插桩）
AV.compile = function (source) {
  const lines = source.split('\n');
  let out = '', injected = 0;
  for (let i = 0; i < lines.length; i++) {
    if (AV._safeLine(lines[i])) { out += '__m(' + i + ');'; injected++; }
    out += lines[i] + '\n';
  }
  const make = new Function(
    '__m','__AV','Array1DTracer','Array2DTracer','ChartTracer',
    'GraphTracer','DirectedGraphTracer','UndirectedGraphTracer',
    'TreeTracer','RecursionTracer','LogTracer','Randomize',
    '"use strict";\n' + out
  );
  return { fn: make, injected: injected };
};

// 运行算法入口
AV.runAlgorithm = function (alg, okCb, errCb) {
  AV.resetRuntime();
  AV.curAlg = alg;
  // 内置算法源码随站点发布，可以在页面内插桩执行；用户粘贴的任意代码不能
  // 与登录态处于同一浏览器上下文中执行，否则可读取页面与同源接口数据。
  if (alg && alg.id === -1) {
    errCb('安全模式下暂不在浏览器主页面执行自定义代码；可学习和修改内置算法，C++ 运行请使用隔离实验环境。');
    return;
  }
  let fn;
  try { fn = AV.compile(alg.code).fn; }
  catch (e1) {
    // 插桩编译失败 → 降级：无插桩直接执行（保留可视化，仅失去行号高亮）
    try {
      fn = new Function(
        '__m', '__AV', 'Array1DTracer', 'Array2DTracer', 'ChartTracer',
        'GraphTracer', 'DirectedGraphTracer', 'UndirectedGraphTracer',
        'TreeTracer', 'RecursionTracer', 'LogTracer', 'Randomize',
        '"use strict";\n' + alg.code
      );
    } catch (e2) { errCb('代码语法错误: ' + e2.message); return; }
  }
  // 提供沙箱：记录模式
  AV.mode = 'recording';
  const mark = function (n) { AV.curLine = n; };
  Promise.resolve()
    .then(function () {
      return fn(mark, AV, Array1DTracer, Array2DTracer, ChartTracer,
        GraphTracer, DirectedGraphTracer, UndirectedGraphTracer,
        TreeTracer, RecursionTracer, LogTracer, Randomize);
    })
    .then(function () {
      AV.mode = 'ready';
      if (!AV.tracers.length) { errCb('该算法未创建任何可视化 tracer'); return; }
      // 给每个 tracer 拍初始快照
      AV.tracers.forEach(function (tr) { tr._initState(); });
      AV.pos = 0; AV.playing = false;
      AV.checkpoints = []; AV._cpEvery = 150;
      AV._pushCheckpoint();
      okCb();
    })
    .catch(function (e) {
      errCb('运行错误: ' + (e && e.message ? e.message : e));
    });
};

AV.resetRuntime = function () {
  AV.tracers.forEach(function (tr) { try { tr._destroy(); } catch (e) {} });
  AV.tracers = [];
  AV.commands = [];
  AV.stack = [];
  AV.pos = 0; AV.curLine = -1; AV.playing = false;
  if (AV.timer) { clearInterval(AV.timer); AV.timer = null; }
  AV._cpEvery = 150; AV.checkpoints = [];
};

/* ---------------- Tracer 基类 ---------------- */

function Tracer(name, key) {
  this.name = name || 'Tracer';
  this.key = key || ('t' + AV.tracers.length);
  this.idx = AV.tracers.length;
  this.line = -1;
  this.dom = null;      // .tracer-box 容器
  this.body = null;     // svg 挂载点
  this.state = {};
  AV.tracers.push(this);
}
Tracer.prototype._rec = function (m, a) {
  if (AV.mode === 'recording') {
    AV.commands.push({ tr: this.idx, m: m, a: a, line: AV.curLine });
    return true;
  }
  return false; // ready/playing 模式下命令来自播放器回放
};
// 由播放器回放：更新状态（不录制）
Tracer.prototype._apply = function (m, a) {
  if (this['do_' + m]) this['do_' + m].apply(this, a);
};
Tracer.prototype._initState = function () { this.state = this._snap(); };
Tracer.prototype._snap = function () { return JSON.parse(JSON.stringify(this.state || {})); };
Tracer.prototype._destroy = function () {
  if (this.dom && this.dom.parentNode) this.dom.parentNode.removeChild(this.dom);
};
// DOM 生成：由子类提供 buildSVG()
Tracer.prototype.render = function () {
  if (!this.dom) return;
  try {
    const html = this.buildSVG();
    // 从首矩形提取逻辑尺寸作为 viewBox，使图形自适应面板宽度
    let vb = '0 0 960 210';
    const m = /<rect[^>]*\swidth="([\d.]+)"[^>]*\sheight="([\d.]+)"/.exec(html) ||
              /<rect[^>]*\sheight="([\d.]+)"[^>]*\swidth="([\d.]+)"/.exec(html);
    if (m) vb = '0 0 ' + m[1] + ' ' + m[2];
    this.body.setAttribute('viewBox', vb);
    this.body.setAttribute('preserveAspectRatio', 'xMidYMin meet');
    this.body.innerHTML = html;
  }
  catch (e) { this.body.innerHTML = '<div style="color:#f85149;padding:6px;font:12px monospace">渲染错误: ' + e.message + '</div>'; }
};
Tracer.prototype.ensureDom = function (canvasStack) {
  if (this.dom) return this.dom;
  this.dom = document.createElement('div');
  this.dom.className = 'tracer-box';
  this.dom.innerHTML = '<div class="tracer-head"><b></b><span></span></div><svg class="tracer-canvas"></svg>';
  this.dom.querySelector('.tracer-head b').textContent = this.name;
  this.head2 = this.dom.querySelector('.tracer-head span');
  this.body = this.dom.querySelector('svg');
  canvasStack.appendChild(this.dom);
  return this.dom;
};
Tracer.prototype._after = function () { /* 每步之后的额外绘制钩子 */ };
Tracer.prototype._meta = function (text) { if (this.head2) this.head2.textContent = text || ''; };

/* ---------------- 颜色工具 ---------------- */
AV.COLOR = {
  base: '#232936', focus: '#8a5a12', sel: '#b3541e',
  done: '#1f6f43', warn: '#9e6a03', edge: '#5b6472',
  node: '#2d3440', nodeFocus: '#f6a21c', nodeDone: '#238636',
  text: '#dbe2ec'
};

/* =========================================================
 * Array1DTracer —— 一维数组（柱状/方格）
 *  API: set(arr) patch(i,v) depatch(i) select(i[,j]) deselect(i)
 *       highlight(i[,j]) dehighlight(i) mark(i,label) unmark(i)
 * ========================================================= */
function Array1DTracer(name) {
  Tracer.call(this, name, 'a1');
  this.state = { vals: [], marks: {}, order: null, bar: false, maxV: 0 };
}
Array1DTracer.prototype = Object.create(Tracer.prototype);
Array1DTracer.prototype.constructor = Array1DTracer;
Array1DTracer.prototype._snap = function () {
  return {
    vals: (this.state.vals || []).slice(),
    marks: Object.assign({}, this.state.marks),   // i -> {cls,label}
    order: this.state.order ? this.state.order.slice() : null, // 顺序展示下标
    bar: !!this.state.bar, maxV: this.state.maxV || 0
  };
};
Array1DTracer.prototype.do_set = function (arr) {
  this.state.vals = arr.slice();
  this.state.marks = {};
  const m = Math.max.apply(null, this.state.vals.filter(function (v) { return typeof v === 'number'; }));
  this.state.maxV = isFinite(m) ? m : 0;
  this.state.bar = this.state.bar !== false && this.state.vals.every(function (v) { return typeof v === 'number'; }) && this.state.vals.length > 4;
};
Array1DTracer.prototype.do_patch = function (i, v) {
  const vals = this.state.vals;
  if (Array.isArray(v)) vals.splice.apply(vals, [i, v.length].concat(v));
  else vals[i] = v;
  const m = Math.max.apply(null, vals.filter(function (x) { return typeof x === 'number'; }));
  this.state.maxV = isFinite(m) ? m : 0;
  this.state.marks[i] = { cls: 'patch', label: this.state.marks[i] ? this.state.marks[i].label : '' };
};
Array1DTracer.prototype.do_depatch = function (i) {
  if (i === undefined) { for (const k in this.state.marks) if (this.state.marks[k].cls === 'patch') delete this.state.marks[k]; }
  else delete this.state.marks[i];
};
Array1DTracer.prototype.do_select = function (i, j) {
  if (j === undefined) { this.state.marks[i] = { cls: 'sel', label: '' }; }
  else { for (let k = i; k <= j; k++) this.state.marks[k] = { cls: 'sel', label: '' }; }
};
Array1DTracer.prototype.do_deselect = function (i, j) {
  if (i === undefined) { for (const k in this.state.marks) if (this.state.marks[k].cls === 'sel' || this.state.marks[k].cls === 'focus') delete this.state.marks[k]; }
  else if (j === undefined) { delete this.state.marks[i]; }
  else { for (let k = i; k <= j; k++) delete this.state.marks[k]; }
};
Array1DTracer.prototype.do_highlight = function (i, j) {
  if (j === undefined) this.state.marks[i] = Object.assign({ cls: 'focus', label: '' }, this.state.marks[i]);
  else for (let k = i; k <= j; k++) this.state.marks[k] = Object.assign({ cls: 'focus', label: '' }, this.state.marks[k]);
};
Array1DTracer.prototype.do_dehighlight = function (i) { delete this.state.marks[i]; };
Array1DTracer.prototype.do_mark = function (i, label) { this.state.marks[i] = { cls: 'focus', label: label || '' }; };
Array1DTracer.prototype.do_unmark = function (i) { delete this.state.marks[i]; };
Array1DTracer.prototype.do_done = function (i) {
  if (i === undefined) { for (let k = 0; k < this.state.vals.length; k++) this.state.marks[k] = { cls: 'done', label: '' }; }
  else this.state.marks[i] = { cls: 'done', label: '' };
};
Array1DTracer.prototype.do_reorder = function (orderArr) { this.state.order = orderArr.slice(); };

Array1DTracer.prototype.buildSVG = function () {
  const s = this.state, n = s.vals.length;
  const W = 960, pad = 34, H = 210;
  if (!n) return '';
  let out = '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#101318" rx="6"/>';
  if (s.bar) {
    // 柱状图
    const bw = Math.max(3, Math.min(26, (W - pad * 2) / n - 2));
    const base = H - 34;
    const showVal = bw > 9;
    for (let i = 0; i < n; i++) {
      const orderI = s.order ? s.order.indexOf(i) : i;
      const x = pad + orderI * (bw + 2) + 1;
      const h = Math.max(2, (s.vals[i] / (s.maxV || 1)) * (base - 14));
      const mk = s.marks[i];
      let fill = '#58a6ff';
      if (mk) fill = mk.cls === 'focus' ? '#e3a008' : (mk.cls === 'sel' || mk.cls === 'patch') ? '#e4572e' : mk.cls === 'done' ? '#238636' : '#e4572e';
      const y = base - h;
      out += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) + '" fill="' + fill + '" rx="2"><title>arr[' + i + ']=' + s.vals[i] + '</title></rect>';
      if (showVal) out += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (y - 3).toFixed(1) + '" text-anchor="middle" font-size="10" font-family="monospace" fill="#c9d3e0">' + s.vals[i] + '</text>';
      if (mk && mk.label) out += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (base + 14).toFixed(1) + '" text-anchor="middle" font-size="11" font-weight="700" font-family="monospace" fill="#ffd75f">' + mk.label + '</text>';
    }
  } else {
    // 方格
    const cw = Math.max(24, Math.min(46, (W - 30) / n - 4));
    const ch = 34;
    for (let i = 0; i < n; i++) {
      const orderI = s.order ? s.order.indexOf(i) : i;
      const x = 16 + orderI * (cw + 4), y = 26;
      const mk = s.marks[i];
      let fill = '#232936';
      if (mk) fill = mk.cls === 'focus' ? '#e3a008' : mk.cls === 'sel' ? '#e4572e' : mk.cls === 'done' ? '#238636' : '#232936';
      out += '<rect class="cell" x="' + x + '" y="' + y + '" width="' + cw + '" height="' + ch + '" fill="' + fill + '" rx="4"><title>arr[' + i + ']</title></rect>';
      out += '<text x="' + (x + cw / 2).toFixed(1) + '" y="' + (y + ch / 2 + 4).toFixed(1) + '" text-anchor="middle" font-size="13" font-family="monospace" fill="#fff">' + s.vals[i] + '</text>';
      if (mk && mk.label) out += '<text x="' + (x + cw / 2).toFixed(1) + '" y="' + (y - 6).toFixed(1) + '" text-anchor="middle" font-size="11" font-weight="700" fill="#ffd75f" font-family="monospace">' + mk.label + '</text>';
      if (i % 5 === 0 || true) out += '<text x="' + (x + cw / 2).toFixed(1) + '" y="' + (y + ch + 12).toFixed(1) + '" text-anchor="middle" font-size="9" fill="#5b6472" font-family="monospace">' + i + '</text>';
    }
  }
  return out;
};

/* 录制期便捷：录制方法包装 */
const _wrapRec = function (proto, m) {
  proto[m] = function () {
    const args = Array.prototype.slice.call(arguments);
    const rec = this._rec(m, args);
    if (!rec) this._apply(m, args);
    return this;
  };
};
['set', 'patch', 'depatch', 'select', 'deselect', 'highlight', 'dehighlight', 'mark', 'unmark', 'done', 'reorder']
  .forEach(function (m) { _wrapRec(Array1DTracer.prototype, m); });
