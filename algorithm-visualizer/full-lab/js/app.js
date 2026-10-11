/* =========================================================
 * app.js —— 应用控制器：算法树 / 代码面板 / 工具栏 / 键盘
 * ========================================================= */
"use strict";
(function () {
  // ---------- 聚合算法库 ----------
  var ALGS = []
    .concat(window.__ALG_SORT || [])
    .concat(window.__ALG_SEARCH || [])
    .concat(window.__ALG_GRAPH || [])
    .concat(window.__ALG_GRAPH2 || [])
    .concat(window.__ALG_TREE || [])
    .concat(window.__ALG_DP || []);
  ALGS.forEach(function (a, i) { a.id = i; });
  window.ALGS = ALGS;

  var $ = function (id) { return document.getElementById(id); };
  var els = {
    tree: $('algTree'), title: $('algTitle'), cat: $('algCat'),
    desc: $('descBar'), lineNum: $('lineNum'), codeView: $('codeView'),
    stack: $('canvasStack'), logView: $('logView'), viewSwitch: $('viewSwitch'),
    status: $('statusBar'), stepInfo: $('stepInfo'), cmdInfo: $('cmdInfo'),
    btnBack: $('btnBack'), btnPlay: $('btnPlay'), btnFwd: $('btnFwd'),
    btnEnd: $('btnEnd'), btnReset: $('btnReset'), btnRun: $('btnRun'),
    btnClear: $('btnClear'), speed: $('speedSlider'), speedVal: $('speedVal'),
    toast: $('errToast'), codeWrap: $('codeWrap'),
    codeEditor: $('codeEditor'), btnCustom: $('btnCustom'), langSel: $('langSel')
  };

  var cur = null;         // 当前算法对象
  var curLines = [];      // 代码行数组
  var codeEls = [];       // 每行 DOM
  var editing = false;    // 自定义代码编辑模式
  var curLang = 'js';     // 自定义代码当前语言：js / c / cpp / py
  var drafts = {};        // 各语言的编辑草稿（切换语言不丢内容）
  var runToken = 0;       // 运行令牌：仅最后一次运行的回调生效，防止重入叠加

  // 自定义代码默认示例：由 langs.js 提供四种语言的冒泡排序模板
  // JS 模板与原版一致
  var CUSTOM_SAMPLE = function () { return AVLang.LANGS[curLang].sample; };

  /* ================= 语法高亮（单遍扫描） ================= */
  var KW = new Set(('const let var function return if else while for do break continue ' +
    'new true false null typeof in of switch case default class this void delete').split(' '));
  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function isWord(c) { return /[A-Za-z_$0-9]/.test(c); }
  function highlightLine(line) {
    var out = '';
    var i = 0, n = line.length;
    while (i < n) {
      var ch = line[i];
      if (ch === '/' && line[i + 1] === '/') {
        out += '<span class="cm">' + esc(line.slice(i)) + '</span>';
        break;
      }
      if (ch === "'" || ch === '"' || ch === '`') {
        var q = ch, j = i + 1, buf = ch;
        while (j < n) {
          buf += line[j];
          if (line[j] === '\\' && j + 1 < n) { buf += line[j + 1]; j += 2; continue; }
          if (line[j] === q) { j++; break; }
          j++;
        }
        out += '<span class="st">' + esc(buf) + '</span>';
        i = j; continue;
      }
      if (/[A-Za-z_$]/.test(ch)) {
        var j2 = i + 1;
        while (j2 < n && isWord(line[j2])) j2++;
        var word = line.slice(i, j2);
        var after = line[j2];
        if (KW.has(word)) out += '<span class="kw">' + word + '</span>';
        else if (after === '(') out += '<span class="fn">' + word + '</span>';
        else out += '<span class="nm">' + word + '</span>';
        i = j2; continue;
      }
      if (/\d/.test(ch)) {
        var j3 = i + 1;
        while (j3 < n && /[\d.a-zA-Z]/.test(line[j3])) j3++;
        out += '<span class="nu">' + esc(line.slice(i, j3)) + '</span>';
        i = j3; continue;
      }
      out += esc(ch);
      i++;
    }
    return out;
  }

  /* ================= 自定义代码编辑模式 ================= */
  function enterEdit() {
    editing = true;
    if (!drafts[curLang]) drafts[curLang] = CUSTOM_SAMPLE();
    els.codeEditor.value = drafts[curLang];
    els.langSel.value = curLang;
    els.langSel.style.display = '';
    els.codeEditor.style.display = '';
    els.codeWrap.style.display = 'none';
    els.title.textContent = '自定义代码';
    els.cat.textContent = '自定义';
    els.desc.textContent = '选择编程语言后编写算法（使用各类 Tracer）。C/C++/Python 为刷题常用语法子集，运行时自动转译执行。点“▶ 运行”即可在右侧可视化。';
    els.btnCustom.textContent = '✓ 退出编辑';
    els.btnCustom.classList.add('on');
    setStatus('自定义代码模式 · ' + AVLang.LANGS[curLang].label);
  }
  function exitEdit() {
    if (editing) drafts[curLang] = els.codeEditor.value;   // 保存当前语言草稿
    editing = false;
    els.codeEditor.style.display = 'none';
    els.codeWrap.style.display = '';
    els.langSel.style.display = 'none';
    els.btnCustom.textContent = '✎ 自定义代码';
    els.btnCustom.classList.remove('on');
  }

  /* ================= 载入算法到代码面板 ================= */
  function loadAlg(alg, autoRun) {
    if (editing) exitEdit();   // 从算法树载入时退出编辑模式
    cur = alg;
    curLines = alg.code.split('\n');
    els.title.textContent = alg.name;
    els.cat.textContent = alg.cat;
    els.desc.textContent = alg.desc || '';
    // 行号
    var ln = '';
    for (var i = 0; i < curLines.length; i++) ln += '<div>' + (i + 1) + '</div>';
    els.lineNum.innerHTML = ln;
    // 代码
    var cv = '';
    for (var k = 0; k < curLines.length; k++) {
      cv += '<div class="cl" data-l="' + k + '">' + highlightLine(curLines[k]) + '</div>';
    }
    els.codeView.innerHTML = cv;
    codeEls = els.codeView.children;
    // 树高亮
    var items = els.tree.querySelectorAll('.alg-item');
    for (var m = 0; m < items.length; m++) {
      items[m].classList.toggle('active', parseInt(items[m].dataset.id, 10) === alg.id);
    }
    if (autoRun !== false) runAlg();
  }

  /* ================= 运行算法 ================= */
  function clearViz() {
    AV.stop();
    els.stack.innerHTML = '';
    els.logView.style.display = 'none';
    els.stack.style.display = '';
  }
  function runAlg() {
    var alg = cur;
    if (editing) {
      var src = els.codeEditor.value;
      drafts[curLang] = src;
      var runCode = src;
      if (curLang !== 'js') {
        // C/C++/Python → JS 子集转译
        try { runCode = AVLang.transpile(curLang, src); }
        catch (e) { toast('转译失败: ' + e.message); setStatus('转译错误'); return; }
      }
      alg = { id: -1, name: '我的代码 · ' + AVLang.LANGS[curLang].label, cat: '自定义', desc: '用户自定义', code: runCode };
    }
    if (!alg || !alg.code) return;
    clearViz();
    var myToken = ++runToken;   // 标记本次运行；若随后又启动新运行，本次回调应作废
    setStatus('运行中…');
    AV.onUiUpdate = updateUI;
    AV.runAlgorithm(alg, function () {
      if (myToken !== runToken) return;   // 已有更新的运行，丢弃本次结果
      // 为每个 tracer 建 DOM
      AV.tracers.forEach(function (tr) {
        tr.ensureDom(els.stack);
        tr.render();
      });
      applyView(els.viewSwitch.value);
      updateUI();
      AV.play();
      setStatus('播放中');
    }, function (msg) {
      if (myToken !== runToken) return;
      toast(msg);
      setStatus('错误');
    });
  }

  /* ================= UI 刷新 ================= */
  function updateUI() {
    var total = AV.commands.length;
    var pos = AV.pos;
    // 代码行高亮：当前命令关联行
    var line = pos > 0 ? (AV.commands[pos - 1].line !== undefined ? AV.commands[pos - 1].line : -1) : -1;
    if (AV.curAlg && !editing) {
      for (var i = 0; i < codeEls.length; i++) codeEls[i].classList.remove('hl');
      if (line >= 0 && line < codeEls.length) {
        var el = codeEls[line];
        el.classList.add('hl');
        if (el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
      }
    }
    els.stepInfo.textContent = total ? (pos + ' / ' + total) : '';
    els.cmdInfo.textContent = '命令: ' + pos + ' / ' + total;
    els.btnPlay.textContent = AV.playing ? '⏸' : '▶';
    els.status.textContent = (AV.curAlg ? AV.curAlg.name + ' · ' : '') +
      (AV.playing ? '播放中' : pos >= total && total ? '已结束' : (pos ? '暂停 @' + pos : '就绪'));
  }

  /* ================= 视图切换 ================= */
  function applyView(v) {
    var showLog = v === 'log';
    var logMode = v === 'auto' ? false : showLog;
    els.stack.style.display = showLog ? 'none' : '';
    els.logView.style.display = showLog ? '' : 'none';
    if (showLog) {
      // 汇总日志内容
      var buf = '';
      AV.tracers.forEach(function (tr) {
        if (tr.key === 'log') {
          buf += '■ ' + tr.name + '\n' + tr.state.lines.join('\n') + '\n\n';
        }
      });
      els.logView.textContent = buf || '(无日志输出)';
      els.logView.scrollTop = els.logView.scrollHeight;
    }
    void logMode;
  }

  /* ================= 工具条 ================= */
  function setStatus(s) { els.status.textContent = s; }
  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.style.display = 'block';
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { els.toast.style.display = 'none'; }, 6000);
  }

  // 工具栏按钮
  els.btnPlay.addEventListener('click', function () {
    if (!AV.commands.length) return runAlg();
    if (AV.playing) AV.pause(); else AV.play();
    updateUI();
  });
  els.btnReset.addEventListener('click', function () { AV.toStart(); });
  els.btnBack.addEventListener('click', function () { AV.stepBack(); });
  els.btnFwd.addEventListener('click', function () { AV.stepFwd(); });
  els.btnEnd.addEventListener('click', function () { AV.toEnd(); });
  els.btnRun.addEventListener('click', runAlg);
  els.btnCustom.addEventListener('click', function () {
    if (editing) exitEdit(); else enterEdit();
  });
  // 语言切换：保存当前草稿，载入目标语言草稿/模板
  els.langSel.addEventListener('change', function () {
    if (!editing) return;
    drafts[curLang] = els.codeEditor.value;
    curLang = this.value;
    if (!drafts[curLang]) drafts[curLang] = CUSTOM_SAMPLE();
    els.codeEditor.value = drafts[curLang];
    setStatus('自定义代码模式 · ' + AVLang.LANGS[curLang].label);
  });
  els.btnClear.addEventListener('click', function () {
    AV.resetRuntime(); clearViz(); els.logView.textContent = '';
    els.stepInfo.textContent = ''; els.cmdInfo.textContent = '命令: 0 / 0';
    updateUI();
  });
  els.speed.addEventListener('input', function () {
    AV.speed = parseInt(els.speed.value, 10);
    els.speedVal.textContent = AV.speed + 'x';
  });
  els.viewSwitch.addEventListener('change', function () { applyView(this.value); });

  // 键盘
  document.addEventListener('keydown', function (e) {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.code === 'Space') { e.preventDefault(); els.btnPlay.click(); }
    else if (e.key === 'ArrowRight') { AV.stepFwd(); updateUI(); }
    else if (e.key === 'ArrowLeft') { AV.stepBack(); updateUI(); }
    else if (e.key === 'ArrowUp') { AV.toStart(); }
    else if (e.key === 'ArrowDown') { AV.toEnd(); }
    else if (e.key === 'r' || e.key === 'R' || e.key === 'F5') {
      if (e.key === 'F5') e.preventDefault();
      runAlg();
    }
  });

  /* ================= 算法树 ================= */
  function buildTree() {
    var cats = [];
    ALGS.forEach(function (a) {
      if (!cats.some(function (c) { return c.name === a.cat; })) cats.push({ name: a.cat, items: [] });
      cats.forEach(function (c) { if (c.name === a.cat) c.items.push(a); });
    });
    var html = '';
    cats.forEach(function (c) {
      html += '<div class="cat-name"><span>' + c.name + '</span><span class="caret">▼</span></div>';
      html += '<div class="cat-items">';
      c.items.forEach(function (a) {
        html += '<div class="alg-item" data-id="' + a.id + '" data-cat="' + c.name + '">' + a.name + '</div>';
      });
      html += '</div>';
    });
    els.tree.innerHTML = html;
    els.tree.addEventListener('click', function (e) {
      var it = e.target.closest('.alg-item');
      if (it) { loadAlg(ALGS[parseInt(it.dataset.id, 10)]); return; }
      var cn = e.target.closest('.cat-name');
      if (cn) {
        var items = cn.nextElementSibling;
        var hide = items.style.display === 'none';
        items.style.display = hide ? '' : 'none';
        cn.querySelector('.caret').textContent = hide ? '▼' : '▶';
      }
    });
  }

  /* ================= 启动 ================= */
  buildTree();
  AV.speed = parseInt(els.speed.value, 10);
  els.speedVal.textContent = AV.speed + 'x';
  if (ALGS.length) loadAlg(ALGS[0]);
})();
