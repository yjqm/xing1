/* 教师/管理员与学习事件模块：复用 Account 的 HttpOnly Cookie 登录态。 */
(function () {
  'use strict';

  var RoleCenter = { lastRole: null };
  var roleNames = { student: '学生', teacher: '教师', admin: '管理员' };

  function esc(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  async function request(path, options) {
    var response = await fetch(path, Object.assign({ credentials: 'same-origin' }, options || {}));
    var data = {};
    try { data = await response.json(); } catch (e) {}
    if (!response.ok) throw new Error(data.error || ('请求失败（' + response.status + '）'));
    return data;
  }

  function currentUser() {
    return window.Account && window.Account.state ? window.Account.state.user : null;
  }

  function canTeach(user) {
    return !!user && (user.role === 'teacher' || user.role === 'admin');
  }

  RoleCenter.refreshNavigation = function () {
    var user = currentUser();
    var role = user && user.role ? user.role : 'student';
    var nav = document.getElementById('roleNavTeacher');
    if (nav) nav.style.display = canTeach(user) ? '' : 'none';
    if (RoleCenter.lastRole !== role && typeof state !== 'undefined' && state.currentPage === 'teacher') {
      RoleCenter.render();
    }
    RoleCenter.lastRole = role;
  };

  RoleCenter.logEvent = function (eventType, payload) {
    if (!currentUser()) return Promise.resolve();
    var body = Object.assign({ event_type: eventType }, payload || {});
    return request('/api/learning/event', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    }).catch(function () {});
  };

  RoleCenter.render = async function () {
    var page = document.getElementById('page-teacher');
    if (!page) return;
    var user = currentUser();
    if (!canTeach(user)) {
      page.innerHTML = '<div class="page-header"><div><h1 class="page-title">教学管理</h1><p class="page-subtitle">教师与管理员专用</p></div></div>' +
        '<div class="role-error">当前账号没有教学管理权限。请使用教师或管理员账号登录。</div>';
      return;
    }
    page.innerHTML = '<div class="page-header"><div><h1 class="page-title">教学管理</h1><p class="page-subtitle">学生进度、活跃情况与角色管理</p></div></div>' +
      '<div class="role-empty">正在加载教学数据…</div>';
    try {
      var results = await Promise.all([request('/api/teacher/stats'), request('/api/teacher/students')]);
      renderTeacher(page, results[0], results[1].students || [], user);
      if (user.role === 'admin') await renderAdmin(page);
    } catch (e) {
      page.innerHTML = '<div class="page-header"><div><h1 class="page-title">教学管理</h1></div></div>' +
        '<div class="role-error">加载失败：' + esc(e.message) + '</div>';
    }
  };

  function renderTeacher(page, stats, students, user) {
    var adminEntry = user.role === 'admin'
      ? '<a class="role-action" href="admin.html" style="text-decoration:none">打开独立管理员后台 ↗</a>'
      : '';
    var hot = (stats.hot_kps || []).map(function (item) {
      return '<span>' + esc(item.kp_name) + ' · ' + esc(item.view_count) + ' 次</span>';
    }).join('') || '<span>暂无知识点访问数据</span>';
    var rows = students.map(function (s) {
      return '<tr><td><strong>' + esc(s.nickname || s.username) + '</strong><br><small>@' + esc(s.username) + '</small></td>' +
        '<td>' + esc(s.studied_kps || 0) + '</td><td>' + esc(s.questions_done || 0) + '</td><td>' + esc(s.wrong_count || 0) + '</td>' +
        '<td>' + formatDuration(s.total_seconds || 0) + '</td><td>' + esc(formatDate(s.last_active)) + '</td>' +
        '<td><button class="role-action" onclick="RoleCenter.openStudent(' + Number(s.id) + ')">查看</button></td></tr>';
    }).join('') || '<tr><td colspan="7" class="role-empty">暂无学生账号</td></tr>';
    page.innerHTML = '<div class="page-header"><div><h1 class="page-title">教学管理</h1><p class="page-subtitle">' + esc(roleNames[user.role]) + ' · ' + esc(user.nickname || user.username) + '</p></div>' + adminEntry + '</div>' +
      '<div class="role-page"><div class="role-summary">' +
      stat('学生总数', stats.total_students || 0) + stat('今日活跃', stats.active_today || 0) + stat('热门知识点', (stats.hot_kps || []).length) +
      '</div><section class="role-panel"><div class="role-panel-head"><strong>热门知识点</strong></div><div class="role-hot">' + hot + '</div></section>' +
      '<section class="role-panel"><div class="role-panel-head"><strong>学生学习概览</strong><span class="role-pill">' + students.length + ' 人</span></div>' +
      '<div class="role-table-wrap"><table class="role-table"><thead><tr><th>学生</th><th>已学知识点</th><th>答题</th><th>错题</th><th>学习时长</th><th>最后活跃</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div></section></div>';
  }

  function stat(label, value) {
    return '<div class="role-stat"><span>' + esc(label) + '</span><strong>' + esc(value) + '</strong></div>';
  }

  async function renderAdmin(page) {
    var result = await request('/api/admin/users');
    var users = result.users || [];
    var rows = users.map(function (u) {
      var options = ['student', 'teacher', 'admin'].map(function (role) {
        return '<option value="' + role + '"' + (u.role === role ? ' selected' : '') + '>' + roleNames[role] + '</option>';
      }).join('');
      return '<tr><td>' + esc(u.username) + '</td><td>' + esc(u.nickname || '') + '</td><td>' + esc(u.email || '') + '</td>' +
        '<td><select class="role-select" data-user-id="' + Number(u.id) + '" data-original="' + esc(u.role) + '" onchange="RoleCenter.changeRole(this)">' + options + '</select></td>' +
        '<td>' + esc(formatDate(u.created_at)) + '</td></tr>';
    }).join('');
    var section = document.createElement('section');
    section.className = 'role-panel';
    section.innerHTML = '<div class="role-panel-head"><strong>账号角色管理</strong><span class="role-pill">管理员</span></div>' +
      '<div class="role-table-wrap"><table class="role-table"><thead><tr><th>用户名</th><th>昵称</th><th>邮箱</th><th>角色</th><th>注册时间</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    var holder = page.querySelector('.role-page');
    if (holder) holder.appendChild(section);
  }

  RoleCenter.changeRole = async function (select) {
    var original = select.getAttribute('data-original');
    select.disabled = true;
    try {
      await request('/api/admin/set-role', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: Number(select.getAttribute('data-user-id')), role: select.value })
      });
      select.setAttribute('data-original', select.value);
    } catch (e) {
      select.value = original;
      window.alert('角色修改失败：' + e.message);
    } finally { select.disabled = false; }
  };

  RoleCenter.openStudent = async function (id) {
    try {
      var data = await request('/api/teacher/students/' + Number(id));
      var events = (data.events || []).map(function (event) {
        return '<div class="role-event"><strong>' + esc(event.event_type) + '</strong>' +
          (event.kp_name ? ' · ' + esc(event.kp_name) : '') + '<time>' + esc(formatDate(event.created_at)) + '</time></div>';
      }).join('') || '<div class="role-empty">暂无学习事件</div>';
      var overlay = document.createElement('div');
      overlay.className = 'role-detail';
      overlay.id = 'roleStudentDetail';
      overlay.onclick = function (event) { if (event.target === overlay) overlay.remove(); };
      overlay.innerHTML = '<div class="role-detail-card"><div class="role-detail-head"><div><h2>' + esc(data.student.nickname || data.student.username) + '</h2><small>@' + esc(data.student.username) + '</small></div>' +
        '<button class="role-action" onclick="document.getElementById(\'roleStudentDetail\').remove()">关闭</button></div>' + events + '</div>';
      document.body.appendChild(overlay);
    } catch (e) { window.alert('加载学生详情失败：' + e.message); }
  };

  function formatDuration(seconds) {
    var n = Math.max(0, Number(seconds) || 0);
    if (n < 60) return Math.round(n) + ' 秒';
    if (n < 3600) return Math.round(n / 60) + ' 分钟';
    return (n / 3600).toFixed(1) + ' 小时';
  }

  function formatDate(value) {
    if (!value) return '暂无';
    var date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('zh-CN', { hour12: false });
  }

  function installHooks() {
    var originalNavigate = window.navigate;
    if (typeof originalNavigate === 'function') {
      window.navigate = function (page) {
        originalNavigate(page);
        if (page === 'teacher') RoleCenter.render();
      };
    }
    var originalOpenViz = window.openVizView;
    if (typeof originalOpenViz === 'function') {
      window.openVizView = function (chapterNum, kpIdx) {
        var chapter = typeof state !== 'undefined' ? state.currentChapter : null;
        var kp = chapter && chapter.kps ? chapter.kps[kpIdx] : null;
        var result = originalOpenViz.apply(this, arguments);
        RoleCenter.logEvent('view_kp', {
          course_id: chapter ? chapter.courseId : '', chapter_num: chapterNum, kp_idx: kpIdx,
          detail: { kp_name: kp ? kp.name : '' }
        });
        return result;
      };
    }
    var originalOpenChapter = window.openChapter;
    if (typeof originalOpenChapter === 'function') {
      window.openChapter = function (chapterNum) {
        var result = originalOpenChapter.apply(this, arguments);
        var course = typeof state !== 'undefined' ? state.currentCourse : null;
        RoleCenter.logEvent('view_chapter', { course_id: course ? course.id : '', chapter_num: chapterNum });
        return result;
      };
    }
    if (window.Account && typeof window.Account.recordQuestion === 'function') {
      var originalRecordQuestion = window.Account.recordQuestion;
      window.Account.recordQuestion = function (score) {
        var result = originalRecordQuestion.apply(this, arguments);
        RoleCenter.logEvent('submit_question', { detail: { score: Number(score) || 0 } });
        return result;
      };
    }
  }

  window.RoleCenter = RoleCenter;
  installHooks();
  RoleCenter.refreshNavigation();
  setInterval(RoleCenter.refreshNavigation, 1200);
})();
