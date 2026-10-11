/* ═══════════════════════════════════════════
   第三阶段 · 交互模块
   A. 概念翻转卡片 | B. 参数滑块增强 | C. 推导步骤动画
   ═══════════════════════════════════════════ */

/* ── A. 概念翻转卡片（在知识详解 Tab 中显示） ── */
function initFlipCard() {
  var el = document.getElementById('viz-tab-content');
  if (!el) return;
  var ch = state.currentChapter, kp = state.currentKP;
  if (!ch || !kp) return;
  var kpIdx = ch.kps.indexOf(kp);
  var detail = getKPDetail(ch.courseId, ch.num, kpIdx);
  var kpName = kp.name, kpDesc = kp.desc;
  var tags = {1:'#6366f1',2:'#0ea5e9',3:'#10b981',4:'#f59e0b',5:'#ec4899',6:'#ef4444'};
  var tc = tags[ch.num] || '#6366f1';
  var tagHtml = '<span class="flip-tag" style="background:'+tc+'22;color:'+tc+'">第'+ch.num+'章</span>';
  var flipHead = '<div class="flip-head">'+tagHtml+'<span style="font-size:18px;font-weight:700">'+kpName+'</span></div>';
  var text = detail ? detail.explanation : '暂无详细讲解';
  var html = text.replace(/\n/g, '<br>');

  el.innerHTML =
    '<div class="flip-card" onclick="this.classList.toggle(\'flipped\')">' +
      '<div class="flip-card-inner">' +
        '<div class="flip-card-front">' +
          flipHead +
          '<div class="flip-front-preview">'+(kpDesc||'点击卡片查看完整详解')+'</div>' +
          '<div class="flip-hint">点击翻转查看详解</div>' +
        '</div>' +
        '<div class="flip-card-back">' +
          flipHead +
          '<div class="flip-back-content">'+html+'</div>' +
          '<div class="flip-hint">点击翻回</div>' +
        '</div>' +
      '</div>' +
    '</div>';

  setTimeout(function(){ renderMath(el); }, 80);
}

/* ── B. 参数滑块增强（实时数值脉动 + 大号控件） ── */
function initLiveSliders() {
  var sliders = document.querySelectorAll('[id^="viz-param-"]');
  sliders.forEach(function(s) {
    if (s._enhanced) return;
    s._enhanced = true;

    var valId = 'viz-val-' + s.id.replace('viz-param-','');
    var display = document.getElementById(valId);
    if (display) {
      display.style.fontSize = '22px';
      display.style.fontWeight = '700';
      display.style.color = 'var(--accent)';
    }

    s.addEventListener('input', function() {
      if (display) {
        var v = parseFloat(s.value);
        display.textContent = Number.isInteger(v) ? v : v.toFixed(2);
        display.classList.add('viz-val-pulse');
        setTimeout(function(){ display.classList.remove('viz-val-pulse'); }, 300);
      }
    });
  });
}

/* ── C. 推导步骤动画（逐步展开计算过程） ── */
function showStepAnimation(steps) {
  var container = document.getElementById('viz-tab-content');
  if (!container) return;

  var existing = document.getElementById('step-anim-container');
  if (existing) { existing.remove(); return; }

  var wrap = document.createElement('div');
  wrap.id = 'step-anim-container';
  wrap.className = 'step-reveal-wrap';
  wrap.innerHTML = steps.map(function(s, i) {
    return '<div class="step-reveal-item" style="opacity:0;transform:translateY(12px);transition:all 0.4s ease">' +
      '<span class="step-num">'+(i+1)+'</span>' +
      '<span class="step-body">'+s.replace(/</g,'&lt;').replace(/\n/g,'<br>')+'</span>' +
    '</div>';
  }).join('') +
  '<div style="margin-top:12px;display:flex;gap:8px">' +
    '<button class="vp-btn vp-btn-primary" onclick="toggleAllSteps()">展开全部</button>' +
    '<button class="vp-btn" onclick="var e=document.getElementById(\'step-anim-container\');if(e)e.remove()">关闭</button>' +
  '</div>';

  container.after(wrap);

  // 逐渐展示
  var idx = 0;
  function reveal() {
    var elems = wrap.querySelectorAll('.step-reveal-item');
    if (idx < elems.length) {
      elems[idx].style.opacity = '1';
      elems[idx].style.transform = 'translateY(0)';
      idx++;
      setTimeout(reveal, 300);
    }
  }
  setTimeout(reveal, 100);
  setTimeout(function(){ renderMath(wrap); }, 50);
}

function toggleAllSteps() {
  var items = document.querySelectorAll('#step-anim-container .step-reveal-item');
  if (!items.length) return;
  var allShown = items[0].style.opacity === '1';
  items.forEach(function(item) {
    item.style.opacity = allShown ? '0' : '1';
    item.style.transform = allShown ? 'translateY(12px)' : 'translateY(0)';
  });
  var btn = document.querySelector('#step-anim-container .vp-btn-primary');
  if (btn) btn.textContent = allShown ? '逐步展示' : '收起全部';
}

/* ══ 自动挂载钩子 ══ */
(function() {
  // 等 DOM 和 app.js 加载完毕后挂载
  var ready = setInterval(function() {
    if (typeof state !== 'undefined' && typeof VizEngine !== 'undefined') {
      clearInterval(ready);
      patchApp();
    }
  }, 200);

  function patchApp() {
    // Hook 1: 知识详解翻转为翻转卡片
    var origSwitchVizTab = window.switchVizTab;
    if (origSwitchVizTab) {
      window.switchVizTab = function(tab, btn) {
        origSwitchVizTab(tab, btn);
        if (tab === 'detail') {
          var ch = state.currentChapter;
          if (ch && ch.courseId === 'la') {
            setTimeout(initFlipCard, 100);
          }
        }
      };
    }

    // Hook 2: 滑块增强 - 在 VizEngine.init 之后触发
    var origInit = VizEngine.init;
    if (origInit) {
      VizEngine.init = function(canvas) {
        origInit.call(VizEngine, canvas);
        setTimeout(initLiveSliders, 300);
      };
    }

    // 注: 不再 monkey-patch renderDeterminantResult / renderRowReduceResult
    // 因为它们的真实签名是 (origM, detSteps) 返回 HTML 字符串，与 DOM 操作签名不兼容
    // 推导步骤动画改在 runLinearAlgebraTool 末尾直接调用 showStepAnimation
  }
})();
