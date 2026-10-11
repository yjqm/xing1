/* ═══════════════════════════════════════════
   预测-验证循环（Predict-Validate）
   针对 la-det2（行列式符号）和 la-depend（线性相关）
   先预测 → 验证 → 反馈，体现"预测-验证-反思"教学闭环
   ═══════════════════════════════════════════ */
(function() {
  function randInt(min, max) {
    if (min === undefined) min = -4;
    if (max === undefined) max = 4;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  // 确保非零整数
  function randNZ() {
    var v = randInt(-4, 4);
    return v === 0 ? (Math.random() < 0.5 ? 1 : -1) : v;
  }

  window._predictChallenge = null;

  function buildChallenge(viz) {
    if (viz === 'la-det2') {
      var a = randNZ(), b = randInt(), c = randInt(), d = randNZ();
      var det = a * d - b * c;
      var ans = det > 0 ? 0 : (det < 0 ? 1 : 2);
      return {
        title: '行列式符号预测',
        question: '矩阵 <b>[' + a + ' ' + b + '; ' + c + ' ' + d + ']</b> 的行列式 det 是？',
        options: ['正数', '负数', '零'],
        answer: ans,
        explain: 'det = a·d − b·c = ' + a + '×' + d + ' − ' + b + '×' + c + ' = <b>' + det + '</b>' + (det > 0 ? '（正）' : det < 0 ? '（负）' : '（零）'),
        hint: '对应几何意义：det 的符号决定向量方向（顺时针/逆时针），绝对值是平行四边形面积'
      };
    } else if (viz === 'la-depend') {
      var correlated = Math.random() < 0.5;
      var v1x = randNZ(), v1y = randInt();
      var k = randNZ();
      var v2x, v2y;
      if (correlated) {
        v2x = v1x * k; v2y = v1y * k;
        if (v2x === 0 && v2y === 0) { v2x = v1x; v2y = v1y; }
      } else {
        do { v2x = randInt(); v2y = randInt(); } while (v1x * v2y - v1y * v2x === 0 || (v2x === 0 && v2y === 0));
      }
      return {
        title: '线性相关性预测',
        question: '向量 <b>(' + v1x + ', ' + v1y + ')</b> 和 <b>(' + v2x + ', ' + v2y + ')</b> 是否线性相关？',
        options: ['线性相关', '线性无关'],
        answer: correlated ? 0 : 1,
        explain: correlated ? ('第二个向量 = ' + k + '×第一个向量，共线 → 线性相关') : ('两向量不共线（x₁y₂−y₁x₂=' + (v1x * v2y - v1y * v2x) + ' ≠ 0）→ 线性无关'),
        hint: '线性相关 = 两向量共线（一个可被另一个线性表出）；线性无关 = 不共线'
      };
    }
    return null;
  }

  function renderModal(c) {
    var html = '';
    html += '<div class="predict-q">' + c.question + '</div>';
    html += '<div class="predict-options">';
    for (var i = 0; i < c.options.length; i++) {
      html += '<button class="predict-opt" onclick="predictChoose(' + i + ', this)">' + c.options[i] + '</button>';
    }
    html += '</div>';
    html += '<div id="predictResult" class="predict-result"></div>';
    return html;
  }

  // 浮动面板可拖拽
  function makeDraggable(el) {
    var head = el.querySelector('.predict-panel-head');
    if (!head) return;
    head.style.cursor = 'move';
    head.addEventListener('mousedown', function(e) {
      var startX = e.clientX, startY = e.clientY;
      var origX = el.offsetLeft, origY = el.offsetTop;
      function move(e2) {
        el.style.left = (origX + e2.clientX - startX) + 'px';
        el.style.top = (origY + e2.clientY - startY) + 'px';
        el.style.right = 'auto';
        el.style.bottom = 'auto';
      }
      function up() {
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
      }
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
      e.preventDefault();
    });
  }

  window.openPredictChallenge = function() {
    var kp = state.currentKP;
    if (!kp) return;
    window._predictChallenge = buildChallenge(kp.viz);
    if (!window._predictChallenge) { alert('当前知识点暂无预测挑战'); return; }

    // 右下角浮动面板（不遮挡画布，可拖动，边答题边拖动可视化）
    var panel = document.getElementById('predictPanel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'predictPanel';
      panel.className = 'predict-panel';
      panel.innerHTML =
        '<div class="predict-panel-head">' +
        '<span id="predictTitle"></span>' +
        '<button class="predict-panel-close" onclick="closePredictChallenge()">✕</button>' +
        '</div>' +
        '<div id="predictBody"></div>' +
        '<div class="predict-tip" id="predictTip" style="display:none"></div>' +
        '<button class="btn btn-outline" style="width:100%;margin-top:10px;padding:8px" onclick="openPredictChallenge()">换一题</button>';
      document.body.appendChild(panel);
      makeDraggable(panel);
    }
    document.getElementById('predictTitle').textContent = '🎯 ' + window._predictChallenge.title;
    document.getElementById('predictBody').innerHTML = renderModal(window._predictChallenge);
    document.getElementById('predictTip').textContent = window._predictChallenge.hint;
    document.getElementById('predictTip').style.display = 'none';
    panel.style.display = 'block';
  };

  window.closePredictChallenge = function() {
    var panel = document.getElementById('predictPanel');
    if (panel) panel.style.display = 'none';
  };

  window.predictChoose = function(idx, btn) {
    var c = window._predictChallenge;
    if (!c) return;
    var correct = idx === c.answer;
    var result = document.getElementById('predictResult');
    var options = document.querySelectorAll('.predict-opt');
    // 禁用所有选项
    for (var i = 0; i < options.length; i++) { options[i].disabled = true; }
    // 高亮正确和错误
    for (var i = 0; i < options.length; i++) {
      if (i === c.answer) options[i].style.borderColor = '#10b981';
      if (i === idx && !correct) options[i].style.borderColor = '#ef4444';
    }
    if (correct) {
      result.innerHTML = '<div style="color:#10b981;font-weight:600">✅ 答对了！</div><div style="margin-top:6px">' + c.explain + '</div>';
    } else {
      result.innerHTML = '<div style="color:#ef4444;font-weight:600">❌ 再想想</div><div style="margin-top:6px">正确答案：' + c.explain + '</div>';
    }
    // 显示提示
    var tip = document.getElementById('predictTip');
    if (tip) tip.style.display = 'block';
    // 展示验证：回到画布看实际图形
    if (correct) {
      setTimeout(function() {
        result.innerHTML += '<div style="margin-top:8px;color:#8b9ab5;font-size:12px">💡 拖动圆点验证一下，看看图形变化</div>';
      }, 300);
    }
  };

  /* 在 renderVizView 后加预测挑战按钮（针对 det2 和 depend） */
  function injectButton() {
    var kp = state.currentKP;
    if (!kp) return;
    if (kp.viz !== 'la-det2' && kp.viz !== 'la-depend') {
      // 临时调试：所有知识点都加按钮
      if (window._predictDebug) {
        var btn2 = document.createElement('button');
        btn2.className = 'predict-btn';
        btn2.textContent = '🎯 预测(' + kp.viz + ')';
        btn2.onclick = function() {
          alert('当前 viz: ' + kp.viz + '\ntypeof openPredictChallenge: ' + typeof openPredictChallenge);
        };
        var top2 = document.querySelector('.viz-canvas-top');
        if (top2 && !top2.querySelector('.predict-btn')) top2.appendChild(btn2);
      }
      return;
    }
    var top = document.querySelector('.viz-canvas-top');
    if (!top) { console.log('[predict] no .viz-canvas-top'); return; }
    if (top.querySelector('.predict-btn')) return;
    var btn = document.createElement('button');
    btn.className = 'predict-btn';
    btn.textContent = '🎯 预测挑战';
    btn.onclick = function(e) {
      e.preventDefault();
      console.log('[predict] button clicked, viz=', state.currentKP && state.currentKP.viz);
      try { openPredictChallenge(); } catch(err) { alert('预测挑战出错：' + err.message); console.error(err); }
    };
    top.appendChild(btn);
    console.log('[predict] button injected');
  }

  // 兜底：直接挂到 document 上，任何 .predict-btn 点击都触发
  document.addEventListener('click', function(e) {
    if (e.target && e.target.classList && e.target.classList.contains('predict-btn')) {
      // 让按钮自己的 onclick 处理
    }
  });

  var origRenderVizView = window.renderVizView;
  if (origRenderVizView) {
    window.renderVizView = function(ch, kp) {
      origRenderVizView(ch, kp);
      setTimeout(injectButton, 80);
    };
  }
})();
