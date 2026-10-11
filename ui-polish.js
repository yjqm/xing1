/* UI polish runtime: presentation and accessibility only. */
(function () {
  'use strict';

  var raf = 0;

  function currentCourseId() {
    try {
      return typeof state !== 'undefined' && state.currentCourse ? state.currentCourse.id : '';
    } catch (e) {
      return '';
    }
  }

  function closeMobileMenu() {
    if (window.innerWidth > 768) return;
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('mobileOverlay');
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (overlay) overlay.classList.remove('active');
  }

  function makeCardsKeyboardFriendly() {
    document.querySelectorAll('.course-select-card:not([data-polish-a11y]), .chapter-card:not([data-polish-a11y]), .kp-card:not([data-polish-a11y])').forEach(function (card) {
      card.dataset.polishA11y = '1';
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          card.click();
        }
      });
    });
  }

  function decorateVisualization() {
    var panel = document.querySelector('#viz-view.active .viz-panel, #viz-view .viz-panel');
    if (!panel) return;

    var cid = currentCourseId();
    if (cid) panel.dataset.course = cid;

    var collapsible = panel.querySelector('#vizCollapsible');
    if (collapsible) {
      collapsible.classList.remove('collapsed');
      var header = collapsible.querySelector('.viz-collapse-header');
      if (header && !header.querySelector('.viz-live-badge')) {
        var badge = document.createElement('span');
        badge.className = 'viz-live-badge';
        badge.textContent = 'LIVE · 可交互';
        var arrow = header.querySelector('.viz-collapse-arrow');
        header.insertBefore(badge, arrow || null);
      }
    }

    var canvasWrap = panel.querySelector('.viz-canvas-wrap');
    if (canvasWrap && !canvasWrap.querySelector('.viz-canvas-glow')) {
      var glow = document.createElement('span');
      glow.className = 'viz-canvas-glow';
      glow.setAttribute('aria-hidden', 'true');
      canvasWrap.appendChild(glow);
    }
  }

  function syncCourseTheme() {
    var cid = currentCourseId();
    if (cid) document.body.dataset.course = cid;
    else delete document.body.dataset.course;
  }

  function enhance() {
    raf = 0;
    syncCourseTheme();
    makeCardsKeyboardFriendly();
    decorateVisualization();
  }

  function scheduleEnhance() {
    if (raf) return;
    raf = requestAnimationFrame(enhance);
  }

  document.addEventListener('click', function (event) {
    if (event.target.closest('.nav-item')) closeMobileMenu();
    scheduleEnhance();
  }, true);

  document.addEventListener('DOMContentLoaded', function () {
    var root = document.querySelector('.main-content') || document.body;
    var observer = new MutationObserver(scheduleEnhance);
    observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    window.addEventListener('resize', scheduleEnhance, { passive: true });
    scheduleEnhance();
  });
})();
