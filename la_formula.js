/* ═══════════════════════════════════════════
   强制用 katex.render 渲染公式
   ═══════════════════════════════════════════ */
(function() {
  function forceRenderFormulas() {
    if (typeof katex === 'undefined') return false;
    var hls = document.querySelectorAll('.viz-formula .hl');
    for (var i = 0; i < hls.length; i++) {
      var el = hls[i];
      if (el.querySelector('.katex')) continue;
      var txt = (el.textContent || '').trim();
      var latex = null, display = false;
      if (txt.length >= 4 && txt.charAt(0) === '$' && txt.charAt(1) === '$' && txt.slice(-2) === '$$') {
        latex = txt.slice(2, -2);
        display = true;
      } else if (txt.length >= 2 && txt.charAt(0) === '$' && txt.slice(-1) === '$') {
        latex = txt.slice(1, -1);
        display = false;
      }
      if (latex === null) continue;
      try {
        katex.render(latex, el, { throwOnError: false, displayMode: display });
      } catch (e) {
        el.innerHTML = '<span style="color:#ef4444;font-size:12px">[公式错误: ' + (e.message||e) + ']</span>';
      }
    }
  }
  setInterval(forceRenderFormulas, 600);
  var orig = window.renderVizView;
  if (orig) {
    window.renderVizView = function(ch, kp) {
      orig(ch, kp);
      setTimeout(forceRenderFormulas, 150);
    };
  }
})();
