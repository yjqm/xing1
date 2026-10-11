(function () {
  'use strict';

  if (!window.matchMedia || !window.matchMedia('(pointer: fine)').matches) return;

  function initCustomCursor() {
    if (document.getElementById('ic-cursor-pointer') || !document.body) return;

    const pointer = document.createElement('div');
    pointer.id = 'ic-cursor-pointer';
    pointer.setAttribute('aria-hidden', 'true');
    pointer.innerHTML = [
      '<svg viewBox="0 0 25 31" aria-hidden="true">',
      '<defs><linearGradient id="icCursorGradient" x1="2" y1="2" x2="21" y2="28" gradientUnits="userSpaceOnUse">',
      '<stop stop-color="#ffb090"/><stop offset=".45" stop-color="#ff6545"/><stop offset="1" stop-color="#ff3d81"/>',
      '</linearGradient></defs>',
      '<path class="ic-cursor-main" d="M3.1 2.3v22.1l5.75-5.45 4.15 9.15 4.15-1.9-4.08-8.83h8.12L3.1 2.3Z"/>',
      '<path class="ic-cursor-shine" d="M5.45 6.55v12.3l3.2-3.05"/>',
      '</svg>'
    ].join('');

    const ring = document.createElement('div');
    ring.id = 'ic-cursor-ring';
    ring.setAttribute('aria-hidden', 'true');
    document.body.appendChild(ring);
    document.body.appendChild(pointer);
    document.documentElement.classList.add('ic-cursor-ready');

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let pointerX = -80, pointerY = -80;
    let ringX = -80, ringY = -80;
    let visible = false;
    let animationId = 0;

    const interactiveSelector = [
      'a', 'button', '[role="button"]', '[onclick]', 'summary', 'label',
      '.course-select-card', '.chapter-card', '.content-card', '.nav-item', '.btn'
    ].join(',');

    const nativeSelector = [
      'input', 'textarea', 'select', 'option', '[contenteditable="true"]',
      'iframe', '.CodeMirror', '.cm-editor', '.monaco-editor'
    ].join(',');

    function setVisible(nextVisible) {
      if (visible === nextVisible) return;
      visible = nextVisible;
      pointer.classList.toggle('is-visible', visible);
      ring.classList.toggle('is-visible', visible);
    }

    function usesNativeCursor(target) {
      if (!(target instanceof Element)) return false;
      if (target.closest(nativeSelector)) return true;
      const cursor = window.getComputedStyle(target).cursor;
      return /^(text|vertical-text|crosshair|move|grab|grabbing|[nesw]{1,4}-resize|col-resize|row-resize|zoom-in|zoom-out)$/.test(cursor);
    }

    function updateTargetState(target) {
      if (!(target instanceof Element)) return;
      const nativeCursor = usesNativeCursor(target);
      const interactive = !nativeCursor && Boolean(target.closest(interactiveSelector));
      const disabled = interactive && Boolean(target.closest(':disabled, [aria-disabled="true"], .disabled, .locked-card'));

      pointer.classList.toggle('is-hidden', nativeCursor);
      ring.classList.toggle('is-hidden', nativeCursor);
      pointer.classList.toggle('is-hover', interactive && !disabled);
      ring.classList.toggle('is-hover', interactive && !disabled);
      ring.classList.toggle('is-disabled', disabled);
    }

    function paint() {
      if (reducedMotion) {
        ringX = pointerX;
        ringY = pointerY;
      } else {
        ringX += (pointerX - ringX) * .2;
        ringY += (pointerY - ringY) * .2;
      }
      ring.style.setProperty('--ring-x', ringX.toFixed(2) + 'px');
      ring.style.setProperty('--ring-y', ringY.toFixed(2) + 'px');
      animationId = requestAnimationFrame(paint);
    }

    document.addEventListener('pointermove', function (event) {
      if (event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      pointer.style.setProperty('--cursor-x', pointerX + 'px');
      pointer.style.setProperty('--cursor-y', pointerY + 'px');
      updateTargetState(event.target);
      setVisible(true);
    }, { passive: true });

    document.addEventListener('pointerdown', function (event) {
      if (event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
      pointer.classList.add('is-down');
      ring.classList.add('is-down');
    }, { passive: true });

    function release() {
      pointer.classList.remove('is-down');
      ring.classList.remove('is-down');
    }

    document.addEventListener('pointerup', release, { passive: true });
    document.addEventListener('pointercancel', release, { passive: true });
    document.addEventListener('mouseleave', function () { setVisible(false); });
    window.addEventListener('blur', function () { setVisible(false); release(); });

    if (!animationId) animationId = requestAnimationFrame(paint);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initCustomCursor, { once: true });
  else initCustomCursor();
})();
