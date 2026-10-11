/* =========================================================
 * render-graph.js —— Graph / Tree / Recursion / Log 渲染器
 * ========================================================= */
"use strict";

/* 布局工具：环形坐标 */
AV._ringLayout = function (n, cx, cy, R) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const ang = -Math.PI / 2 + i * 2 * Math.PI / Math.max(1, n);
    pts.push([cx + R * Math.cos(ang), cy + R * Math.sin(ang)]);
  }
  return pts;
};
/* 树形布局：nodes:  [{parent,label}]，返回 {x,y}[] */
AV._treeLayout = function (nodes) {
  const n = nodes.length;
  const kids = [];
  for (let i = 0; i < n; i++) kids.push([]);
  let root = 0;
  for (let i = 0; i < n; i++) {
    const p = nodes[i].parent;
    if (p < 0) root = i; else if (kids[p]) kids[p].push(i);
  }
  const depth = new Array(n).fill(0), order = [];
  (function dfs(u, d) {
    depth[u] = d; order.push(u);
    kids[u].forEach(function (v) { dfs(v, d + 1); });
  })(root, 0);
  // 每层数量确定宽度
  const counts = {};
  depth.forEach(function (d) { counts[d] = (counts[d] || 0) + 1; });
  let maxW = 1; for (const k in counts) maxW = Math.max(maxW, counts[k]);
  const W = 960, H = Math.max(160, 46 + 70 * (Math.max.apply(null, depth) + 1));
  const colW = Math.min(64, (W - 40) / Math.max(1, maxW));
  const pos = {};
  const colIdx = {};
  order.forEach(function (u) {
    const d = depth[u];
    colIdx[d] = (colIdx[d] || 0);
    // 同一层从左到右排：用中序？简化：按 DFS 顺序在该层逐个排
    const k = colIdx[d];
    pos[u] = [24 + colW * (k + 0.5), 30 + d * 68];
    colIdx[d] = k + 1;
  });
  return { pos: pos, depth: depth, W: W, H: H, root: root, kids: kids };
};

/* ---------------- 图节点/边 通用绘制 ---------------- */
AV._graphSVG = function (s, directed, W, H, isTree) {
  const cx = W / 2, cy = H / 2 - 8;
  const n = s.nodes.length;
  let pos;
  if (isTree) { const tl = AV._treeLayout(s.nodes); pos = tl.pos; }
  else {
    const pts = AV._ringLayout(n, cx, cy, Math.min(cx - 70, cy - 40, 190));
    pos = pts;
  }
  const nodeR = isTree ? 16 : 19;
  let out = '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#101318" rx="6"/>';
  // 边
  const marker = directed ? ' marker-end="url(#arrow)"' : '';
  if (s.edges.length) {
    out += '<defs><marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#8b96a8"/></marker></defs>';
  }
  for (let i = 0; i < s.edges.length; i++) {
    const e = s.edges[i], u = e.u, v = e.v, w = e.w;
    const p1 = pos[u], p2 = pos[v];
    if (!p1 || !p2) continue;
    const key = u + '-' + v;
    const em = s.eMark && s.eMark[key];
    let col = '#4d5663', sw = 1.6;
    if (em === 'focus') { col = '#f6a21c'; sw = 3.4; }
    else if (em === 'done') { col = '#238636'; sw = 2.2; }
    else if (em === 'sel') { col = '#e4572e'; sw = 3; }
    // 缩短端点，避免被节点遮住
    let dx = p2[0] - p1[0], dy = p2[1] - p1[1];
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const cut = nodeR + (directed ? 6 : 2);
    const x1 = p1[0] + dx / len * (nodeR + 2), y1 = p1[1] + dy / len * (nodeR + 2);
    const x2 = p2[0] - dx / len * cut, y2 = p2[1] - dy / len * cut;
    out += '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="' + col + '" stroke-width="' + sw + '"' + marker + '/>';
    if (w !== undefined && w !== null && !isTree) {
      out += '<text x="' + ((p1[0] + p2[0]) / 2).toFixed(1) + '" y="' + ((p1[1] + p2[1]) / 2 - 5).toFixed(1) + '" text-anchor="middle" font-size="11" font-family="monospace" fill="#8b96a8">' + w + '</text>';
    }
  }
  // 节点
  for (let i = 0; i < n; i++) {
    const p = pos[i];
    const mk = s.nMark && s.nMark[i];
    let fill = '#2d3440', stroke = '#5b6472', sw = 1.5;
    if (mk) {
      if (mk.cls === 'focus') { fill = '#e3a008'; stroke = '#ffd75f'; sw = 2.5; }
      else if (mk.cls === 'sel') { fill = '#b3541e'; stroke = '#e4572e'; sw = 2.5; }
      else if (mk.cls === 'done') { fill = '#238636'; stroke = '#2ea043'; sw = 2; }
    }
    const label = String(s.nodes[i].label === undefined ? i : s.nodes[i].label);
    out += '<g class="graph-node"><circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + nodeR + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + sw + '"><title>' + label + '</title></circle>';
    out += '<text x="' + p[0].toFixed(1) + '" y="' + (p[1] + 4).toFixed(1) + '" text-anchor="middle" font-size="' + (label.length > 3 ? 9 : 12) + '" fill="#fff" pointer-events="none">' + label + '</text></g>';
  }
  return out;
};

/* ---------------- GraphTracer ---------------- */
function GraphTracer(name, directed) {
  Tracer.call(this, name, 'g');
  this.directed = !!directed;
  this.state = { nodes: [], edges: [], nMark: {}, eMark: {}, seq: [] };
  this._W = 960; this._H = 300;
}
GraphTracer.prototype = Object.create(Tracer.prototype);
GraphTracer.prototype.constructor = GraphTracer;
GraphTracer.prototype._snap = function () {
  const s = this.state;
  return {
    nodes: s.nodes.map(function (x) { return Object.assign({}, x); }),
    edges: s.edges.map(function (e) { return Object.assign({}, e); }),
    nMark: Object.assign({}, s.nMark), eMark: Object.assign({}, s.eMark), seq: s.seq.slice()
  };
};
GraphTracer.prototype.do_set = function (nodeVals, edges) {
  const self = this;
  this.state.nodes = nodeVals.map(function (v, i) {
    if (v && typeof v === 'object') return { id: i, label: v.title !== undefined ? v.title : v.id };
    return { id: i, label: v };
  });
  this.state.edges = (edges || []).map(function (e) {
    if (typeof e[2] === 'number') return { u: e[0], v: e[1], w: e[2] };
    return { u: e[0], v: e[1], w: undefined };
  });
  this.state.nMark = {}; this.state.eMark = {}; this.state.seq = [];
  this._meta('');
};
GraphTracer.prototype.do_visit = function (v, msg) {
  this.state.nMark[v] = { cls: 'focus' };
  if (this.state.seq.indexOf(v) < 0) this.state.seq.push(v);
  this._meta('访问顺序: ' + this.state.seq.join(' → '));
};
GraphTracer.prototype.do_leave = function (v) {
  if (this.state.nMark[v] && this.state.nMark[v].cls === 'focus') this.state.nMark[v] = { cls: 'done' };
};
GraphTracer.prototype.do_select = function (v, u) {
  this.state.nMark[v] = { cls: 'sel' };
  if (u !== undefined) { this.state.eMark[v + '-' + u] = 'sel'; this.state.eMark[u + '-' + v] = 'sel'; }
};
GraphTracer.prototype.do_deselect = function (v, u) {
  if (v === undefined) { for (const k in this.state.nMark) if (this.state.nMark[k].cls === 'sel' || this.state.nMark[k].cls === 'focus') delete this.state.nMark[k]; this.state.eMark = {}; return; }
  delete this.state.nMark[v];
  if (u !== undefined) { delete this.state.eMark[v + '-' + u]; delete this.state.eMark[u + '-' + v]; }
};
GraphTracer.prototype.do_selectEdge = function (u, v) { this.state.eMark[u + '-' + v] = 'focus'; this.state.eMark[v + '-' + u] = 'focus'; };
GraphTracer.prototype.do_deselectEdge = function (u, v) { delete this.state.eMark[u + '-' + v]; delete this.state.eMark[v + '-' + u]; };
GraphTracer.prototype.do_doneEdge = function (u, v) { this.state.eMark[u + '-' + v] = 'done'; this.state.eMark[v + '-' + u] = 'done'; };
GraphTracer.prototype.buildSVG = function () {
  return AV._graphSVG(this.state, this.directed, this._W, this._H, false);
};
['set', 'visit', 'leave', 'select', 'deselect', 'selectEdge', 'deselectEdge', 'doneEdge']
  .forEach(function (m) { _wrapRec(GraphTracer.prototype, m); });

function DirectedGraphTracer(name) { GraphTracer.call(this, name, true); }
DirectedGraphTracer.prototype = Object.create(GraphTracer.prototype);
DirectedGraphTracer.prototype.constructor = DirectedGraphTracer;
function UndirectedGraphTracer(name) { GraphTracer.call(this, name, false); }
UndirectedGraphTracer.prototype = Object.create(GraphTracer.prototype);
UndirectedGraphTracer.prototype.constructor = UndirectedGraphTracer;

/* ---------------- TreeTracer ---------------- */
function TreeTracer(name) {
  Tracer.call(this, name, 't');
  this.state = { nodes: [], nMark: {}, seq: [] };
  this._W = 960; this._H = 0;
}
TreeTracer.prototype = Object.create(Tracer.prototype);
TreeTracer.prototype.constructor = TreeTracer;
TreeTracer.prototype._snap = function () {
  const s = this.state;
  return {
    nodes: s.nodes.map(function (x) { return Object.assign({}, x); }),
    nMark: Object.assign({}, s.nMark), seq: s.seq.slice()
  };
};
TreeTracer.prototype.do_set = function (nodeVals, parents) {
  const self = this;
  this.state.nodes = nodeVals.map(function (v, i) {
    return { parent: parents ? parents[i] : (i === 0 ? -1 : i - 1), label: v };
  });
  this.state.nMark = {}; this.state.seq = [];
  this._meta('');
};
TreeTracer.prototype.do_visit = function (v, msg) {
  this.state.nMark[v] = { cls: 'focus' };
  if (this.state.seq.indexOf(v) < 0) this.state.seq.push(v);
  this._meta('访问顺序: ' + this.state.seq.map(function (x) { return x; }).join(' → '));
};
TreeTracer.prototype.do_leave = function (v) {
  if (this.state.nMark[v] && this.state.nMark[v].cls === 'focus') this.state.nMark[v] = { cls: 'done' };
};
TreeTracer.prototype.do_select = function (v) { this.state.nMark[v] = { cls: 'sel' }; };
TreeTracer.prototype.do_deselect = function (v) {
  if (v === undefined) { for (const k in this.state.nMark) if (this.state.nMark[k].cls === 'sel') delete this.state.nMark[k]; }
  else delete this.state.nMark[v];
};
TreeTracer.prototype.buildSVG = function () {
  if (!this.state.nodes.length) return '';
  const tl = AV._treeLayout(this.state.nodes);
  this._H = tl.H;
  const pos = tl.pos;
  let out = '<rect x="0" y="0" width="' + tl.W + '" height="' + tl.H + '" fill="#101318" rx="6"/>';
  for (let i = 0; i < this.state.nodes.length; i++) {
    const p = this.state.nodes[i].parent;
    if (p >= 0 && pos[p]) {
      const a = pos[p], b = pos[i];
      out += '<line x1="' + a[0].toFixed(1) + '" y1="' + (a[1] + 16).toFixed(1) + '" x2="' + b[0].toFixed(1) + '" y2="' + (b[1] - 16).toFixed(1) + '" stroke="#4d5663" stroke-width="1.6"/>';
    }
  }
  for (let i = 0; i < this.state.nodes.length; i++) {
    const p = pos[i], mk = this.state.nMark[i];
    let fill = '#2d3440', stroke = '#5b6472', sw = 1.5;
    if (mk) {
      if (mk.cls === 'focus') { fill = '#e3a008'; stroke = '#ffd75f'; sw = 2.5; }
      else if (mk.cls === 'sel') { fill = '#b3541e'; stroke = '#e4572e'; sw = 2.5; }
      else if (mk.cls === 'done') { fill = '#238636'; stroke = '#2ea043'; sw = 2; }
    }
    const label = String(this.state.nodes[i].label);
    out += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="16" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + sw + '"><title>' + label + '</title></circle>';
    out += '<text x="' + p[0].toFixed(1) + '" y="' + (p[1] + 4).toFixed(1) + '" text-anchor="middle" font-size="11" fill="#fff" pointer-events="none">' + label + '</text>';
  }
  return out;
};
['set', 'visit', 'leave', 'select', 'deselect']
  .forEach(function (m) { _wrapRec(TreeTracer.prototype, m); });

/* ---------------- RecursionTracer（调用树 + 栈） ---------------- */
function RecursionTracer(name) {
  TreeTracer.call(this, name);
  this.key = 'r';
  this.state = { nodes: [], nMark: {}, seq: [], stk: [], doneSet: {} };
}
RecursionTracer.prototype = Object.create(TreeTracer.prototype);
RecursionTracer.prototype.constructor = RecursionTracer;
RecursionTracer.prototype._snap = function () {
  const s = this.state;
  return {
    nodes: s.nodes.map(function (x) { return Object.assign({}, x); }),
    nMark: Object.assign({}, s.nMark), seq: s.seq.slice(),
    stk: s.stk.slice(), doneSet: Object.assign({}, s.doneSet)
  };
};
RecursionTracer.prototype.do_setRoot = function (label) {
  this.state.nodes = [{ parent: -1, label: label }];
  this.state.nMark = {}; this.state.seq = [];
  this.state.stk = [0]; this.state.doneSet = {};
  this._recMeta();
};
RecursionTracer.prototype.do_push = function (label) {
  const id = this.state.nodes.length;
  const stk = this.state.stk;
  const parent = stk.length ? stk[stk.length - 1] : -1;
  this.state.nodes.push({ parent: parent, label: label });
  stk.push(id);
  this._recMeta();
};
RecursionTracer.prototype.do_pop = function () {
  if (this.state.stk.length) this.state.stk.pop();
  this._recMeta();
};
RecursionTracer.prototype.do_done = function () {
  const st = this.state.stk;
  if (st.length) this.state.doneSet[st[st.length - 1]] = true;
  this._recMeta();
};
RecursionTracer.prototype.do_result = function (text) { this._meta('结果: ' + text); };
RecursionTracer.prototype._recMeta = function () {
  const st = this.state.stk;
  const doneSet = this.state.doneSet;
  this.state.nMark = {};
  for (const id in doneSet) this.state.nMark[id] = { cls: 'done' };
  for (let i = 0; i < st.length; i++) {
    if (!doneSet[st[i]]) {
      this.state.nMark[st[i]] = (i === st.length - 1) ? { cls: 'focus' } : { cls: 'sel' };
    }
  }
  this._meta('栈深: ' + st.length);
};
// 供算法代码调用的录制 API（回放时由 do_* 重建栈，故无需额外状态）
RecursionTracer.prototype.root = function (label) { this._rec('setRoot', [label]); return this; };
RecursionTracer.prototype.call = function (label) { this._rec('push', [label]); return this; };
RecursionTracer.prototype.back = function () { this._rec('pop', []); return this; };
RecursionTracer.prototype.done = function () { this._rec('done', []); return this; };
RecursionTracer.prototype.result = function (text) { this._rec('result', [text]); return this; };
RecursionTracer.prototype.buildSVG = function () {
  if (!this.state.nodes.length) return '';
  const tl = AV._treeLayout(this.state.nodes);
  this._H = tl.H;
  const pos = tl.pos;
  let out = '<rect x="0" y="0" width="' + tl.W + '" height="' + tl.H + '" fill="#101318" rx="6"/>';
  for (let i = 0; i < this.state.nodes.length; i++) {
    const p = this.state.nodes[i].parent;
    if (p >= 0 && pos[p]) {
      const a = pos[p], b = pos[i];
      out += '<line x1="' + a[0].toFixed(1) + '" y1="' + (a[1] + 14).toFixed(1) + '" x2="' + b[0].toFixed(1) + '" y2="' + (b[1] - 14).toFixed(1) + '" stroke="#4d5663" stroke-width="1.6"/>';
    }
  }
  for (let i = 0; i < this.state.nodes.length; i++) {
    const p = pos[i], mk = this.state.nMark[i];
    let fill = '#2d3440', stroke = '#5b6472', sw = 1.5;
    if (mk) {
      if (mk.cls === 'focus') { fill = '#e3a008'; stroke = '#ffd75f'; sw = 2.5; }
      else if (mk.cls === 'sel') { fill = '#395b8a'; stroke = '#58a6ff'; sw = 2; }
      else if (mk.cls === 'done') { fill = '#238636'; stroke = '#2ea043'; sw = 1.6; }
    }
    const label = String(this.state.nodes[i].label);
    out += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="14" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + sw + '"><title>' + label + '</title></circle>';
    out += '<text x="' + p[0].toFixed(1) + '" y="' + (p[1] + 3.5).toFixed(1) + '" text-anchor="middle" font-size="10" fill="#fff" pointer-events="none">' + label + '</text>';
  }
  return out;
};

/* ---------------- LogTracer ---------------- */
function LogTracer(name) {
  Tracer.call(this, name, 'log');
  this.state = { lines: [] };
  this._autoScroll = true;
}
LogTracer.prototype = Object.create(Tracer.prototype);
LogTracer.prototype.constructor = LogTracer;
LogTracer.prototype._snap = function () { return { lines: this.state.lines.slice() }; };
LogTracer.prototype.do_println = function (text) { this.state.lines.push(String(text)); };
LogTracer.prototype.do_clear = function () { this.state.lines = []; };
LogTracer.prototype.render = function () {
  if (!this.dom) return;
  if (!this.logPre) {
    this.logPre = document.createElement('pre');
    this.logPre.style.cssText = 'margin:0;padding:8px 12px;font:12px/1.6 monospace;color:#7ee787;white-space:pre-wrap;max-height:280px;overflow:auto;min-height:60px';
    this.dom.appendChild(this.logPre);
  }
  this.logPre.textContent = this.state.lines.join('\n');
  try { this.logPre.scrollTop = this.logPre.scrollHeight; } catch (e) {}
};
LogTracer.prototype.ensureDom = function (canvasStack) {
  if (this.dom) return this.dom;
  this.dom = document.createElement('div');
  this.dom.className = 'tracer-box';
  this.dom.innerHTML = '<div class="tracer-head"><b></b><span></span></div>';
  this.dom.querySelector('.tracer-head b').textContent = this.name;
  this.head2 = this.dom.querySelector('.tracer-head span');
  canvasStack.appendChild(this.dom);
  return this.dom;
};
LogTracer.prototype.buildSVG = function () { return ''; };
['println', 'clear'].forEach(function (m) { _wrapRec(LogTracer.prototype, m); });

/* ---------------- Randomize 数据工具 ---------------- */
var Randomize = {
  Array1D: function (opts) {
    opts = opts || {};
    const N = opts.N || 15;
    let gen = opts.value;
    if (typeof gen !== 'function') gen = function () { return Math.floor(Math.random() * 100); };
    const arr = [];
    for (let i = 0; i < N; i++) arr.push(gen(i));
    if (opts.sorted) arr.sort(function (a, b) { return a - b; });
    return arr;
  },
  Array2D: function (opts) {
    opts = opts || {};
    const R = opts.R || 5, C = opts.C || 5;
    const gen = typeof opts.value === 'function' ? opts.value : function () { return Math.floor(Math.random() * 100); };
    const m = [];
    for (let i = 0; i < R; i++) { m.push([]); for (let j = 0; j < C; j++) m[i].push(gen(i, j)); }
    return m;
  },
  // 生成一个简单连通图，返回 [nodeVals, edges]
  Graph: function (opts) {
    opts = opts || {};
    const N = opts.N || 8, ratio = opts.ratio === undefined ? 0.32 : opts.ratio;
    const vals = [];
    for (let i = 0; i < N; i++) vals.push(i);
    const edges = [];
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        if (Math.random() < ratio) edges.push([i, j, 1 + Math.floor(Math.random() * 9)]);
      }
    }
    // 保证连通：链式连接
    for (let i = 0; i < N - 1; i++) {
      if (!edges.some(function (e) { return (e[0] === i && e[1] === i + 1) || (e[1] === i && e[0] === i + 1); })) {
        edges.push([i, i + 1, 1 + Math.floor(Math.random() * 9)]);
      }
    }
    return [vals, edges];
  },
  _pick: function (arr) { return arr[Math.floor(Math.random() * arr.length)]; }
};
