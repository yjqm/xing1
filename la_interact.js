/* ═══════════════════════════════════════════
   线代交互模块 D+E
   D. 游戏化徽章系统 | E. 学习进度仪表盘
   ═══════════════════════════════════════════ */

/* ── D. 游戏化徽章系统 ── */
var LABadges = [
  { id:'det-novice', name:'行列式新手', icon:'🔢', desc:'完成第1章所有知识点', chapter:1, color:'#10b981' },
  { id:'matrix-king', name:'矩阵之王', icon:'🧱', desc:'完成第2章所有知识点', chapter:2, color:'#0ea5e9' },
  { id:'transform-master', name:'变换大师', icon:'🔄', desc:'完成第3章所有知识点', chapter:3, color:'#f59e0b' },
  { id:'vector-guru', name:'向量宗师', icon:'🏹', desc:'完成第4章所有知识点', chapter:4, color:'#ec4899' },
  { id:'eigen-hunter', name:'特征猎手', icon:'🎯', desc:'完成第5章所有知识点', chapter:5, color:'#ef4444' },
  { id:'la-phd', name:'线代博士', icon:'🎓', desc:'完成全部6章', chapter:6, color:'#8b5cf6' }
];

function getLABadges() {
  try { return JSON.parse(localStorage.getItem('la_badges')||'[]'); } catch(e) { return []; }
}
function saveLABadges(arr) { localStorage.setItem('la_badges', JSON.stringify(arr)); }

function checkLABadge(chapterNum) {
  var earned = getLABadges();
  var badge = LABadges.find(function(b){ return b.chapter === chapterNum; });
  if (!badge || earned.indexOf(badge.id) >= 0) return;
  earned.push(badge.id);
  saveLABadges(earned);
  if (window.Account && typeof window.Account.reportAchievement === 'function') {
    window.Account.reportAchievement('la-' + badge.id);
  }
  showBadgePopup(badge);
}

function showBadgePopup(badge) {
  var popup = document.createElement('div');
  popup.className = 'badge-popup';
  popup.innerHTML = '<div class="badge-popup-icon">'+badge.icon+'</div>' +
    '<div class="badge-popup-name">'+badge.name+'</div>' +
    '<div class="badge-popup-desc">'+badge.desc+'</div>' +
    '<div class="badge-popup-earned">🏆 成就解锁!</div>';
  document.body.appendChild(popup);
  setTimeout(function(){
    popup.classList.add('show');
    setTimeout(function(){ popup.classList.remove('show'); setTimeout(function(){ popup.remove(); }, 500); }, 2500);
  }, 100);
}

function renderLABadgeWall() {
  var earned = getLABadges();
  return '<div class="badge-wall">' +
    '<div style="font-size:14px;font-weight:600;color:var(--accent);margin-bottom:12px">🏆 线代成就徽章</div>' +
    '<div class="badge-grid">' +
    LABadges.map(function(b){
      var unlocked = earned.indexOf(b.id) >= 0;
      return '<div class="badge-item'+(unlocked?' unlocked':' locked')+'" style="--bc:'+b.color+'">' +
        '<div class="badge-item-icon">'+(unlocked?b.icon:'🔒')+'</div>' +
        '<div class="badge-item-name">'+b.name+'</div>' +
        '<div class="badge-item-desc">'+b.desc+'</div>' +
      '</div>';
    }).join('') +
    '</div></div>';
}

/* ── E. 学习进度仪表盘 ── */
function getLAChapterDone(chapter) {
  if (typeof countStudiedInChapter === 'function') return countStudiedInChapter(chapter);
  return parseInt(localStorage.getItem('la_ch_'+chapter.num+'_done') || '0', 10) || 0;
}

function renderLADashboard() {
  var ch = state.currentChapter;
  if (!ch || ch.courseId !== 'la') return '';

  var allChapters = chaptersData.filter(function(c){ return c.courseId === 'la'; });

  // 计算总体进度
  var totalKPs = 0, completedKPs = 0;
  allChapters.forEach(function(c){
    totalKPs += c.kps.length;
    completedKPs += getLAChapterDone(c);
  });
  var progress = Math.round(completedKPs / totalKPs * 100) || 0;

  // 构建进度条
  var chBars = allChapters.map(function(c){
    var chTotal = c.kps.length;
    var chDone = getLAChapterDone(c);
    var chPct = Math.round(chDone / chTotal * 100) || 0;
    var colors = {1:'#6366f1',2:'#0ea5e9',3:'#10b981',4:'#f59e0b',5:'#ec4899',6:'#ef4444'};
    var bc = colors[c.num] || '#6366f1';
    return '<div class="dash-ch-row">' +
      '<span class="dash-ch-label">第'+c.num+'章 '+c.title+'</span>' +
      '<span class="dash-ch-stat">'+chDone+'/'+chTotal+'</span>' +
      '<div class="dash-ch-bar"><div class="dash-ch-fill" style="width:'+chPct+'%;background:'+bc+'"></div></div>' +
    '</div>';
  }).join('');

  return '<div class="la-dashboard">' +
    '<div class="dash-header">' +
      '<div style="font-size:20px;font-weight:700;color:var(--accent)">📊 线代学习分析</div>' +
      '<div class="dash-hero">'+
        '<div class="dash-ring-wrap"><svg class="dash-ring" viewBox="0 0 100 100">'+
          '<circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="8"/>'+
          '<circle cx="50" cy="50" r="42" fill="none" stroke="#6366f1" stroke-width="8" stroke-dasharray="'+(2*Math.PI*42*progress/100)+' '+(2*Math.PI*42*(1-progress/100))+'" stroke-dashoffset="'+(2*Math.PI*42*0.25)+'" stroke-linecap="round" transform="rotate(-90 50 50)"/>'+
        '</svg><div class="dash-ring-val">'+progress+'%</div></div>'+
        '<div style="text-align:left">'+
          '<div style="font-size:13px;color:var(--text-secondary)">已掌握知识点</div>'+
          '<div style="font-size:28px;font-weight:700;color:var(--accent)">'+completedKPs+'<span style="font-size:14px;color:var(--text-muted)">/'+totalKPs+'</span></div>'+
          '<div style="font-size:12px;color:var(--text-muted);margin-top:4px">共'+allChapters.length+'章'+totalKPs+'个知识点</div>'+ 
        '</div>'+
      '</div>'+
    '</div>'+
    '<div class="dash-section">'+
      '<div style="font-size:13px;font-weight:600;color:var(--text-secondary);margin-bottom:10px">各章节进度</div>'+
      chBars +
    '</div>'+
  '</div>';
}

/* ── 完成记录钩子 ── */
function markKPComplete(chapterNum, kpIdx) {
  var chapter = chaptersData.find(function(c){ return c.courseId === 'la' && c.num === chapterNum; });
  if (!chapter) return;
  if (typeof studKPKey === 'function' && Array.isArray(window.studiedSet)) {
    var studyKey = studKPKey('la', chapterNum, kpIdx);
    if (window.studiedSet.indexOf(studyKey) < 0) {
      window.studiedSet.push(studyKey);
      if (typeof saveStudied === 'function') saveStudied();
      if (window.Account && typeof window.Account.onStudiedChanged === 'function') {
        window.Account.onStudiedChanged();
      }
    }
  } else {
    var key = 'la_ch_'+chapterNum+'_seen';
    var seen;
    try { seen = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { seen = []; }
    if (!Array.isArray(seen)) seen = [];
    if (seen.indexOf(kpIdx) < 0) {
      seen.push(kpIdx);
      localStorage.setItem(key, JSON.stringify(seen));
      localStorage.setItem('la_ch_'+chapterNum+'_done', String(seen.length));
    }
  }
  // 检查徽章
  if (getLAChapterDone(chapter) >= chapter.kps.length) {
    checkLABadge(chapterNum);
  }
}

/* ── 钩子：章节进入时标完成 ── */
(function(){
  var origOpenViz = window.openVizView;
  if (origOpenViz) {
    window.openVizView = function(chNum, kpIdx) {
      var ch = state.currentChapter;
      if (ch && ch.courseId === 'la') {
        markKPComplete(chNum, kpIdx);
      }
      origOpenViz(chNum, kpIdx);
    };
  }

  // 仪表盘 + 徽章挂载：在 renderChaptersView 之后
  var origRenderCh = window.renderChaptersView;
  if (origRenderCh) {
    window.renderChaptersView = function() {
      origRenderCh();
      setTimeout(function(){
        var el = document.getElementById('chapters-view');
        if (!el || !state.currentCourse || state.currentCourse.id !== 'la') return;
        // 添加徽章墙
        var badgeWall = document.getElementById('la-badge-wall');
        if (!badgeWall) {
          badgeWall = document.createElement('div');
          badgeWall.id = 'la-badge-wall';
          badgeWall.innerHTML = renderLABadgeWall();
          el.appendChild(badgeWall);
        }
        // 添加仪表盘
        var dash = document.getElementById('la-dashboard');
        if (!dash) {
          dash = document.createElement('div');
          dash.id = 'la-dashboard';
          dash.innerHTML = renderLADashboard();
          var insertBefore = el.querySelector('.chapters-volume');
          if (insertBefore) insertBefore.parentNode.insertBefore(dash, insertBefore);
          else el.insertBefore(dash, el.firstChild);
        }
      }, 200);
    };
  }
})();
