/* ═══════════════════════════════════════════
   拖拽式可视化 v3 —— 覆盖所有线代几何/向量类可视化
   · onDrag 回调：每个可视化自定义拖拽映射
   · 绕过 step 限制 + rAF 节流 + 松手 snap
   ═══════════════════════════════════════════ */
(function() {
  if (typeof VizEngine === 'undefined' || typeof vizTypes === 'undefined') return;

  VizEngine.toMath = function(sx, sy, xMin, xMax, yMin, yMax) {
    var pad = 40;
    var x = xMin + (sx - pad) / (this.W - 2 * pad) * (xMax - xMin);
    var y = yMin + ((this.H - pad) - sy) / (this.H - 2 * pad) * (yMax - yMin);
    return [x, y];
  };

  var DS = {
    anchors: [],
    active: -1,
    overrides: {},
    rafId: null,
    resetAnchors: function() { this.anchors = []; },
    clear: function() { this.anchors = []; this.active = -1; this.overrides = {}; if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; } },
    register: function(onDrag, mx, my, range) {
      this.anchors.push({ onDrag: onDrag, mx: mx, my: my, range: range });
    },
    hitTest: function(sx, sy) {
      for (var i = 0; i < this.anchors.length; i++) {
        var a = this.anchors[i];
        var p = VizEngine.toScreen(a.mx, a.my, a.range.xMin, a.range.xMax, a.range.yMin, a.range.yMax);
        var dx = sx - p[0], dy = sy - p[1];
        if (dx * dx + dy * dy < 24 * 24) return i;
      }
      return -1;
    },
    scheduleRender: function() {
      if (this.rafId) return;
      var self = this;
      this.rafId = requestAnimationFrame(function() {
        self.rafId = null;
        updateVizWithOverride(self.overrides);
      });
    }
  };
  window._DragSystem = DS;

  function updateVizWithOverride(overrides) {
    var kp = state.currentKP;
    if (!kp) return;
    var viz = vizTypes[kp.viz] || vizTypes['generic'];
    var params = {};
    viz.params.forEach(function(p) {
      var el = document.getElementById('viz-param-' + p.id);
      var val = (overrides && overrides[p.id] !== undefined) ? overrides[p.id] : (el ? parseFloat(el.value) : p.default);
      params[p.id] = val;
      var display = document.getElementById('viz-val-' + p.id);
      if (display) display.textContent = Number.isInteger(val) ? val : val.toFixed(2);
    });
    viz.render(params);
  }

  function clampParam(id, val) {
    var slider = document.getElementById('viz-param-' + id);
    var lo = slider ? parseFloat(slider.min) : -5;
    var hi = slider ? parseFloat(slider.max) : 5;
    return Math.max(lo, Math.min(hi, val));
  }

  function bindCanvas() {
    var cv = document.getElementById('vizCanvas');
    if (!cv || cv._dragBound) return;
    cv._dragBound = true;

    cv.addEventListener('mousedown', function(e) {
      var rect = cv.getBoundingClientRect();
      var sx = e.clientX - rect.left, sy = e.clientY - rect.top;
      var idx = DS.hitTest(sx, sy);
      if (idx >= 0) { DS.active = idx; cv.style.cursor = 'grabbing'; e.preventDefault(); }
    });

    cv.addEventListener('mousemove', function(e) {
      var rect = cv.getBoundingClientRect();
      var sx = e.clientX - rect.left, sy = e.clientY - rect.top;
      if (DS.active >= 0) {
        var a = DS.anchors[DS.active];
        var m = VizEngine.toMath(sx, sy, a.range.xMin, a.range.xMax, a.range.yMin, a.range.yMax);
        var updates = a.onDrag(m[0], m[1]);
        for (var id in updates) {
          DS.overrides[id] = clampParam(id, updates[id]);
        }
        DS.scheduleRender();
        e.preventDefault();
      } else {
        var idx = DS.hitTest(sx, sy);
        cv.style.cursor = idx >= 0 ? 'grab' : 'default';
      }
    });

    function finishDrag() {
      if (DS.active < 0) return;
      for (var id in DS.overrides) {
        var slider = document.getElementById('viz-param-' + id);
        if (slider) slider.value = DS.overrides[id];
      }
      DS.overrides = {};
      DS.active = -1;
      cv.style.cursor = 'default';
      if (typeof updateViz === 'function') updateViz();
    }
    cv.addEventListener('mouseup', finishDrag);
    cv.addEventListener('mouseleave', finishDrag);
  }

  function drawHandles() {
    var V = VizEngine;
    var ctx = V.ctx;
    for (var i = 0; i < DS.anchors.length; i++) {
      var a = DS.anchors[i];
      var r = a.range;
      var sp = V.toScreen(a.mx, a.my, r.xMin, r.xMax, r.yMin, r.yMax);
      // 外圈光晕
      ctx.beginPath();
      ctx.arc(sp[0], sp[1], 12, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(99,102,241,0.18)';
      ctx.fill();
      // 白圈
      V.drawPoint(a.mx, a.my, r.xMin, r.xMax, r.yMin, r.yMax, '#ffffff', 6);
      // 紫心
      V.drawPoint(a.mx, a.my, r.xMin, r.xMax, r.yMin, r.yMax, '#6366f1', 4);
    }
  }

  /* 给 viz 加拖拽的通用包装 */
  function addDrag(vizKey, hooks, hintText) {
    var viz = vizTypes[vizKey];
    if (!viz || !viz.render) return;
    var orig = viz.render;
    viz.render = function(p) {
      DS.resetAnchors();
      orig.call(this, p);
      var r = this.range || { xMin: -6, xMax: 6, yMin: -6, yMax: 6 };
      for (var i = 0; i < hooks.length; i++) {
        var h = hooks[i](p);
        DS.register(h.onDrag, h.mx, h.my, r);
      }
      drawHandles();
      if (hintText) VizEngine.drawText(hintText, r.xMin + 0.3, r.yMax - 0.6, r.xMin, r.xMax, r.yMin, r.yMax, '#8b9ab5', 11, 'left');
    };
  }

  /* ══ 注册各可视化的拖拽 ══ */

  // la-det2：拖动向量端点 = 改变矩阵元素
  addDrag('la-det2', [
    function(p) { return { mx: p.x11, my: p.x21, onDrag: function(mx, my) { return { x11: mx, x21: my }; } }; },
    function(p) { return { mx: p.x12, my: p.x22, onDrag: function(mx, my) { return { x12: mx, x22: my }; } }; }
  ], '拖动圆点改变向量');

  // la-lincomb：拖动组合向量端点 = 改变系数
  addDrag('la-lincomb', [
    function(p) { var k = p.k1 || 1; return { mx: 3 * k, my: 1 * k, onDrag: function(mx) { return { k1: mx / 3 }; } }; },
    function(p) { var k = p.k2 || 1; return { mx: 1 * k, my: 2 * k, onDrag: function(mx) { return { k2: mx }; } }; }
  ], '拖动圆点改变组合系数');

  // la-basechange：拖动新基向量 = 改变旋转角
  addDrag('la-basechange', [
    function(p) { var a = p.ang || 0; return { mx: 4 * Math.cos(a), my: 4 * Math.sin(a), onDrag: function(mx, my) { return { ang: Math.atan2(my, mx) }; } }; },
    function(p) { var a = p.ang || 0; return { mx: -3 * Math.sin(a), my: 3 * Math.cos(a), onDrag: function(mx, my) { return { ang: Math.atan2(-mx, my) }; } }; }
  ], '拖动基向量旋转');

  // la-lintrans：拖动缩放向量 = 改变缩放系数
  addDrag('la-lintrans', [
    function(p) { var k = p.k || 1; return { mx: 3 * k, my: k, onDrag: function(mx) { return { k: mx / 3 }; } }; }
  ], '拖动改变缩放系数');

  // la-transmat：拖动 T(e1) = 改变 a₁₁
  addDrag('la-transmat', [
    function(p) { var a = p.a || 1; return { mx: 3 * a, my: 3 * -0.3, onDrag: function(mx) { return { a: mx / 3 }; } }; }
  ], '拖动改变变换矩阵元素');

  // la-similar：拖动旋转向量 = 改变角度
  addDrag('la-similar', [
    function(p) { var a = p.ang || 0; return { mx: 4 * Math.cos(a), my: 4 * Math.sin(a), onDrag: function(mx, my) { return { ang: Math.atan2(my, mx) }; } }; }
  ], '拖动旋转相似变换');

  // la-depend：拖动第二个向量 = 改变夹角（观察相关/无关）
  addDrag('la-depend', [
    function(p) { var a = 1 + (p.ang || 1); return { mx: a, my: a / 3, onDrag: function(mx) { return { ang: mx - 1 }; } }; }
  ], '拖动向量观察线性相关');

  // la-quadform：拖动椭圆右顶点改 a，拖动上顶点改 b（仅正定椭圆时）
  addDrag('la-quadform', [
    function(p) { var a = p.a || 2; if (a <= 0) return { mx: 0, my: 0, onDrag: function() { return {}; } }; var x = 1.5 * Math.sqrt(1 / a); return { mx: x, my: 0, onDrag: function(mx) { if (mx <= 0.1) return {}; return { a: 2.25 / (mx * mx) }; } }; },
    function(p) { var b = p.b || 1; if (b <= 0) return { mx: 0, my: 0, onDrag: function() { return {}; } }; var y = 1.5 * Math.sqrt(1 / b); return { mx: 0, my: y, onDrag: function(mx, my) { if (my <= 0.1) return {}; return { b: 2.25 / (my * my) }; } }; }
  ], '拖动椭圆顶点改变二次型系数');

  // 绑定 canvas
  var origRenderVizView = window.renderVizView;
  if (origRenderVizView) {
    window.renderVizView = function(ch, kp) {
      DS.clear();
      origRenderVizView(ch, kp);
      setTimeout(bindCanvas, 80);
    };
  } else {
    setInterval(bindCanvas, 500);
  }
})();
