/* 周文宇版的快捷命令、课程知识图谱与公式实验记录，适配统一主站。 */
(function () {
  'use strict';

  var Tools = {};
  var commands = [];
  var filtered = [];
  var activeIndex = 0;
  var historyKey = 'hdt_labhistory_v2';
  var history = loadHistory();
  var currentTool = '';
  var templates = [
    { tool: 'integral', label: '∫ x·sin(x) dx', values: { fmFunc: 'x*sin(x)' } },
    { tool: 'integral', label: '∫₀^π sin(x) dx', values: { fmFunc: 'sin(x)', fmLower: '0', fmUpper: 'PI' } },
    { tool: 'limit', label: 'lim sin(x)/x（x→0）', values: { fmFunc: 'sin(x)/x', fmLimit: '0' } },
    { tool: 'derivative', label: '(x²·eˣ)′', values: { fmFunc: 'x^2*exp(x)', fmOrder: '1' } },
    { tool: 'normal-prob', label: '标准正态 P(-1.96<Z<1.96)', values: { fmMu: '0', fmSigma2: '1', fmA: '-1.96', fmB: '1.96' } }
  ];

  function esc(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function buildCommands() {
    commands = [];
    (typeof coursesData !== 'undefined' ? coursesData : []).filter(function (c) { return c.available; }).forEach(function (course) {
      commands.push({ type: '课程', label: course.name, sub: course.version || '', run: function () { navigate('courses'); openCourse(course.id); } });
    });
    (typeof chaptersData !== 'undefined' ? chaptersData : []).forEach(function (chapter) {
      var course = coursesData.find(function (c) { return c.id === chapter.courseId; });
      commands.push({ type: '章节', label: '第' + chapter.num + '章 ' + chapter.title, sub: course ? course.name : '', run: function () { Tools.openKP(chapter.courseId, chapter.num); } });
      (chapter.kps || []).forEach(function (kp, index) {
        commands.push({ type: '知识点', label: kp.name, sub: (course ? course.name + ' · ' : '') + '第' + chapter.num + '章', run: function () { Tools.openKP(chapter.courseId, chapter.num, index); } });
      });
    });
    [
      ['dashboard', '仪表盘'], ['chat', 'AI 辅导'], ['courses', '课程中心'], ['questions', '课程题库'],
      ['lab', '公式实验室'], ['algo', '算法可视化'], ['favorites', '我的收藏'], ['wrongbook', '错题本'],
      ['profile', '个人中心'], ['settings', '设置'], ['teacher', '教学管理']
    ].forEach(function (item) {
      commands.push({ type: '页面', label: item[1], sub: '跳转', run: function () { navigate(item[0]); } });
    });
  }

  Tools.openKP = function (courseId, chapterNum, kpIdx) {
    navigate('courses');
    openCourse(courseId);
    openChapterView(chapterNum, courseId);
    if (kpIdx !== undefined) setTimeout(function () { openVizView(chapterNum, kpIdx); }, 20);
  };

  function ensureCommandPalette() {
    var overlay = document.getElementById('ltCmdOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'ltCmdOverlay';
    overlay.className = 'lt-cmd-overlay';
    overlay.innerHTML = '<div class="lt-cmd-panel"><input id="ltCmdInput" class="lt-cmd-input" placeholder="搜索课程、章节、知识点或页面…" autocomplete="off">' +
      '<div id="ltCmdResults" class="lt-cmd-results"></div><div class="lt-cmd-footer"><span>↑↓ 选择</span><span>Enter 打开</span><span>Esc 关闭</span></div></div>';
    overlay.addEventListener('click', function (event) { if (event.target === overlay) Tools.closeCommands(); });
    document.body.appendChild(overlay);
    document.getElementById('ltCmdInput').addEventListener('input', function () { renderCommands(this.value); });
    return overlay;
  }

  function renderCommands(query) {
    var keyword = String(query || '').trim().toLowerCase();
    filtered = commands.filter(function (item) {
      return !keyword || (item.label + ' ' + item.sub + ' ' + item.type).toLowerCase().indexOf(keyword) >= 0;
    }).slice(0, 30);
    activeIndex = 0;
    var box = document.getElementById('ltCmdResults');
    if (!box) return;
    if (!filtered.length) { box.innerHTML = '<div class="lt-cmd-empty">没有匹配结果</div>'; return; }
    box.innerHTML = filtered.map(function (item, index) {
      return '<div class="lt-cmd-item' + (index === 0 ? ' active' : '') + '" data-index="' + index + '"><span class="lt-cmd-type">' + esc(item.type) + '</span><span class="lt-cmd-label">' + esc(item.label) + '</span><span class="lt-cmd-sub">' + esc(item.sub) + '</span></div>';
    }).join('');
    box.querySelectorAll('.lt-cmd-item').forEach(function (element) {
      element.addEventListener('mousedown', function () { runCommand(Number(element.dataset.index)); });
    });
  }

  function paintActive() {
    var items = document.querySelectorAll('.lt-cmd-item');
    items.forEach(function (item, index) { item.classList.toggle('active', index === activeIndex); });
    if (items[activeIndex]) items[activeIndex].scrollIntoView({ block: 'nearest' });
  }

  function runCommand(index) {
    var item = filtered[index];
    if (!item) return;
    Tools.closeCommands();
    item.run();
  }

  Tools.openCommands = function () {
    buildCommands();
    var overlay = ensureCommandPalette();
    overlay.style.display = 'flex';
    var input = document.getElementById('ltCmdInput');
    input.value = '';
    renderCommands('');
    setTimeout(function () { input.focus(); }, 10);
  };

  Tools.closeCommands = function () {
    var overlay = document.getElementById('ltCmdOverlay');
    if (overlay) overlay.style.display = 'none';
  };

  function injectCourseTools() {
    var root = document.getElementById('chapters-view');
    var course = typeof state !== 'undefined' ? state.currentCourse : null;
    if (!root || !course || root.querySelector('.lt-course-tools')) return;
    var bar = root.querySelector('.view-back-bar');
    if (!bar) return;
    var tools = document.createElement('div');
    tools.className = 'lt-course-tools';
    tools.innerHTML = '<button class="btn btn-outline" type="button">章节导航</button><button class="btn btn-outline" type="button">知识图谱</button>';
    tools.children[0].onclick = function () { toggleChapterNav(root, course.id); };
    tools.children[1].onclick = function () { toggleKnowledgeMap(root, course.id); };
    bar.appendChild(tools);
    var cards = root.querySelectorAll('.chapter-card');
    var chapters = chaptersData.filter(function (chapter) { return chapter.courseId === course.id; });
    cards.forEach(function (card, index) { if (chapters[index]) card.id = 'ltChapter-' + course.id + '-' + chapters[index].num; });
  }

  function toggleChapterNav(root, courseId) {
    var existing = root.querySelector('.lt-chapter-nav');
    if (existing) { existing.remove(); return; }
    var chapters = chaptersData.filter(function (chapter) { return chapter.courseId === courseId; });
    var details = document.createElement('details');
    details.className = 'lt-chapter-nav';
    details.open = true;
    details.innerHTML = '<summary>章节导航 · ' + chapters.length + ' 章</summary><div class="lt-chapter-list">' + chapters.map(function (chapter) {
      var done = typeof countStudiedInChapter === 'function' ? countStudiedInChapter(chapter) : 0;
      return '<button class="lt-chapter-link" data-num="' + chapter.num + '"><span>第' + chapter.num + '章 ' + esc(chapter.title) + '</span><span>' + done + '/' + chapter.kps.length + '</span></button>';
    }).join('') + '</div>';
    var progress = root.querySelector('.course-progress-summary');
    (progress || root.firstChild).insertAdjacentElement('afterend', details);
    details.querySelectorAll('.lt-chapter-link').forEach(function (button) {
      button.onclick = function () {
        var card = document.getElementById('ltChapter-' + courseId + '-' + button.dataset.num);
        if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      };
    });
  }

  function toggleKnowledgeMap(root, courseId) {
    var existing = root.querySelector('.lt-map-wrap');
    if (existing) { existing.remove(); return; }
    var chapters = chaptersData.filter(function (chapter) { return chapter.courseId === courseId; });
    var box = document.createElement('section');
    box.className = 'lt-map-wrap';
    box.innerHTML = '<div class="lt-map-head"><strong>知识图谱 · 学习路径</strong><small>绿色表示已学</small></div><div class="lt-map-scroll">' + chapters.map(function (chapter) {
      return '<div class="lt-map-chapter"><div class="lt-map-title">第' + chapter.num + '章 · ' + esc(chapter.title) + '</div><div class="lt-map-kps">' + (chapter.kps || []).map(function (kp, index) {
        var key = typeof studKPKey === 'function' ? studKPKey(courseId, chapter.num, index) : '';
        var done = key && typeof isStudied === 'function' && isStudied(key);
        return '<button class="lt-map-kp' + (done ? ' done' : '') + '" data-chapter="' + chapter.num + '" data-kp="' + index + '">' + esc(kp.name) + '</button>';
      }).join('') + '</div></div>';
    }).join('') + '</div>';
    var progress = root.querySelector('.course-progress-summary');
    (progress || root.firstChild).insertAdjacentElement('afterend', box);
    box.querySelectorAll('.lt-map-kp').forEach(function (button) {
      button.onclick = function () { Tools.openKP(courseId, Number(button.dataset.chapter), Number(button.dataset.kp)); };
    });
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function loadHistory() {
    try { var value = JSON.parse(localStorage.getItem(historyKey) || '[]'); return Array.isArray(value) ? value : []; }
    catch (e) { return []; }
  }

  function saveHistory() {
    try { localStorage.setItem(historyKey, JSON.stringify(history.slice(0, 30))); } catch (e) {}
  }

  function captureInputs() {
    var body = document.getElementById('formulaModalBody');
    if (!body) return '';
    var values = [];
    body.querySelectorAll('input,select,textarea').forEach(function (element) {
      if (element.id && element.value) values.push(element.id + '=' + String(element.value).slice(0, 80));
    });
    return values.join(' · ');
  }

  function recordFormula(tool) {
    var result = document.getElementById('fmResult');
    if (!result || result.style.display === 'none') return;
    var text = String(result.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 300);
    if (!text) return;
    history.unshift({ tool: tool, title: (document.getElementById('formulaModalTitle') || {}).textContent || tool, inputs: captureInputs(), result: text, time: Date.now() });
    history = history.slice(0, 30);
    saveHistory();
  }

  function injectLabActions() {
    var body = document.getElementById('formulaModalBody');
    if (!body || body.querySelector('.lt-lab-actions')) return;
    var actions = document.createElement('div');
    actions.className = 'lt-lab-actions';
    actions.innerHTML = '<button class="btn btn-outline" type="button">模板</button><button class="btn btn-outline" type="button">历史</button><button class="btn btn-outline" type="button">复制结果</button>';
    actions.children[0].onclick = Tools.openTemplates;
    actions.children[1].onclick = Tools.openHistory;
    actions.children[2].onclick = Tools.copyResult;
    body.insertBefore(actions, body.firstChild);
  }

  function modal(title, content) {
    var old = document.getElementById('ltModal');
    if (old) old.remove();
    var overlay = document.createElement('div');
    overlay.id = 'ltModal'; overlay.className = 'lt-modal';
    overlay.innerHTML = '<div class="lt-modal-card"><div class="lt-modal-head"><h2>' + esc(title) + '</h2><button class="role-action" type="button">关闭</button></div><div class="lt-modal-body">' + content + '</div></div>';
    overlay.onclick = function (event) { if (event.target === overlay) overlay.remove(); };
    overlay.querySelector('.role-action').onclick = function () { overlay.remove(); };
    document.body.appendChild(overlay);
    return overlay;
  }

  Tools.openHistory = function () {
    var content = history.length ? history.map(function (item) {
      return '<div class="lt-history-item"><div class="lt-history-meta"><strong>' + esc(item.title) + '</strong><span>' + esc(new Date(item.time).toLocaleString('zh-CN')) + '</span></div>' +
        (item.inputs ? '<div class="lt-history-result">输入：' + esc(item.inputs) + '</div>' : '') + '<div class="lt-history-result">结果：' + esc(item.result) + '</div></div>';
    }).join('') : '<div class="lt-cmd-empty">暂无计算历史</div>';
    var overlay = modal('公式实验室 · 计算历史', content);
    if (history.length) {
      var clear = document.createElement('button'); clear.className = 'btn btn-outline'; clear.textContent = '清空历史';
      clear.onclick = function () { history = []; saveHistory(); overlay.remove(); Tools.openHistory(); };
      overlay.querySelector('.lt-modal-head').insertBefore(clear, overlay.querySelector('.role-action'));
    }
  };

  Tools.openTemplates = function () {
    var overlay = modal('公式实验室 · 模板', templates.map(function (item, index) {
      return '<div class="lt-template"><span>' + esc(item.label) + '</span><button class="btn btn-outline" data-index="' + index + '">使用</button></div>';
    }).join(''));
    overlay.querySelectorAll('[data-index]').forEach(function (button) {
      button.onclick = function () {
        var item = templates[Number(button.dataset.index)];
        overlay.remove(); openFormulaTool(item.tool);
        setTimeout(function () { Object.keys(item.values).forEach(function (id) { var input = document.getElementById(id); if (input) input.value = item.values[id]; }); }, 60);
      };
    });
  };

  Tools.copyResult = function () {
    var result = document.getElementById('fmResult');
    var text = result ? String(result.textContent || '').trim() : '';
    if (!text) return toast('暂无结果可复制');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { toast('结果已复制'); }, function () { toast('复制失败'); });
    else toast('当前浏览器不支持自动复制');
  };

  function toast(message) {
    var old = document.querySelector('.lt-toast'); if (old) old.remove();
    var box = document.createElement('div'); box.className = 'lt-toast'; box.textContent = message; document.body.appendChild(box);
    setTimeout(function () { box.remove(); }, 1600);
  }

  function installHooks() {
    var renderChapters = window.renderChaptersView;
    if (typeof renderChapters === 'function') window.renderChaptersView = function () { var result = renderChapters.apply(this, arguments); setTimeout(injectCourseTools, 0); return result; };
    var openFormula = window.openFormulaTool;
    if (typeof openFormula === 'function') window.openFormulaTool = function (tool) { currentTool = tool; var result = openFormula.apply(this, arguments); setTimeout(injectLabActions, 0); return result; };
    var runFormula = window.runFormulaTool;
    if (typeof runFormula === 'function') window.runFormulaTool = function (tool) { currentTool = tool || currentTool; var result = runFormula.apply(this, arguments); setTimeout(function () { recordFormula(currentTool); }, 80); return result; };
  }

  document.addEventListener('keydown', function (event) {
    var overlay = document.getElementById('ltCmdOverlay');
    var open = overlay && overlay.style.display === 'flex';
    if ((event.ctrlKey || event.metaKey) && String(event.key).toLowerCase() === 'k') { event.preventDefault(); open ? Tools.closeCommands() : Tools.openCommands(); return; }
    if (!open) return;
    if (event.key === 'Escape') { Tools.closeCommands(); return; }
    if (event.key === 'ArrowDown') { event.preventDefault(); activeIndex = Math.min(filtered.length - 1, activeIndex + 1); paintActive(); }
    if (event.key === 'ArrowUp') { event.preventDefault(); activeIndex = Math.max(0, activeIndex - 1); paintActive(); }
    if (event.key === 'Enter') { event.preventDefault(); runCommand(activeIndex); }
  });

  window.LearningTools = Tools;
  installHooks();
})();
