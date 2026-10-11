/* =========================================================
 * player.js —— Array2DTracer / ChartTracer / 播放器
 * ========================================================= */
"use strict";

/* Array2DTracer —— 二维表格（矩阵 / DP 表 / N皇后棋盘） */
function Array2DTracer(name) {
  Tracer.call(this, name, 'a2');
  this.state = { rows: [], marks: {}, heads: null };
}
Array2DTracer.prototype = Object.create(Tracer.prototype);
Array2DTracer.prototype.constructor = Array2DTracer;
Array2DTracer.prototype._snap = function () {
  return {
    rows: this.state.rows ? this.state.rows.map(function (r) { return r.slice(); }) : [],
    marks: JSON.parse(JSON.stringify(this.state.marks || {})), // "i,j" -> cls
    heads: this.state.heads ? this.state.heads.slice() : null
  };
};
Array2DTracer.prototype.do_set = function (mat) {
  this.state.rows = mat.map(function (r) { return r.slice(); });
  this.state.marks = {};
};
Array2DTracer.prototype.do_patch = function (i, j, v) {
  this.state.rows[i][j] = v;
  this.state.marks[i + ',' + j] = { cls: 'patch' };
};
Array2DTracer.prototype.do_depatch = function (i, j) {
  if (i === undefined) { for (const k in this.state.marks) if (this.state.marks[k].cls === 'patch') delete this.state.marks[k]; }
  else delete this.state.marks[i + ',' + j];
};
Array2DTracer.prototype.do_select = function (i, j) {
  if (j === undefined && Array.isArray(i)) { // select([r1,c1],[r2,c2]?) 简单：范围矩形
    if (i.length === 4) { for (let r = i[0]; r <= i[2]; r++) for (let c = i[1]; c <= i[3]; c++) this.state.marks[r + ',' + c] = { cls: 'sel' }; return; }
  }
  this.state.marks[i + ',' + j] = { cls: 'sel' };
};
Array2DTracer.prototype.do_deselect = function (i, j) {
  if (i === undefined) { for (const k in this.state.marks) if (this.state.marks[k].cls === 'sel' || this.state.marks[k].cls === 'focus') delete this.state.marks[k]; }
  else delete this.state.marks[i + ',' + j];
};
Array2DTracer.prototype.do_highlight = function (i, j) { this.state.marks[i + ',' + j] = { cls: 'focus' }; };
Array2DTracer.prototype.do_dehighlight = function (i, j) { delete this.state.marks[i + ',' + j]; };
Array2DTracer.prototype.do_done = function (i, j) { this.state.marks[i + ',' + j] = { cls: 'done' }; };

Array2DTracer.prototype.buildSVG = function () {
  const s = this.state, R = s.rows.length;
  if (!R) return '';
  const C = Math.max.apply(null, s.rows.map(function (r) { return r.length; }));
  const cell = Math.min(58, Math.max(26, Math.floor(940 / (C + 2) - 4)));
  const W = Math.max(200, C * (cell + 4) + 30), H = R * (cell + 4) + 36;
  const fs = Math.max(9, cell * 0.38);
  let out = '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#101318" rx="6"/>';
  for (let i = 0; i < R; i++) {
    for (let j = 0; j < (s.rows[i] || []).length; j++) {
      const x = 14 + j * (cell + 4), y = 18 + i * (cell + 4);
      const mk = s.marks[i + ',' + j];
      let fill = '#232936', sw = 1, stroke = '#39424f';
      if (mk) { if (mk.cls === 'focus') { fill = '#e3a008'; stroke = '#f6a21c'; sw = 2; }
        else if (mk.cls === 'sel') { fill = '#b3541e'; stroke = '#e4572e'; sw = 2; }
        else if (mk.cls === 'done') { fill = '#1f6f43'; stroke = '#238636'; }
        else if (mk.cls === 'patch') { fill = '#8a3a1a'; stroke = '#e4572e'; sw = 1.5; } }
      const v = s.rows[i][j];
      const label = (typeof v === 'number' && v === Infinity) ? '∞' : String(v);
      out += '<rect x="' + x + '" y="' + y + '" width="' + cell + '" height="' + cell + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + sw + '" rx="4"><title>[' + i + ',' + j + ']=' + label + '</title></rect>';
      out += '<text x="' + (x + cell / 2).toFixed(1) + '" y="' + (y + cell / 2 + fs * 0.35).toFixed(1) + '" text-anchor="middle" font-size="' + fs + '" font-family="monospace" fill="#fff">' + label + '</text>';
      if (s.heads && s.heads[j]) out += '<text x="' + (x + cell / 2).toFixed(1) + '" y="12" text-anchor="middle" font-size="10" fill="#8b96a8" font-family="monospace">' + s.heads[j] + '</text>';
    }
  }
  return out;
};
['set', 'patch', 'depatch', 'select', 'deselect', 'highlight', 'dehighlight', 'done']
  .forEach(function (m) { _wrapRec(Array2DTracer.prototype, m); });

/* ChartTracer —— 折线 / 柱状数据图 */
function ChartTracer(name) {
  Tracer.call(this, name, 'chart');
  this.state = { data: [], max: 1, patch: {} };
}
ChartTracer.prototype = Object.create(Tracer.prototype);
ChartTracer.prototype.constructor = ChartTracer;
ChartTracer.prototype._snap = function () {
  return { data: this.state.data.slice(), max: this.state.max, patch: Object.assign({}, this.state.patch) };
};
ChartTracer.prototype.do_set = function (arr) {
  this.state.data = arr.slice();
  const m = Math.max.apply(null, arr.filter(function (v) { return typeof v === 'number'; }));
  this.state.max = isFinite(m) ? m : 1;
  this.state.patch = {};
};
ChartTracer.prototype.do_patch = function (i, v) {
  this.state.data[i] = v;
  const m = Math.max.apply(null, this.state.data.filter(function (x) { return typeof x === 'number'; }));
  this.state.max = isFinite(m) ? m : 1;
  this.state.patch[i] = true;
};
Array1DTracer.prototype.do_sel = ChartTracer.prototype.do_patch; // 兼容个别写法

ChartTracer.prototype.buildSVG = function () {
  const s = this.state, n = s.data.length, W = 960, H = 210, padL = 34, padB = 26;
  if (!n) return '';
  let out = '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#101318" rx="6"/>';
  // 网格
  for (let g = 0; g <= 4; g++) {
    const gy = 10 + (H - padB - 10) * g / 4;
    out += '<line x1="' + padL + '" y1="' + gy + '" x2="' + (W - 8) + '" y2="' + gy + '" stroke="#1e242e" stroke-width="1"/>';
  }
  const step = (W - padL - 16) / Math.max(1, n - 1);
  const top = 12, bot = H - padB;
  const X = function (i) { return padL + i * step; };
  const Y = function (v) { return bot - ((v - 0) / (s.max || 1)) * (bot - top); };
  // 面积+线
  let poly = '', line = '';
  for (let i = 0; i < n; i++) {
    const x = X(i).toFixed(1), y = Y(s.data[i]).toFixed(1);
    poly += (i ? ' L' : 'M') + x + ',' + y;
    line += (i ? ' L' : 'M') + x + ',' + y;
  }
  out += '<path d="' + poly + ' L' + X(n - 1).toFixed(1) + ',' + bot + ' L' + padL + ',' + bot + ' Z" fill="rgba(88,166,255,.10)"/>';
  out += '<path d="' + line + '" fill="none" stroke="#58a6ff" stroke-width="2.5" stroke-linejoin="round"/>';
  // 点
  for (let i = 0; i < n; i++) {
    const x = X(i), y = Y(s.data[i]);
    const col = s.patch[i] ? '#e4572e' : (i === n - 1 ? '#f6a21c' : '#9ecbff');
    out += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="4" fill="' + col + '"><title>x=' + i + ' y=' + s.data[i] + '</title></circle>';
  }
  // x 轴刻度（隔几个标一个）
  const skip = Math.ceil(n / 12);
  for (let i = 0; i < n; i += skip) {
    out += '<text x="' + X(i).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="9" fill="#5b6472" font-family="monospace">' + i + '</text>';
  }
  return out;
};
['set', 'patch'].forEach(function (m) { _wrapRec(ChartTracer.prototype, m); });

/* =========================================================
 * 播放器 —— 命令流回放（含后退 checkpoint）
 * ========================================================= */
AV._cpEvery = 150; AV.checkpoints = [];

AV._pushCheckpoint = function () {
  const cp = { pos: AV.pos, states: AV.tracers.map(function (t) { return t._snap(); }) };
  AV.checkpoints.push(cp);
};
AV._nearestCp = function (pos) {
  let best = null;
  for (let i = 0; i < AV.checkpoints.length; i++) {
    if (AV.checkpoints[i].pos <= pos) best = AV.checkpoints[i]; else break;
  }
  return best;
};
AV._restore = function (cp) {
  AV.tracers.forEach(function (t, i) { t.state = JSON.parse(JSON.stringify(cp.states[i])); });
  AV.pos = cp.pos;
};
// 前进到目标位置（从 cp 状态向前重放命令）
AV._forwardTo = function (target) {
  const cp = AV._nearestCp(target);
  AV._restore(cp);
  let guard = 0;
  while (AV.pos < target && AV.pos < AV.commands.length) {
    const c = AV.commands[AV.pos];
    AV.tracers[c.tr]._apply(c.m, c.a);
    AV.curLine = c.line;
    AV.pos++;
    if (++guard > 500000) break;
  }
};
// 播放器 tick
AV.tick = function () {
  if (!AV.playing) return;
  if (AV.pos >= AV.commands.length) { AV.stop(true); return; }
  const target = Math.min(AV.commands.length, AV.pos + AV.speed);
  // 若已越过最近 checkpoint 区间，则中途补存快照
  if (AV.checkpoints.length && AV.pos - AV.checkpoints[AV.checkpoints.length - 1].pos > AV._cpEvery * 2) {
    AV._pushCheckpoint();
  }
  while (AV.pos < target) {
    const c = AV.commands[AV.pos];
    AV.tracers[c.tr]._apply(c.m, c.a);
    AV.curLine = c.line;
    AV.pos++;
  }
  AV._sync();
};
AV._sync = function () {
  AV.tracers.forEach(function (t) { t.render(); });
  if (AV.onUiUpdate) AV.onUiUpdate();
};
AV.play = function () {
  if (AV.pos >= AV.commands.length) AV.pos = 0;
  AV.playing = true;
  if (AV.timer) clearInterval(AV.timer);
  AV.timer = setInterval(AV.tick, AV.tickMs);
  if (AV.onUiUpdate) AV.onUiUpdate();
};
AV.pause = function () { AV.playing = false; if (AV.timer) { clearInterval(AV.timer); AV.timer = null; } if (AV.onUiUpdate) AV.onUiUpdate(); };
AV.stop = function (toEnd) {
  AV.playing = false;
  if (AV.timer) { clearInterval(AV.timer); AV.timer = null; }
  if (toEnd) { AV._forwardTo(AV.commands.length); AV._sync(); }
};
AV.stepFwd = function (k) {
  if (!AV.commands.length) return;
  const target = Math.min(AV.commands.length, AV.pos + (k || 1));
  AV._forwardTo(target);
  AV._sync();
};
AV.stepBack = function (k) {
  if (!AV.commands.length) return;
  AV.playing = false;
  if (AV.timer) { clearInterval(AV.timer); AV.timer = null; }
  const target = Math.max(0, AV.pos - (k || 1));
  AV._forwardTo(target);
  AV._sync();
};
AV.toStart = function () { AV.pause(); AV._forwardTo(0); AV._sync(); };
AV.toEnd = function () { AV.pause(); AV._forwardTo(AV.commands.length); AV._sync(); };
