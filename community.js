/* =========================================================================
 * community.js — 互动课堂·社区（服务端共享数据）
 *
 * 设计要点：
 *   1. 社区数据全部存服务端（community_posts / comments / likes），全站共享，
 *      不再按账号存在 localStorage 里（旧版每人只能看到自己的帖子）。
 *   2. 每日挑战：题目由服务端生成（优先 AI，未配置则题库兜底），全站每天一题；
 *      用户在右侧面板作答后一键发帖，自动带上题目与话题标签。
 *   3. 热门话题：从真实帖子的 #话题 聚合，服务端每天落一份快照（community_topics）。
 *   4. 附件：选择文件后 base64 上传到 /api/community/upload，落盘 server/uploads，
 *      帖子只保存 {name,url,size,type}。
 * ========================================================================= */
(function () {
  'use strict';

  var API_BASE = window.API_BASE || (location.port === '8765' ? 'http://localhost:3000' : '');
  var BASE = API_BASE + '/api/community';

  var TAG_CLASS = {
    '讨论': 'tag-purple', '笔记': 'tag-green', '求助': 'tag-amber',
    '经验': 'tag-blue', '资料': 'tag-pink', '挑战': 'tag-amber'
  };
  var TAG_LIST = ['讨论', '笔记', '求助', '经验', '资料'];

  var state = {
    sort: 'hot',
    posts: [],
    loading: false,
    topics: [],
    topicFilter: '',
    challenge: null,
    challengeBusy: false,
    current: null          // 详情弹窗里的帖子
  };

  /* ───────── 基础工具 ───────── */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function api(path, method, body) {
    var opts = { method: method || 'GET', credentials: 'include', headers: {} };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    return fetch(BASE + path, opts).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) {
          var err = new Error(data.error || ('请求失败 (' + res.status + ')'));
          err.status = res.status;
          throw err;
        }
        return data;
      });
    });
  }

  function toast(msg, type) {
    var box = document.getElementById('cm-toast');
    if (!box) {
      box = document.createElement('div');
      box.id = 'cm-toast';
      box.style.cssText = 'position:fixed;left:50%;bottom:32px;transform:translateX(-50%);z-index:99999;';
      document.body.appendChild(box);
    }
    var t = document.createElement('div');
    t.style.cssText = 'margin-top:8px;padding:10px 18px;border-radius:10px;font-size:0.88rem;color:#fff;' +
      'box-shadow:0 8px 24px rgba(0,0,0,.18);background:' + (type === 'error' ? '#ef4444' : '#10b981');
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }

  function loggedIn() { return !!(window.Account && Account.state && Account.state.user); }

  function requireLogin() {
    if (loggedIn()) return true;
    toast('请先登录后再操作', 'error');
    if (window.Account && Account.openModal) setTimeout(function () { Account.openModal('login'); }, 300);
    return false;
  }

  function fmtSize(n) {
    n = parseInt(n, 10) || 0;
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1024 / 1024).toFixed(2) + ' MB';
  }

  function isImage(a) {
    var t = String(a.type || '');
    var u = String(a.url || '');
    return /^image\//.test(t) || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(u);
  }

  function fileIcon(name) {
    var m = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
    var e = m ? m[1] : '';
    if (['c', 'h', 'cpp', 'py', 'js', 'java', 'cs', 'go', 'rs', 'sql', 'json'].indexOf(e) >= 0) return '⌨';
    if (['pdf'].indexOf(e) >= 0) return '📕';
    if (['doc', 'docx'].indexOf(e) >= 0) return '📘';
    if (['xls', 'xlsx', 'csv'].indexOf(e) >= 0) return '📗';
    if (['ppt', 'pptx'].indexOf(e) >= 0) return '📙';
    if (['zip', 'rar', '7z'].indexOf(e) >= 0) return '🗜';
    if (['txt', 'md'].indexOf(e) >= 0) return '📄';
    return '📎';
  }

  /* ───────── 帖子列表 ───────── */
  function renderPosts() {
    var box = document.getElementById('communityPosts');
    if (!box) return;

    if (state.loading && !state.posts.length) {
      box.innerHTML = '<div class="side-empty">正在加载帖子…</div>';
      return;
    }
    if (!state.posts.length) {
      box.innerHTML = '<div class="community-empty">' +
        '<div class="community-empty-icon">💬</div>' +
        '<p>还没有帖子</p>' +
        '<span>来发第一条吧，或者在右侧完成今日挑战自动发帖</span>' +
        '<button class="btn btn-primary" onclick="Community.openNewPost()">发布帖子</button>' +
        '</div>';
      return;
    }

    var head = '';
    if (state.topicFilter) {
      head = '<div class="community-filter">正在筛选话题 <strong>' + esc(state.topicFilter) + '</strong>' +
        '<button class="filter-clear" onclick="Community.clearTopicFilter()">清除</button></div>';
    }

    box.innerHTML = head + state.posts.map(function (p) {
      var atts = (p.attachments || []).slice(0, 4).map(function (a) {
        if (isImage(a)) {
          return '<a class="post-attach-img" href="' + esc(API_BASE + a.url) + '" target="_blank" rel="noopener" ' +
            'onclick="event.stopPropagation()"><img src="' + esc(API_BASE + a.url) + '" alt="' + esc(a.name) + '"></a>';
        }
        return '<a class="post-attach-chip" href="' + esc(API_BASE + a.url) + '" target="_blank" rel="noopener" download ' +
          'onclick="event.stopPropagation()">' + fileIcon(a.name) + ' ' + esc(a.name) + '</a>';
      }).join('');
      var moreAtt = (p.attachments || []).length > 4
        ? '<span class="post-attach-more">+' + ((p.attachments || []).length - 4) + ' 个附件</span>' : '';

      return '<div class="post-card post-clickable" data-post-id="' + p.id + '" onclick="Community.openPost(' + p.id + ', event)">' +
        '<div class="post-author">' +
          '<div class="post-avatar" style="background:' + esc(p.color) + '">' + esc(p.avatar) + '</div>' +
          '<div><span class="post-name">' + esc(p.author) + '</span><span class="post-time"> · ' + esc(p.time) + '</span></div>' +
          '<span class="tag ' + (TAG_CLASS[p.tag] || 'tag-purple') + '" style="margin-left:auto">' + esc(p.tag) + '</span>' +
        '</div>' +
        '<h3 class="post-title">' + esc(p.title) + '</h3>' +
        (p.topic ? '<span class="post-topic-chip" onclick="Community.filterByTopic(\'' + esc(p.topic) + '\', event)">' + esc(p.topic) + '</span>' : '') +
        '<p class="post-excerpt">' + esc(p.excerpt) + (String(p.content || '').length > 140 ? '…' : '') + '</p>' +
        (atts ? '<div class="post-attach-row">' + atts + moreAtt + '</div>' : '') +
        '<div class="post-footer">' +
          '<button class="post-action-btn' + (p.liked ? ' liked' : '') + '" onclick="Community.toggleLike(' + p.id + ', event)">' +
            '<span class="post-stat">❤ ' + p.likes + '</span></button>' +
          '<button class="post-action-btn" onclick="Community.openPost(' + p.id + ', event)">' +
            '<span class="post-stat">💬 ' + p.comments + '</span></button>' +
          '<span class="post-stat post-hot">🔥 热度 ' + p.hot + '</span>' +
          '<span class="post-stat post-open-hint">点击查看全文 →</span>' +
          (p.isMine ? '<button class="post-action-btn post-del-btn" onclick="Community.removePost(' + p.id + ', event)">' +
            '<span class="post-stat">删除</span></button>' : '') +
        '</div>' +
      '</div>';
    }).join('');

    if (window.renderMath) setTimeout(function () { renderMath(box); }, 60);
  }

  function loadPosts() {
    state.loading = true;
    var q = '?sort=' + state.sort + '&limit=30';
    if (state.topicFilter) q += '&topic=' + encodeURIComponent(state.topicFilter);
    return api('/posts' + q).then(function (data) {
      state.posts = data.posts || [];
      state.loading = false;
      renderPosts();
    }).catch(function (e) {
      state.loading = false;
      var box = document.getElementById('communityPosts');
      if (box) box.innerHTML = '<div class="community-empty"><p>帖子加载失败</p><span>' + esc(e.message) + '</span>' +
        '<button class="btn btn-outline" onclick="Community.refresh()">重试</button></div>';
    });
  }

  function setSort(sort) {
    state.sort = (sort === 'new') ? 'new' : 'hot';
    var wrap = document.getElementById('communitySort');
    if (wrap) {
      Array.prototype.forEach.call(wrap.querySelectorAll('.sort-btn'), function (b) {
        b.classList.toggle('active', b.getAttribute('data-sort') === state.sort);
      });
    }
    loadPosts();
  }

  function filterByTopic(topic, ev) {
    if (ev) ev.stopPropagation();
    state.topicFilter = topic;
    loadPosts();
  }
  function clearTopicFilter() { state.topicFilter = ''; loadPosts(); }

  function refresh() {
    loadPosts();
    loadTopics();
    loadActiveUsers();
    loadDailyChallenge();
  }

  /* ───────── 点赞 ───────── */
  function toggleLike(id, ev) {
    if (ev) ev.stopPropagation();
    if (!requireLogin()) return;
    api('/posts/' + id + '/like', 'POST', {}).then(function (r) {
      var p = state.posts.filter(function (x) { return x.id === id; })[0];
      if (p) {
        p.liked = r.liked;
        p.likes = r.likes;
        p.hot = p.likes * 3 + p.comments * 5 + p.shares * 2;
      }
      if (state.current && state.current.id === id) {
        state.current.liked = r.liked;
        state.current.likes = r.likes;
        renderDetail();
      }
      renderPosts();
    }).catch(function (e) { toast(e.message, 'error'); });
  }

  function removePost(id, ev) {
    if (ev) ev.stopPropagation();
    if (!window.confirm('确认删除这条帖子？删除后不可恢复。')) return;
    api('/posts/' + id, 'DELETE').then(function () {
      toast('帖子已删除');
      closeModal();
      state.posts = state.posts.filter(function (x) { return x.id !== id; });
      renderPosts();
      loadTopics();
      loadActiveUsers();
      if (state.challenge) loadDailyChallenge();
    }).catch(function (e) { toast(e.message, 'error'); });
  }

  /* ───────── 通用弹窗 ───────── */
  function ensureModal() {
    var m = document.getElementById('communityModal');
    if (m) return m;
    m = document.createElement('div');
    m.id = 'communityModal';
    m.className = 'modal-overlay';
    m.onclick = function (e) { if (e.target === m) closeModal(); };
    document.body.appendChild(m);
    return m;
  }
  function closeModal() {
    var m = document.getElementById('communityModal');
    if (m) m.classList.remove('active');
    state.current = null;
  }

  /* ───────── 帖子详情 ───────── */
  function openPost(id, ev) {
    if (ev) ev.stopPropagation();
    api('/posts/' + id).then(function (data) {
      state.current = data.post;
      renderDetail();
    }).catch(function (e) { toast(e.message, 'error'); });
  }

  function renderDetail() {
    var p = state.current;
    if (!p) return;
    var m = ensureModal();

    var atts = (p.attachments || []).map(function (a) {
      if (isImage(a)) {
        return '<a class="detail-attach-img" href="' + esc(API_BASE + a.url) + '" target="_blank" rel="noopener">' +
          '<img src="' + esc(API_BASE + a.url) + '" alt="' + esc(a.name) + '"><span>' + esc(a.name) + '</span></a>';
      }
      return '<a class="detail-attach-file" href="' + esc(API_BASE + a.url) + '" target="_blank" rel="noopener" download>' +
        '<span class="detail-attach-icon">' + fileIcon(a.name) + '</span>' +
        '<span class="detail-attach-meta"><strong>' + esc(a.name) + '</strong><em>' + fmtSize(a.size) + '</em></span></a>';
    }).join('');

    var comments = (p.commentList || []).map(function (c) {
      return '<div class="comment-item"><div class="comment-head">' +
        '<span class="post-avatar comment-avatar" style="background:' + esc(c.color) + '">' + esc(c.avatar) + '</span>' +
        '<strong>' + esc(c.author) + '</strong><span class="post-time"> · ' + esc(c.time) + '</span></div>' +
        '<p class="comment-text">' + esc(c.text).replace(/\n/g, '<br>') + '</p></div>';
    }).join('') || '<p class="detail-empty">还没有评论，来第一个！</p>';

    m.innerHTML = '<div class="modal-card community-detail-card">' +
      '<div class="modal-header">' +
        '<div class="detail-title-wrap">' +
          '<span class="tag ' + (TAG_CLASS[p.tag] || 'tag-purple') + '">' + esc(p.tag) + '</span>' +
          (p.topic ? '<span class="post-topic-chip">' + esc(p.topic) + '</span>' : '') +
          (p.challengeDate ? '<span class="detail-challenge-badge">每日挑战</span>' : '') +
        '</div>' +
        '<button class="modal-close" onclick="Community.closeModal()">✕</button>' +
      '</div>' +
      '<div class="detail-scroll">' +
        '<h2 class="detail-title">' + esc(p.title) + '</h2>' +
        '<div class="post-author detail-author">' +
          '<div class="post-avatar" style="background:' + esc(p.color) + '">' + esc(p.avatar) + '</div>' +
          '<div><span class="post-name">' + esc(p.author) + '</span><span class="post-time"> · ' + esc(p.time) + '</span></div>' +
          '<span class="post-stat detail-hot" style="margin-left:auto">🔥 热度 ' + p.hot + '</span>' +
        '</div>' +
        '<div class="detail-content">' + esc(p.content).replace(/\n/g, '<br>') + '</div>' +
        (atts ? '<div class="detail-attach-list"><div class="detail-section-title">附件（' + p.attachments.length + '）</div>' + atts + '</div>' : '') +
        '<div class="detail-actions">' +
          '<button class="post-action-btn' + (p.liked ? ' liked' : '') + '" onclick="Community.toggleLike(' + p.id + ', event)">' +
            '<span class="post-stat">❤ ' + p.likes + '</span></button>' +
          '<span class="post-stat">💬 ' + p.comments + '</span>' +
          (p.isMine ? '<button class="post-action-btn post-del-btn" onclick="Community.removePost(' + p.id + ', event)">' +
            '<span class="post-stat">删除</span></button>' : '') +
        '</div>' +
        '<div class="detail-section-title">评论（' + (p.commentList || []).length + '）</div>' +
        '<div class="detail-comments">' + comments + '</div>' +
      '</div>' +
      '<div class="detail-comment-box">' +
        '<input id="communityCommentInput" class="form-input" placeholder="写下学习相关评论，请文明交流…" ' +
          'onkeydown="if(event.key===\'Enter\')Community.submitComment(' + p.id + ')" />' +
        '<button class="btn btn-primary" onclick="Community.submitComment(' + p.id + ')">发送</button>' +
      '</div>' +
    '</div>';

    m.classList.add('active');
    if (window.renderMath) setTimeout(function () { renderMath(m); }, 80);
  }

  function submitComment(id) {
    if (!requireLogin()) return;
    var input = document.getElementById('communityCommentInput');
    var text = input ? input.value.trim() : '';
    if (!text) { toast('评论内容不能为空', 'error'); return; }
    api('/posts/' + id + '/comments', 'POST', { content: text }).then(function (r) {
      if (input) input.value = '';
      if (state.current && state.current.id === id) {
        if (!state.current.commentList) state.current.commentList = [];
        state.current.commentList.push(r.comment);
        state.current.comments = state.current.commentList.length;
        state.current.hot = state.current.likes * 3 + state.current.comments * 5 + state.current.shares * 2;
        renderDetail();
      }
      var p = state.posts.filter(function (x) { return x.id === id; })[0];
      if (p) { p.comments += 1; p.hot = p.likes * 3 + p.comments * 5 + p.shares * 2; renderPosts(); }
      loadTopics();
    }).catch(function (e) { toast(e.message, 'error'); });
  }

  /* ───────── 发帖（含话题与附件） ───────── */
  var draft = { attachments: [] };

  function openNewPost(prefill) {
    if (!requireLogin()) return;
    prefill = prefill || {};
    draft = { attachments: [] };
    var m = ensureModal();

    m.innerHTML = '<div class="modal-card community-post-card">' +
      '<div class="modal-header"><h3>发布帖子</h3>' +
        '<button class="modal-close" onclick="Community.closeModal()">✕</button></div>' +
      '<div class="modal-body">' +
        '<input id="newPostTitle" class="form-input" placeholder="帖子标题（必填，最多 120 字）" value="' + esc(prefill.title || '') + '" />' +
        '<textarea id="newPostContent" class="form-input" rows="6" placeholder="正文内容，支持 $LaTeX$ 数学公式与 #话题 标签；请聚焦学习内容" ' +
          'style="resize:vertical">' + esc(prefill.content || '') + '</textarea>' +
        '<div class="post-form-row">' +
          '<input id="newPostTopic" class="form-input" placeholder="#话题（选填，会自动生成热门话题；留空则从正文提取）" value="' + esc(prefill.topic || '') + '" />' +
        '</div>' +
        '<div class="post-tag-picker" id="newPostTagPicker">' + TAG_LIST.map(function (t, i) {
          var active = (prefill.tag ? prefill.tag === t : i === 0);
          return '<label class="post-tag-opt' + (active ? ' active' : '') + '">' +
            '<input type="radio" name="newPostTag" value="' + t + '"' + (active ? ' checked' : '') + ' />' + t + '</label>';
        }).join('') + '</div>' +
        '<div class="attach-area">' +
          '<div class="attach-head">' +
            '<span>附件（可选，单个不超过 8MB，最多 6 个）</span>' +
            '<label class="attach-pick">选择文件<input type="file" id="newPostFile" multiple hidden /></label>' +
          '</div>' +
          '<div class="attach-list" id="newPostAttachList"><span class="attach-empty">尚未添加附件</span></div>' +
        '</div>' +
        '<p style="margin:10px 0 0;color:#64748b;font-size:12px;line-height:1.6">社区会自动拦截辱骂低俗及违法违规内容，请尊重他人并聚焦学习交流。</p>' +
        '<div class="ac-err" id="newPostErr"></div>' +
        '<div class="post-form-actions">' +
          '<button class="btn btn-primary" id="newPostSubmit" onclick="Community.submitNewPost()">发布</button>' +
          '<button class="btn btn-outline" onclick="Community.closeModal()">取消</button>' +
        '</div>' +
      '</div>' +
    '</div>';

    m.classList.add('active');

    // 标签选中态
    var picker = document.getElementById('newPostTagPicker');
    if (picker) {
      picker.addEventListener('change', function () {
        Array.prototype.forEach.call(picker.querySelectorAll('.post-tag-opt'), function (l) {
          var i = l.querySelector('input');
          l.classList.toggle('active', !!(i && i.checked));
        });
      });
    }
    var fileInput = document.getElementById('newPostFile');
    if (fileInput) fileInput.addEventListener('change', onPickFiles);
  }

  function onPickFiles(e) {
    var files = Array.prototype.slice.call(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    if (draft.attachments.length + files.length > 6) {
      toast('最多只能添加 6 个附件', 'error');
      return;
    }
    files.forEach(function (f) {
      if (f.size > 8 * 1024 * 1024) { toast('「' + f.name + '」超过 8MB，已跳过', 'error'); return; }
      renderAttachList(f.name, 'uploading');
      readAndUpload(f);
    });
  }

  function renderAttachList(pendingName, status) {
    var box = document.getElementById('newPostAttachList');
    if (!box) return;
    var items = draft.attachments.map(function (a, idx) {
      return '<span class="attach-item">' + fileIcon(a.name) + ' <em>' + esc(a.name) + '</em>' +
        '<span class="attach-size">' + fmtSize(a.size) + '</span>' +
        '<button class="attach-remove" onclick="Community.removeAttach(' + idx + ')">✕</button></span>';
    }).join('');
    if (pendingName) {
      items += '<span class="attach-item attach-pending">⏳ <em>' + esc(pendingName) + '</em> 上传中…</span>';
    }
    box.innerHTML = items || '<span class="attach-empty">尚未添加附件</span>';
  }

  function readAndUpload(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var dataUrl = reader.result || '';
      api('/upload', 'POST', { name: file.name, type: file.type, data: dataUrl })
        .then(function (r) {
          draft.attachments.push(r.file);
          renderAttachList();
        })
        .catch(function (err) {
          renderAttachList();
          toast('「' + file.name + '」上传失败：' + err.message, 'error');
        });
    };
    reader.onerror = function () { renderAttachList(); toast('读取文件失败', 'error'); };
    reader.readAsDataURL(file);
  }

  function removeAttach(idx) {
    draft.attachments.splice(idx, 1);
    renderAttachList();
  }

  function submitNewPost() {
    var errBox = document.getElementById('newPostErr');
    if (errBox) errBox.textContent = '';
    var title = (document.getElementById('newPostTitle') || {}).value || '';
    var content = (document.getElementById('newPostContent') || {}).value || '';
    var topic = (document.getElementById('newPostTopic') || {}).value || '';
    var tagEl = document.querySelector('#newPostTagPicker input[name="newPostTag"]:checked');
    title = title.trim();
    if (!title) { if (errBox) errBox.textContent = '请填写帖子标题'; return; }

    var btn = document.getElementById('newPostSubmit');
    if (btn) { btn.disabled = true; btn.textContent = '发布中…'; }

    api('/posts', 'POST', {
      title: title,
      content: content.trim(),
      topic: topic.trim(),
      tag: tagEl ? tagEl.value : '讨论',
      attachments: draft.attachments
    }).then(function (r) {
      closeModal();
      toast('发布成功');
      state.posts.unshift(r.post);
      renderPosts();
      loadTopics();
      loadActiveUsers();
      if (state.challenge) loadDailyChallenge();
    }).catch(function (e) {
      if (errBox) errBox.textContent = e.message;
    }).then(function () {
      var b = document.getElementById('newPostSubmit');
      if (b) { b.disabled = false; b.textContent = '发布'; }
    });
  }

  /* ───────── 侧栏：热门话题 ───────── */
  function loadTopics() {
    api('/topics').then(function (data) {
      state.topics = data.topics || [];
      var box = document.getElementById('hotTopicList');
      var dateEl = document.getElementById('hotTopicDate');
      if (dateEl) dateEl.textContent = data.date ? (data.date.slice(5) + ' 统计') : '';
      if (!box) return;
      if (!state.topics.length) {
        box.innerHTML = '<div class="side-empty">暂无话题，发帖时加上 #话题 试试</div>';
        return;
      }
      var max = state.topics[0].hot || 1;
      box.innerHTML = state.topics.map(function (t, i) {
        var pct = Math.max(8, Math.round((t.hot / max) * 100));
        return '<div class="topic-item' + (state.topicFilter === t.topic ? ' active' : '') + '" ' +
          'onclick="Community.filterByTopic(\'' + esc(t.topic) + '\')" title="热度 ' + t.hot + '，' + t.count + ' 篇帖子">' +
          '<span class="topic-rank">' + (i + 1) + '</span>' +
          '<span class="topic-name">' + esc(t.topic) + '</span>' +
          '<span class="topic-count">' + t.count + ' 帖</span>' +
          '<span class="topic-bar" style="width:' + pct + '%"></span>' +
        '</div>';
      }).join('');
    }).catch(function () {
      var box = document.getElementById('hotTopicList');
      if (box) box.innerHTML = '<div class="side-empty">热门话题加载失败</div>';
    });
  }

  function loadActiveUsers() {
    api('/active-users').then(function (data) {
      var box = document.getElementById('activeUserList');
      if (!box) return;
      var users = data.users || [];
      if (!users.length) { box.innerHTML = '<div class="side-empty">还没有人发帖</div>'; return; }
      box.innerHTML = users.map(function (u) {
        return '<div class="active-user">' +
          '<div class="post-avatar" style="background:' + esc(u.color) + ';width:32px;height:32px;font-size:13px">' + esc(u.avatar) + '</div>' +
          '<span class="active-user-name">' + esc(u.name) + '</span>' +
          '<span class="active-user-meta">' + u.posts + ' 帖 · ' + u.likes + ' 赞</span>' +
        '</div>';
      }).join('');
    }).catch(function () {});
  }

  /* ───────── 每日挑战 ───────── */
  function sourceLabel(src) {
    if (src === 'ai') return { text: 'AI 生成', cls: 'tag-blue' };
    return { text: '题库', cls: 'tag-purple' };
  }

  function loadDailyChallenge() {
    return api('/daily-challenge').then(function (d) {
      state.challenge = d;
      renderChallengePanel();
      renderDashboardChallenge();
    }).catch(function () {
      var body = document.getElementById('dcBody');
      if (body) body.innerHTML = '<p class="challenge-desc">每日挑战加载失败</p>';
      var q = document.getElementById('dashDcQuestion');
      if (q) q.textContent = '每日挑战加载失败，请稍后重试';
    });
  }

  function renderChallengePanel() {
    var d = state.challenge;
    var body = document.getElementById('dcBody');
    var tag = document.getElementById('dcSourceTag');
    if (!d || !body) return;
    var sl = sourceLabel(d.source);
    if (tag) { tag.className = 'tag ' + sl.cls; tag.textContent = sl.text; }

    body.innerHTML =
      '<span class="post-topic-chip dc-topic">' + esc(d.topic) + '</span>' +
      '<p class="challenge-desc dc-question">' + esc(d.question) + '</p>' +
      (d.hint ? '<div class="dc-hint">💡 ' + esc(d.hint) + '</div>' : '') +
      '<textarea id="dcAnswer" class="form-input dc-answer" rows="4" ' +
        'placeholder="写下你的思路或答案，提交后会自动发一条帖子到社区…"></textarea>' +
      '<button class="btn btn-primary full-width" id="dcSubmitBtn" onclick="Community.submitChallenge()">' +
        (d.myPosted ? '再次发布到社区' : '提交到社区 →') + '</button>' +
      '<div class="dc-foot">' +
        '<span>今日已有 <strong>' + d.postCount + '</strong> 人提交</span>' +
        '<button class="dc-link" onclick="Community.regenerateChallenge()" title="换一题（全站同步）">换一题</button>' +
      '</div>' +
      (d.myPosted ? '<div class="dc-posted">✓ 你今天已提交过挑战</div>' : '');

    if (window.renderMath) setTimeout(function () { renderMath(body); }, 60);
  }

  function renderDashboardChallenge() {
    var d = state.challenge;
    if (!d) return;
    var q = document.getElementById('dashDcQuestion');
    if (q) q.textContent = d.question;
    var tag = document.getElementById('dashDcTag');
    if (tag) {
      var sl = sourceLabel(d.source);
      tag.className = 'tag ' + sl.cls;
      tag.textContent = d.myPosted ? '今日已提交 ✓' : sl.text;
    }
    if (window.renderMath) {
      var card = q && q.parentElement;
      if (card) setTimeout(function () { renderMath(card); }, 100);
    }
  }

  function submitChallenge() {
    var d = state.challenge;
    if (!d) return;
    if (!requireLogin()) return;
    var ta = document.getElementById('dcAnswer');
    var answer = ta ? ta.value.trim() : '';
    if (!answer) { toast('先写下你的思路再提交吧', 'error'); if (ta) ta.focus(); return; }

    var btn = document.getElementById('dcSubmitBtn');
    if (btn) { btn.disabled = true; btn.textContent = '提交中…'; }

    var firstTime = !d.myPosted;
    api('/posts', 'POST', {
      tag: '挑战',
      topic: d.topic,
      title: '【每日挑战 ' + d.date + '】' + d.question.replace(/\s+/g, ' ').slice(0, 60),
      content: '**今日挑战题**\n' + d.question + '\n\n**我的解答**\n' + answer,
      challengeDate: d.date,
      attachments: []
    }).then(function (r) {
      toast(firstTime ? '提交成功，积分 +50' : '已发布到社区');
      if (firstTime && window.Account && Account.awardPoints) Account.awardPoints(50);
      state.posts.unshift(r.post);
      renderPosts();
      return loadDailyChallenge().then(function () { loadTopics(); loadActiveUsers(); });
    }).catch(function (e) {
      toast(e.message, 'error');
    }).then(function () {
      var b = document.getElementById('dcSubmitBtn');
      if (b) { b.disabled = false; b.textContent = '提交到社区 →'; }
    });
  }

  function regenerateChallenge() {
    if (!requireLogin()) return;
    if (state.challengeBusy) return;
    state.challengeBusy = true;
    toast('正在换题…');
    api('/daily-challenge/regenerate', 'POST', {}).then(function () {
      return loadDailyChallenge();
    }).catch(function (e) {
      toast(e.message, 'error');
    }).then(function () { state.challengeBusy = false; });
  }

  /* ───────── 页面切换钩子 ───────── */
  (function hookNavigate() {
    if (typeof window.navigate !== 'function') return;
    var orig = window.navigate;
    window.navigate = function (page, chapter, kp) {
      orig(page, chapter, kp);
      if (page === 'community') setTimeout(function () { refresh(); }, 0);
      else if (page === 'dashboard') setTimeout(function () { loadDashboardChallenge(); }, 0);
    };
  })();

  /* ───────── 对外接口 ───────── */
  window.Community = {
    state: state,
    refresh: refresh,
    loadPosts: loadPosts,
    setSort: setSort,
    filterByTopic: filterByTopic,
    clearTopicFilter: clearTopicFilter,
    toggleLike: toggleLike,
    removePost: removePost,
    openPost: openPost,
    closeModal: closeModal,
    submitComment: submitComment,
    openNewPost: openNewPost,
    submitNewPost: submitNewPost,
    removeAttach: removeAttach,
    loadTopics: loadTopics,
    loadActiveUsers: loadActiveUsers,
    loadDailyChallenge: loadDailyChallenge,
    loadDashboardChallenge: loadDailyChallenge,
    submitChallenge: submitChallenge,
    regenerateChallenge: regenerateChallenge,
    toast: toast
  };

  // 首屏：拉一次首页每日挑战卡片
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { loadDailyChallenge(); });
  } else {
    loadDailyChallenge();
  }
})();
