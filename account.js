/* =========================================================================
 * account.js — 互动课堂 账号与进度同步前端模块
 * 暴露全局 window.Account：
 *   - 登录态管理（JWT 存于 httpOnly Cookie，前端不接触 token）
 *   - 登录 / 注册 / 退出 / 改资料 / 改密码
 *   - 进度水合与云同步（已学知识点、章节最好成绩、成就），按账号隔离
 *
 * 后端地址：公网同源部署时留空（相对路径 /api），本地双端口开发(8765)回退 localhost:3000。
 * 可用 window.API_BASE 强制覆盖。生产由后端同源托管，无需跨域。
 * ========================================================================= */
(function () {
  'use strict';

  var API_BASE = window.API_BASE ||
    (location.port === '8765' ? 'http://localhost:3000' : '');

  // AI 辅导聊天记录的本地缓存键（与 app.js 保持一致）
  var CHAT_KEY = 'hdkt_chat_main';
  var SIDE_CHAT_KEY = 'hdkt_chat_side';

  var Account = {
    state: {
      user: null,
      scores: {},        // "course|chapter" -> best_score
      achievements: {},  // achievement_id -> true
      stats: {           // 学习统计（云端同步）
        studySeconds: 0,   // 累计学习秒数
        questionsDone: 0,  // 累计做题数
        points: 0,         // 累计积分
        aiSessions: 0,     // 累计 AI 辅导次数
        streakDays: 0      // 连续学习天数
      },
      ready: false
    },
    // 尚未上报到云端的增量（活跃计时 / 做题 / AI 辅导都会写入，flush 时合并提交后清零）
    _pendingStats: {
      studySeconds: 0,
      questionsDone: 0,
      points: 0,
      aiSessions: 0,
      activeToday: false
    },
    _syncTimer: null
  };

  /* ---------- 工具 ---------- */
  function elFrom(html) {
    var t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstChild;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  async function api(path, method, body) {
    var opts = { method: method || 'GET', credentials: 'include', headers: {} };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    var res = await fetch(API_BASE + '/api' + path, opts);
    var data;
    try { data = await res.json(); } catch (e) { data = {}; }
    if (!res.ok) {
      var err = new Error(data.error || ('请求失败 (' + res.status + ')'));
      err.status = res.status;
      throw err;
    }
    return data;
  }

  function toast(msg, type) {
    var box = document.getElementById('ac-toast');
    if (!box) {
      box = elFrom('<div id="ac-toast" style="position:fixed;left:50%;bottom:32px;transform:translateX(-50%);z-index:9999;"></div>');
      document.body.appendChild(box);
    }
    var t = elFrom('<div style="margin-top:8px;padding:10px 18px;border-radius:10px;background:' +
      (type === 'error' ? '#ef4444' : '#10b981') + ';color:#fff;font-size:0.9rem;box-shadow:0 8px 24px rgba(0,0,0,.18)">' +
      esc(msg) + '</div>');
    box.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }

  /* ---------- 进度：水合与同步 ---------- */
  function readStore(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function buildSyncPayload() {
    var studied = (window.studiedSet || []).map(function (k) {
      var p = String(k).split('|');
      return { course_id: p[0], chapter_id: p[1], kp_idx: parseInt(p[2] || '0', 10) };
    });
    var scores = Object.keys(Account.state.scores).map(function (k) {
      var p = k.split('|');
      return { course_id: p[0], chapter_id: p[1], best_score: Account.state.scores[k] };
    });
    var achievements = Object.keys(Account.state.achievements).map(function (id) {
      return { achievement_id: id };
    });
    // stats 采用增量上报：把 pendingStats 一起带上，提交成功后清零
    var ps = Account._pendingStats;
    var stats = {
      studySeconds: ps.studySeconds,
      questionsDone: ps.questionsDone,
      points: ps.points,
      aiSessions: ps.aiSessions,
      activeToday: ps.activeToday
    };

    // 收藏 / 题目收藏 / 错题本 / 主题：全量替换（从 app.js 的全局变量读取）
    var payload = { studied: studied, scores: scores, achievements: achievements, stats: stats };

    if (typeof window.favorites !== 'undefined') payload.favorites = window.favorites;
    if (typeof window.qFavorites !== 'undefined') payload.qfavorites = window.qFavorites;
    if (typeof window.wrongBook !== 'undefined') payload.wrongbook = window.wrongBook;
    if (typeof window.wbStats !== 'undefined') payload.wrongbookStats = window.wbStats;
    if (typeof window.getTheme === 'function') {
      try { payload.theme = window.getTheme(); } catch (e) {}
    }
    // 最近学习记录（课程id / 章号 / 时间戳，全量替换）
    if (Array.isArray(window.recentLearning)) payload.recent = window.recentLearning;

    // AI 辅导聊天记录（主聊天区 + 侧边助手），全量替换、按账号隔离
    var mainChat = readStore(CHAT_KEY);
    if (mainChat && Array.isArray(mainChat.messages)) payload.chat = mainChat;
    var sideChatData = readStore(SIDE_CHAT_KEY);
    if (sideChatData && Array.isArray(sideChatData.messages)) payload.sidechat = sideChatData;

    return payload;
  }

  Account.hydrate = function (progress) {
    if (!progress) return;
    // 已学知识点
    if (Array.isArray(progress.studied) && window.studiedSet) {
      progress.studied.forEach(function (s) {
        var key = s.course_id + '|' + s.chapter_id + '|' + (s.kp_idx != null ? s.kp_idx : 0);
        if (window.studiedSet.indexOf(key) < 0) window.studiedSet.push(key);
      });
      if (window.saveStudied) window.saveStudied();
    }
    // 成绩
    if (Array.isArray(progress.scores)) {
      progress.scores.forEach(function (s) {
        var k = s.course_id + '|' + s.chapter_id;
        var v = parseInt(s.best_score, 10) || 0;
        if (!(k in Account.state.scores) || v > Account.state.scores[k]) Account.state.scores[k] = v;
      });
    }
    // 成就（无弹窗并入；同时回填同步缓存，保证后续全量同步幂等）
    if (Array.isArray(progress.achievements)) {
      progress.achievements.forEach(function (a) {
        if (a && a.achievement_id) Account.state.achievements[a.achievement_id] = true;
      });
      if (window.Achievements && window.Achievements.hydrate) {
        window.Achievements.hydrate(progress.achievements.map(function (a) { return a.achievement_id; }));
      }
    }
    // 学习统计
    if (progress.stats) {
      Account.state.stats.studySeconds = parseInt(progress.stats.studySeconds, 10) || 0;
      Account.state.stats.questionsDone = parseInt(progress.stats.questionsDone, 10) || 0;
      Account.state.stats.points = parseInt(progress.stats.points, 10) || 0;
      Account.state.stats.aiSessions = parseInt(progress.stats.aiSessions, 10) || 0;
      Account.state.stats.streakDays = parseInt(progress.stats.streakDays, 10) || 0;
      Account.renderStats();
    }
    // 收藏 / 题目收藏 / 错题本 / 主题：回填到 app.js 全局变量
    if (Array.isArray(progress.favorites) && typeof window.applyFavorites === 'function') {
      window.applyFavorites(progress.favorites);
    }
    if (Array.isArray(progress.qfavorites) && typeof window.applyQFavorites === 'function') {
      window.applyQFavorites(progress.qfavorites);
    }
    if (Array.isArray(progress.wrongbook) && typeof window.applyWrongBook === 'function') {
      window.applyWrongBook(progress.wrongbook, progress.wrongbookStats);
    }
    if (progress.theme && typeof window.applyTheme === 'function') {
      try { window.applyTheme(progress.theme, false); } catch (e) {}
    }
    // 社区已迁移为服务端共享数据（见 community.js / community_posts 表），不再按账号存活
    // 最近学习记录：回填首页卡片
    if (Array.isArray(progress.recent) && typeof window.applyRecent === 'function') {
      try { window.applyRecent(progress.recent); } catch (e) {}
    }
    // AI 辅导聊天记录：云端覆盖本地
    if (progress.chat && typeof window.applyChatHistory === 'function') {
      try { window.applyChatHistory(progress.chat); } catch (e) {}
    }
    if (progress.sidechat && typeof window.applySideChatHistory === 'function') {
      try { window.applySideChatHistory(progress.sidechat); } catch (e) {}
    }
    // AI 密钥只保存在服务器环境变量中，浏览器不再读取或同步用户密钥。
    if (typeof window.renderAPIConfigForm === 'function') {
      try { window.renderAPIConfigForm(); } catch (e) {}
    }
    Account.renderModelLabel();
    // 若当前在章节列表页，刷新以反映已学状态
    if (typeof window.renderChaptersView === 'function') {
      try { window.renderChaptersView(); } catch (e) {}
    }
  };

  Account._scheduleSync = function () {
    if (!Account.state.user) return; // 未登录不向云端同步
    if (Account._syncTimer) clearTimeout(Account._syncTimer);
    Account._syncTimer = setTimeout(Account.flush, 400);
  };

  Account.flush = async function () {
    if (!Account.state.user) return;
    try {
      await api('/progress/sync', 'POST', buildSyncPayload());
      // 增量提交成功 → 累加进本地 stats，清零 pendingStats
      var ps = Account._pendingStats;
      Account.state.stats.studySeconds += ps.studySeconds;
      Account.state.stats.questionsDone += ps.questionsDone;
      Account.state.stats.points += ps.points;
      Account.state.stats.aiSessions += ps.aiSessions;
      ps.studySeconds = 0;
      ps.questionsDone = 0;
      ps.points = 0;
      ps.aiSessions = 0;
      ps.activeToday = false;
      Account.renderStats();
    } catch (e) { /* 静默失败，下次操作重试 */ }
  };

  // 由 app.js 的 toggleStudied 调用
  Account.onStudiedChanged = function () { Account._scheduleSync(); };
  // 通用触发：收藏 / 题目收藏 / 错题本 / 主题等任何用户数据变化后调用
  Account.scheduleSync = function () { Account._scheduleSync(); };
  // 由 app.js 的 submitTest 调用
  Account.recordScore = function (courseId, chNum, score) {
    var k = courseId + '|' + chNum;
    var v = parseInt(score, 10) || 0;
    if (!(k in Account.state.scores) || v > Account.state.scores[k]) Account.state.scores[k] = v;
    Account._scheduleSync();
  };
  // 由 achievements-core.js 调用
  Account.reportAchievement = function (id) {
    if (!id) return;
    Account.state.achievements[id] = true;
    Account._scheduleSync();
  };

  // 记录一次做题（做题数 +1，并按得分累加积分）
  // 由 app.js 的 submitTest 调用
  Account.recordQuestion = function (score) {
    var ps = Account._pendingStats;
    ps.questionsDone += 1;
    var s = Math.max(0, parseInt(score, 10) || 0);
    ps.points += s; // 积分 = 得分累计
    ps.activeToday = true;
    Account._scheduleSync();
  };

  // 记录一次 AI 辅导
  // 由 app.js 的 sendMessage 调用
  Account.recordAISession = function () {
    Account._pendingStats.aiSessions += 1;
    Account._pendingStats.activeToday = true;
    Account._scheduleSync();
  };

  // 单独加积分（不改做题数）。用于「每日挑战」等奖励场景
  Account.awardPoints = function (n) {
    var v = Math.max(0, parseInt(n, 10) || 0);
    if (!v) return;
    Account._pendingStats.points += v;
    Account._pendingStats.activeToday = true;
    Account._scheduleSync();
  };

  // 累计学习时长（秒，增量），并标记今天活跃
  // 由活跃计时器定时调用
  Account.addStudySeconds = function (seconds) {
    var s = Math.max(0, parseInt(seconds, 10) || 0);
    if (s <= 0) return;
    Account._pendingStats.studySeconds += s;
    Account._pendingStats.activeToday = true;
    Account._scheduleSync();
  };

  /* ---------- 活跃计时器：仅页面在前台时累计学习时长 ---------- */
  var _lastActiveTs = 0;
  var _timerActive = false;

  function startStudyTimer() {
    if (_timerActive) return;
    _timerActive = true;
    _lastActiveTs = Date.now();
    // 每秒检查一次：前台则把流逝秒数计入
    Account._studyInterval = setInterval(function () {
      if (document.hidden) {
        // 切后台：重置起点，不累计
        _lastActiveTs = Date.now();
        return;
      }
      var now = Date.now();
      var delta = Math.floor((now - _lastActiveTs) / 1000);
      if (delta >= 1) {
        _lastActiveTs = now;
        Account.addStudySeconds(delta);
      }
    }, 1000);
  }

  function stopStudyTimer() {
    if (Account._studyInterval) {
      clearInterval(Account._studyInterval);
      Account._studyInterval = null;
    }
    _timerActive = false;
  }

  Account.startStudyTimer = startStudyTimer;

  /* ---------- 账号切换：清空本地进度（以服务端为准） ---------- */
  function clearLocalProgress() {
    // 已学知识点（本地 localStorage）
    if (window.studiedSet) {
      window.studiedSet.length = 0;
      if (window.saveStudied) { try { window.saveStudied(); } catch (e) {} }
    }
    // 内存成绩 / 成就缓存
    Account.state.scores = {};
    Account.state.achievements = {};
    // 学习统计与待上报增量清零
    Account.state.stats = { studySeconds: 0, questionsDone: 0, points: 0, aiSessions: 0, streakDays: 0 };
    Account._pendingStats = { studySeconds: 0, questionsDone: 0, points: 0, aiSessions: 0, activeToday: false };
    // 收藏 / 题目收藏 / 错题本：清空本地（切换账号时以服务端为准）
    if (typeof window.applyFavorites === 'function') { try { window.applyFavorites([]); } catch (e) {} }
    if (typeof window.applyQFavorites === 'function') { try { window.applyQFavorites([]); } catch (e) {} }
    if (typeof window.applyWrongBook === 'function') { try { window.applyWrongBook([], { added: 0, mastered: 0 }); } catch (e) {} }
    // 社区已改为服务端共享数据，不再需要本地清空
    // AI 辅导聊天记录：清空本地（切换账号时以服务端为准）
    try { localStorage.removeItem(CHAT_KEY); localStorage.removeItem(SIDE_CHAT_KEY); } catch (e) {}
    if (typeof window.applyChatHistory === 'function') { try { window.applyChatHistory({ messages: [] }); } catch (e) {} }
    if (typeof window.applySideChatHistory === 'function') { try { window.applySideChatHistory({ messages: [] }); } catch (e) {} }
    // 最近学习：清空本地（切换账号时以服务端为准）
    if (typeof window.applyRecent === 'function') { try { window.applyRecent([]); } catch (e) {} }
    // AI API 配置：清空（切换账号时以服务端为准）
    Account.state.apiconfig = { key: '', baseUrl: '', model: '' };
    if (typeof window.renderAPIConfigForm === 'function') { try { window.renderAPIConfigForm(); } catch (e) {} }
    // 成就本地状态（achievements-core）
    if (window.Achievements && window.Achievements.reset) {
      try { window.Achievements.reset(); } catch (e) {}
    }
    // 刷新受影响视图与问候语
    if (typeof window.renderChaptersView === 'function') { try { window.renderChaptersView(); } catch (e) {} }
    if (typeof window.renderProfileAchievements === 'function') { try { window.renderProfileAchievements(); } catch (e) {} }
    if (typeof window.updateGreeting === 'function') { try { window.updateGreeting(); } catch (e) {} }
    updateProfileIdentity();
    Account.renderStats();
    Account.renderWidget();
  }

  /* 个人中心身份区：按登录账号显示 */
  function updateProfileIdentity() {
    var u = Account.state.user;
    var av = document.getElementById('profileAvatarLg');
    var nm = document.getElementById('profileName');
    var bio = document.getElementById('profileBio');
    if (av) av.textContent = u ? (u.nickname || u.username || '?').charAt(0) : '访';
    if (nm) nm.textContent = u ? (u.nickname || u.username) : '未登录';
    if (bio) bio.textContent = u
      ? (u.nickname || u.username) + ' · 学习进度已云端同步'
      : '登录后同步你的学习进度与成就';

    // 设置 → 账号安全：与登录账号同步
    var setAccName = document.getElementById('settings-account-name');
    var setAccEmail = document.getElementById('settings-account-email');
    var btnPwd = document.getElementById('btn-change-password');
    if (setAccName) {
      setAccName.value = u ? (u.username || '') : '';
      setAccName.placeholder = u ? '' : '未登录';
    }
    if (setAccEmail) {
      setAccEmail.value = u ? (u.email || '') : '';
      setAccEmail.placeholder = u ? '' : '登录后显示';
    }
    if (btnPwd) btnPwd.disabled = !u;
  }

  /* 把学习统计渲染到个人中心 + 首页统计卡片 */
  function formatStudyHours(seconds) {
    var h = Math.floor(seconds / 3600);
    if (h > 0) return h + 'h';
    var m = Math.floor(seconds / 60);
    if (m > 0) return m + 'm';
    return seconds + 's';
  }

  Account.renderStats = function () {
    var s = Account.state.stats || {};
    var studySeconds = s.studySeconds || 0;
    var questionsDone = s.questionsDone || 0;
    var points = s.points || 0;
    var aiSessions = s.aiSessions || 0;
    var streakDays = s.streakDays || 0;

    // 完成章节数：从已学知识点去重统计
    var studied = window.studiedSet || [];
    var chapters = {};
    studied.forEach(function (k) {
      var p = String(k).split('|');
      if (p[0] && p[1]) chapters[p[0] + '|' + p[1]] = true;
    });
    var doneChapters = Object.keys(chapters).length;

    // —— 个人中心统计卡片 ——
    var valTotal = document.getElementById('statTotalTime');
    var valChapters = document.getElementById('statChapters');
    var valPoints = document.getElementById('statPoints');
    var valAI = document.getElementById('statAI');
    if (valTotal) valTotal.textContent = formatStudyHours(studySeconds);
    if (valChapters) valChapters.textContent = doneChapters + '/12';
    if (valPoints) valPoints.textContent = points.toLocaleString();
    if (valAI) valAI.textContent = aiSessions;

    // —— 首页统计卡片 ——
    var hVal = document.getElementById('statHomeTime');
    var hAI = document.getElementById('statHomeAI');
    var hChap = document.getElementById('statHomeChapters');
    var hStreak = document.getElementById('statHomeStreak');
    var hPoints = document.getElementById('statHomePoints');
    if (hVal) hVal.textContent = Math.floor(studySeconds / 3600);
    if (hAI) hAI.textContent = aiSessions;
    if (hChap) hChap.textContent = doneChapters + '/12';
    if (hStreak) hStreak.textContent = streakDays;
    if (hPoints) hPoints.textContent = points.toLocaleString();

    Account.renderModelLabel();
  };

  /* AI 模型由服务器统一托管，前端永远接触不到 API 密钥。 */
  Account.renderModelLabel = function () {
    var label = Account.state.user ? '平台 AI' : '登录后使用';

    var a = document.getElementById('chatModelName');
    if (a) a.textContent = label;

    var b = document.getElementById('aiPanelModel');
    if (b) b.textContent = label;

    var c = document.getElementById('chatDisclaimer');
    if (c) {
      c.textContent = 'AI 可能出现错误，重要计算请自行验证 · ' + label +
        (Account.state.user ? ' · 聊天记录随账号云端同步' : '');
    }
  };

  /* ---------- 鉴权流程 ---------- */
  Account.init = async function () {
    try {
      var me = await api('/auth/me', 'GET');
      if (me && me.user) {
        clearLocalProgress(); // 已登录：先清空本地残留，再以服务端为准恢复
        Account.state.user = me.user;
        try {
          var p = await api('/progress', 'GET');
          Account.hydrate(p);
        } catch (e) {}
      }
    } catch (e) {
      Account.state.user = null;
    }
    Account.state.ready = true;
    if (Account.state.user) startStudyTimer(); // 已登录才计时
    Account.renderStats(); // 首屏按当前登录态刷新统计（未登录显示 0）
    Account.renderWidget();
  };

  Account.login = async function (account, password) {
    var r = await api('/auth/login', 'POST', { account: account, password: password });
    clearLocalProgress(); // 切换账号：清空本地（游客/上一账号）进度
    Account.state.user = r.user;
    try { var p = await api('/progress', 'GET'); Account.hydrate(p); } catch (e) {}
    startStudyTimer();
    Account.renderWidget();
    Account.closeModal();
    toast('登录成功，已载入你的云端进度');
  };

  Account.register = async function (data) {
    var r = await api('/auth/register', 'POST', data);
    clearLocalProgress(); // 新账号云端进度为空：本地从零开始
    Account.state.user = r.user;
    startStudyTimer();
    Account.renderWidget();
    Account.closeModal();
    toast('注册成功，进度将自动同步到云端');
  };

  Account.logout = async function () {
    await Account.flush(); // 退出前先落地到云端
    try { await api('/auth/logout', 'POST'); } catch (e) {}
    stopStudyTimer();
    Account.state.user = null;
    clearLocalProgress(); // 清空本地，避免下一个账号串数据
    toast('已退出登录');
  };

  Account.updateProfile = async function (nickname, email) {
    var r = await api('/auth/profile', 'PUT', { nickname: nickname, email: email });
    Account.state.user = r.user;
    Account.renderWidget();
    toast('资料已更新');
  };

  Account.changePassword = async function (oldPassword, newPassword) {
    await api('/auth/password', 'POST', { oldPassword: oldPassword, newPassword: newPassword });
    toast('密码已修改');
  };

  Account.deleteAccount = async function (password) {
    await api('/auth/account/delete', 'POST', { password: password });
    // 后端已删除账号全部数据并清 cookie
    Account.state.user = null;
    clearLocalProgress();
    toast('账号已注销，所有数据已永久删除');
  };

  /* ---------- 侧栏控件 ---------- */
  Account.renderWidget = function () {
    var mount = document.querySelector('.sidebar-footer');
    // 顶栏头像：按登录态显示首字，点击进入账号资料/登录
    var topAv = document.getElementById('topbarAvatar');
    if (topAv) {
      var u0 = Account.state.user;
      topAv.textContent = u0 ? (u0.nickname || u0.username || '?').charAt(0) : '访';
      topAv.onclick = u0
        ? function () { Account.openAccountPanel(); }
        : function () { Account.openModal('login'); };
    }
    updateProfileIdentity();
    if (!mount) {
      if (typeof window.updateGreeting === 'function') { try { window.updateGreeting(); } catch (e) {} }
      return;
    }
    var u = Account.state.user;
    if (!u) {
      mount.innerHTML =
        '<div class="ac-user-card" onclick="Account.openModal(\'login\')">' +
        '  <div class="ac-avatar">👤</div>' +
        '  <div class="ac-info"><span class="ac-name">未登录</span>' +
        '  <span class="ac-role">点击登录 / 注册</span></div>' +
        '</div>';
    } else {
      var initial = (u.nickname || u.username || '?').charAt(0);
      mount.innerHTML =
        '<div class="ac-user-card" onclick="Account.toggleMenu(event)">' +
        '  <div class="ac-avatar">' + esc(initial) + '</div>' +
        '  <div class="ac-info"><span class="ac-name">' + esc(u.nickname || u.username) + '</span>' +
        '  <span class="ac-role">已登录 · 云端同步</span></div>' +
        '</div>' +
        '<div class="ac-menu" id="ac-menu" hidden>' +
        '  <button class="ac-menu-item" onclick="Account.openAccountPanel()">🪪 账号资料</button>' +
        '  <button class="ac-menu-item" onclick="Account.openPasswordPanel()">🔑 修改密码</button>' +
        '  <button class="ac-menu-item" onclick="Account.logout()">🚪 退出登录</button>' +
        '  <button class="ac-menu-item ac-menu-danger" onclick="Account.openDeletePanel()">🗑️ 注销账号</button>' +
        '</div>';
    }
    // 登录态变化后刷新问候语（按账号显示昵称）
    if (typeof window.updateGreeting === 'function') { try { window.updateGreeting(); } catch (e) {} }
  };

  Account.toggleMenu = function (e) {
    e.stopPropagation();
    var m = document.getElementById('ac-menu');
    if (m) m.hidden = !m.hidden;
  };
  // 点击页面其它位置关闭菜单
  document.addEventListener('click', function () {
    var m = document.getElementById('ac-menu');
    if (m) m.hidden = true;
  });

  /* ---------- 弹窗（登录 / 注册 / 资料 / 密码） ---------- */
  Account.openModal = function (tab) {
    ensureModalRoot();
    var root = document.getElementById('ac-modal-root');
    root.hidden = false;
    renderModal(tab || 'login');
  };
  Account.closeModal = function () {
    var root = document.getElementById('ac-modal-root');
    if (root) root.hidden = true;
  };
  Account.openAccountPanel = function () {
    var m = document.getElementById('ac-menu'); if (m) m.hidden = true;
    Account.openModal('profile');
  };
  Account.openPasswordPanel = function () {
    var m = document.getElementById('ac-menu'); if (m) m.hidden = true;
    Account.openPasswordFlow('current');
  };
  Account.openDeletePanel = function () {
    var m = document.getElementById('ac-menu'); if (m) m.hidden = true;
    Account.openModal('delete');
  };

  function ensureModalRoot() {
    if (document.getElementById('ac-modal-root')) return;
    var root = elFrom(
      '<div id="ac-modal-root" hidden>' +
      '  <div class="ac-overlay" onclick="Account.closeModal()"></div>' +
      '  <div class="ac-modal" id="ac-modal"></div>' +
      '</div>');
    document.body.appendChild(root);
  }

  function renderModal(tab) {
    var modal = document.getElementById('ac-modal');
    if (tab === 'login') {
      modal.innerHTML =
        '<div class="ac-tabs">' +
        '  <button class="ac-tab active" onclick="Account.openModal(\'login\')">登录</button>' +
        '  <button class="ac-tab" onclick="Account.openModal(\'register\')">注册</button>' +
        '</div>' +
        '<div class="ac-field"><label>账号（用户名或邮箱）</label><input id="ac-account" placeholder=""></div>' +
        '<div class="ac-field"><label>密码</label><input id="ac-pwd" type="password" placeholder=""></div>' +
        '<div class="ac-err" id="ac-err"></div>' +
        '<button class="ac-submit" onclick="Account.submitLogin()">登录</button>' +
        '<div class="ac-hint">不同账号的已学进度、成绩与成就相互独立、云端隔离。</div>';
    } else if (tab === 'register') {
      modal.innerHTML =
        '<div class="ac-tabs">' +
        '  <button class="ac-tab" onclick="Account.openModal(\'login\')">登录</button>' +
        '  <button class="ac-tab active" onclick="Account.openModal(\'register\')">注册</button>' +
        '</div>' +
        '<div class="ac-field"><label>用户名</label><input id="ac-username" placeholder="2-40 位"></div>' +
        '<div class="ac-field"><label>邮箱</label><input id="ac-email" placeholder="you@example.com"></div>' +
        '<div class="ac-field"><label>昵称</label><input id="ac-nickname" placeholder="选填"></div>' +
        '<div class="ac-field"><label>密码</label><input id="ac-pwd2" type="password" placeholder="至少 6 位"></div>' +
        '<div class="ac-err" id="ac-err"></div>' +
        '<button class="ac-submit" onclick="Account.submitRegister()">注册</button>';
    } else if (tab === 'profile') {
      var u = Account.state.user || {};
      modal.innerHTML =
        '<div class="ac-title">账号资料</div>' +
        '<div class="ac-field"><label>用户名</label><input value="' + esc(u.username) + '" disabled></div>' +
        '<div class="ac-field"><label>昵称</label><input id="ac-nickname2" value="' + esc(u.nickname || '') + '"></div>' +
        '<div class="ac-field"><label>邮箱</label><input id="ac-email2" value="' + esc(u.email || '') + '"></div>' +
        '<div class="ac-err" id="ac-err"></div>' +
        '<button class="ac-submit" onclick="Account.submitProfile()">保存</button>' +
        '<button class="ac-cancel" onclick="Account.closeModal()">取消</button>';
    } else if (tab === 'password') {
      modal.innerHTML =
        '<div class="ac-title">修改密码</div>' +
        '<div class="ac-field"><label>原密码</label><input id="ac-old" type="password"></div>' +
        '<div class="ac-field"><label>新密码</label><input id="ac-new" type="password" placeholder="至少 6 位"></div>' +
        '<div class="ac-err" id="ac-err"></div>' +
        '<button class="ac-submit" onclick="Account.submitPassword()">修改</button>' +
        '<button class="ac-cancel" onclick="Account.closeModal()">取消</button>';
    } else if (tab === 'delete') {
      modal.innerHTML =
        '<div class="ac-title">注销账号</div>' +
        '<div class="ac-warn">注销后该账号的全部学习进度、成绩与成就将被永久删除且无法恢复。请输入当前密码确认。</div>' +
        '<div class="ac-field"><label>当前密码</label><input id="ac-del-pwd" type="password"></div>' +
        '<div class="ac-err" id="ac-err"></div>' +
        '<button class="ac-submit ac-danger" onclick="Account.submitDelete()">永久注销</button>' +
        '<button class="ac-cancel" onclick="Account.closeModal()">取消</button>';
    }
  }

  function setErr(msg) {
    var e = document.getElementById('ac-err');
    if (e) e.textContent = msg || '';
  }

  Account.submitLogin = async function () {
    setErr('');
    var account = document.getElementById('ac-account').value.trim();
    var pwd = document.getElementById('ac-pwd').value;
    if (!account || !pwd) { setErr('请填写账号与密码'); return; }
    try { await Account.login(account, pwd); }
    catch (e) { setErr(e.message); }
  };
  Account.submitRegister = async function () {
    setErr('');
    var data = {
      username: document.getElementById('ac-username').value.trim(),
      email: document.getElementById('ac-email').value.trim(),
      nickname: document.getElementById('ac-nickname').value.trim(),
      password: document.getElementById('ac-pwd2').value
    };
    if (!data.username || !data.email || !data.password) { setErr('请完整填写'); return; }
    try { await Account.register(data); }
    catch (e) { setErr(e.message); }
  };
  Account.submitProfile = async function () {
    setErr('');
    var nickname = document.getElementById('ac-nickname2').value.trim();
    var email = document.getElementById('ac-email2').value.trim();
    try { await Account.updateProfile(nickname, email); Account.closeModal(); }
    catch (e) { setErr(e.message); }
  };
  Account.submitPassword = async function () {
    setErr('');
    var oldP = document.getElementById('ac-old').value;
    var newP = document.getElementById('ac-new').value;
    if (!oldP || !newP) { setErr('请填写完整'); return; }
    try { await Account.changePassword(oldP, newP); Account.closeModal(); }
    catch (e) { setErr(e.message); }
  };
  Account.submitDelete = async function () {
    setErr('');
    var pwd = document.getElementById('ac-del-pwd').value;
    if (!pwd) { setErr('请输入当前密码'); return; }
    if (!window.confirm('确认永久注销该账号？此操作不可恢复！')) return;
    try {
      await Account.deleteAccount(pwd);
      Account.closeModal();
    } catch (e) { setErr(e.message); }
  };

  /* ---------- 多步骤改密码（较小弹窗 + 分步引导） ---------- */
  // 步骤状态：当前密码 → 新密码 → 确认新密码
  var _pwdStep = null; // { current: '', next: '' }

  // 验证当前密码（调用后端校验接口，不直接改库）
  Account.verifyPassword = async function (password) {
    await api('/auth/password/verify', 'POST', { password: password });
  };

  // 从设置页「修改密码」按钮启动
  Account.startChangePassword = function () {
    if (!Account.state.user) return;
    Account.openPasswordFlow('current');
  };

  Account.openPasswordFlow = function (step) {
    var modal = document.getElementById('ac-modal');
    if (!modal) { ensureModalRoot(); modal = document.getElementById('ac-modal'); }
    if (!_pwdStep || step === 'current') _pwdStep = { current: '', next: '' };

    if (step === 'current') {
      modal.innerHTML =
        '<div class="ac-title">修改密码</div>' +
        '<div class="ac-field"><label>请输入当前密码</label><input id="ac-pwd-old" type="password" placeholder="当前密码" autocomplete="current-password"></div>' +
        '<div class="ac-err" id="ac-err"></div>' +
        '<button class="ac-submit" onclick="Account.stepVerifyCurrent()">下一步</button>' +
        '<button class="ac-cancel" onclick="Account.closeModal()">取消</button>';
      modal.parentElement.hidden = false;
      modal.classList.add('ac-modal-sm');
      setTimeout(function () { var i = document.getElementById('ac-pwd-old'); if (i) i.focus(); }, 50);
    } else if (step === 'new') {
      modal.innerHTML =
        '<div class="ac-title">设置新密码</div>' +
        '<div class="ac-field"><label>请输入新密码</label><input id="ac-pwd-new1" type="password" placeholder="至少 6 位" autocomplete="new-password"></div>' +
        '<div class="ac-err" id="ac-err"></div>' +
        '<button class="ac-submit" onclick="Account.stepInputNew()">下一步</button>' +
        '<button class="ac-cancel" onclick="Account.closeModal()">取消</button>';
      setTimeout(function () { var i = document.getElementById('ac-pwd-new1'); if (i) i.focus(); }, 50);
    } else if (step === 'confirm') {
      modal.innerHTML =
        '<div class="ac-title">确认新密码</div>' +
        '<div class="ac-field"><label>请再次输入新密码</label><input id="ac-pwd-new2" type="password" placeholder="再次输入新密码" autocomplete="new-password"></div>' +
        '<div class="ac-err" id="ac-err"></div>' +
        '<button class="ac-submit" onclick="Account.stepConfirm()">确认修改</button>' +
        '<button class="ac-cancel" onclick="Account.closeModal()">取消</button>';
      setTimeout(function () { var i = document.getElementById('ac-pwd-new2'); if (i) i.focus(); }, 50);
    }
  };

  // 第 1 步：校验当前密码
  Account.stepVerifyCurrent = async function () {
    setErr('');
    var old = document.getElementById('ac-pwd-old');
    var pwd = old ? old.value : '';
    if (!pwd) { setErr('请输入当前密码'); return; }
    try {
      await Account.verifyPassword(pwd);
      // 正确 → 关闭当前弹窗，打开新密码弹窗
      _pwdStep.current = pwd;
      Account.openPasswordFlow('new');
    } catch (e) {
      setErr(e.message || '密码错误');
    }
  };

  // 第 2 步：输入新密码
  Account.stepInputNew = function () {
    setErr('');
    var n1 = document.getElementById('ac-pwd-new1');
    var pwd = n1 ? n1.value : '';
    if (!pwd) { setErr('请输入新密码'); return; }
    if (pwd.length < 6) { setErr('新密码至少 6 位'); return; }
    _pwdStep.next = pwd;
    Account.openPasswordFlow('confirm');
  };

  // 第 3 步：确认新密码并提交
  Account.stepConfirm = async function () {
    setErr('');
    var n2 = document.getElementById('ac-pwd-new2');
    var pwd2 = n2 ? n2.value : '';
    if (!pwd2) { setErr('请再次输入新密码'); return; }
    if (pwd2 !== _pwdStep.next) { setErr('两次输入的新密码不一致'); return; }
    try {
      await Account.changePassword(_pwdStep.current, _pwdStep.next);
      _pwdStep = null;
      Account.closeModal();
      toast('密码已修改');
    } catch (e) {
      setErr(e.message);
    }
  };

  /* ---------- 样式（仅本模块使用） ---------- */
  (function injectStyle() {
    if (document.getElementById('ac-style')) return;
    var s = document.createElement('style');
    s.id = 'ac-style';
    s.textContent = `
      .ac-user-card{display:flex;align-items:center;gap:10px;padding:10px;cursor:pointer;border-radius:10px;transition:background .15s}
      .ac-user-card:hover{background:rgba(255,255,255,.06)}
      .ac-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1rem;flex-shrink:0}
      .ac-info{display:flex;flex-direction:column;min-width:0}
      .ac-name{font-size:.9rem;font-weight:600;color:var(--text-primary,#fff);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .ac-role{font-size:.72rem;color:var(--text-muted,#94a3b8)}
      .ac-menu{margin-top:6px;background:var(--bg-elevated,#1e293b);border:1px solid var(--border,#334155);border-radius:10px;overflow:hidden}
      .ac-menu-item{display:block;width:100%;text-align:left;background:none;border:none;color:var(--text-primary,#fff);padding:10px 12px;font-size:.85rem;cursor:pointer}
      .ac-menu-item:hover{background:rgba(255,255,255,.06)}
      .ac-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000}
      .ac-modal{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:1001;width:340px;max-width:92vw;background:var(--bg-elevated,#1e293b);border:1px solid var(--border,#334155);border-radius:16px;padding:22px;box-shadow:0 24px 60px rgba(0,0,0,.4)}
      .ac-modal.ac-modal-sm{width:300px;padding:18px}
      .ac-tabs{display:flex;gap:8px;margin-bottom:16px}
      .ac-tab{flex:1;padding:8px;border:none;border-radius:8px;background:rgba(255,255,255,.06);color:var(--text-muted,#94a3b8);cursor:pointer;font-size:.9rem}
      .ac-tab.active{background:#6366f1;color:#fff}
      .ac-title{font-size:1.05rem;font-weight:700;margin-bottom:14px;color:var(--text-primary,#fff)}
      .ac-field{margin-bottom:12px;display:flex;flex-direction:column;gap:5px}
      .ac-field label{font-size:.78rem;color:var(--text-muted,#94a3b8)}
      .ac-field input{background:rgba(255,255,255,.05);border:1px solid var(--border,#334155);border-radius:8px;padding:9px 12px;color:var(--text-primary,#fff);font-size:.9rem;outline:none}
      .ac-field input:focus{border-color:#6366f1}
      .ac-err{color:#f87171;font-size:.8rem;min-height:16px;margin-bottom:6px}
      .ac-submit{width:100%;padding:10px;border:none;border-radius:9px;background:#6366f1;color:#fff;font-size:.92rem;font-weight:600;cursor:pointer;margin-top:4px}
      .ac-submit:hover{background:#4f46e5}
      .ac-cancel{width:100%;padding:9px;margin-top:8px;border:1px solid var(--border,#334155);border-radius:9px;background:none;color:var(--text-muted,#94a3b8);cursor:pointer}
      .ac-hint{margin-top:12px;font-size:.74rem;color:var(--text-muted,#94a3b8);line-height:1.5}
      .ac-warn{margin-bottom:12px;padding:10px 12px;border-radius:9px;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.35);color:#fca5a5;font-size:.8rem;line-height:1.5}
      .ac-danger{background:#ef4444}
      .ac-danger:hover{background:#dc2626}
      .ac-menu-danger{color:#f87171}
    `;
    document.head.appendChild(s);
  })();

  window.Account = Account;

  // 页面关闭前落地未同步的进度（保证保存）
  window.addEventListener('pagehide', function () { Account.flush(); });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { Account.init(); });
  } else {
    Account.init();
  }
})();
