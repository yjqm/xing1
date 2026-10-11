(function () {
  'use strict';

  const COURSE_SPECS = {
    clang: {
      primary: '#38bdf8', secondary: '#22d3ee', name: 'C',
      kinds: ['terminal','types','operator','flow','call','array','pointer','record','file','memory'],
      marks: ['>_','int','a+b','if','f()','a[i]','*p','struct','FILE','malloc']
    },
    cpp: {
      primary: '#a78bfa', secondary: '#f472b6', name: 'C++',
      kinds: ['terminal','objects','operator','inherit','polymorph','template','containers','exception','smartptr','stream','threads','pattern'],
      marks: ['::','class','operator','public','virtual','<T>','STL','try/catch','unique_ptr','<< >>','thread','pattern']
    },
    ds: {
      primary: '#34d399', secondary: '#fbbf24', name: 'DS',
      kinds: ['complexity','list','stackqueue','string','matrix','tree','graph','memory','search','sort','merge','filetree'],
      marks: ['O(n)','list','LIFO / FIFO','string','A[i][j]','tree','graph','heap','search','sort','merge','file']
    },
    prob: {
      primary: '#f472b6', secondary: '#67e8f9', name: 'P',
      kinds: ['dice','distribution','joint','expectation','clt','samples','estimate','hypothesis','regression'],
      marks: ['P(A)','F(x)','f(x,y)','E(X)','N(0,1)','sample','θ̂','H₀ / H₁','ŷ=a+bx']
    },
    python: {
      primary: '#60a5fa', secondary: '#facc15', name: 'PY',
      kinds: ['terminal','types','flow','array','dictset','call','modules','exception','objects','project'],
      marks: ['>>>','type()','if / for','list','dict / set','def','import','try / except','class','run.py']
    },
    la: {
      primary: '#2dd4bf', secondary: '#a78bfa', name: 'LA',
      kinds: ['determinant','matrix','rowops','vectors','eigen','transform'],
      marks: ['det(A)','A · B','R₂−kR₁','span(V)','Aξ=λξ','T: V→W']
    }
  };

  function setupCourseChapterCover(canvas, ctx, w, h, chapter) {
    const spec = COURSE_SPECS[chapter.courseId];
    if (!spec) return false;

    const card = canvas.closest('.chapter-card');
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const kind = spec.kinds[chapter.num - 1] || 'nodes';
    const mark = spec.marks[chapter.num - 1] || spec.name;
    const primary = spec.primary;
    const secondary = spec.secondary;
    const left = 28, right = w - 24, top = 27, bottom = h - 21;
    const span = right - left, height = bottom - top;
    const cx = w / 2, cy = h * .57;

    function rgba(hex, alpha) {
      const value = hex.replace('#', '');
      const n = parseInt(value.length === 3 ? value.split('').map(x => x + x).join('') : value, 16);
      return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
    }

    function path(points, color, width, dash) {
      if (!points || !points.length) return;
      ctx.save();
      ctx.strokeStyle = color || primary;
      ctx.lineWidth = width || 1.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash(dash || []);
      ctx.beginPath();
      points.forEach((point, i) => i ? ctx.lineTo(point[0], point[1]) : ctx.moveTo(point[0], point[1]));
      ctx.stroke();
      ctx.restore();
    }

    function sample(fn, count) {
      const points = [];
      const total = count || 64;
      for (let i = 0; i <= total; i++) {
        const u = i / total;
        points.push([left + span * u, fn(u)]);
      }
      return points;
    }

    function dot(x, y, radius, color) {
      ctx.fillStyle = color || secondary;
      ctx.beginPath(); ctx.arc(x, y, radius || 3, 0, Math.PI * 2); ctx.fill();
    }

    function box(x, y, width, boxHeight, color, fill) {
      ctx.save();
      ctx.strokeStyle = color || rgba(primary, .42);
      ctx.fillStyle = fill || rgba(primary, .065);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, width, boxHeight, 4);
      else ctx.rect(x, y, width, boxHeight);
      ctx.fill(); ctx.stroke(); ctx.restore();
    }

    function label(text, x, y, color, size, align) {
      ctx.save();
      ctx.font = `600 ${size || 11}px Inter, Consolas, "Microsoft YaHei", sans-serif`;
      ctx.textAlign = align || 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color || rgba(primary, .78);
      ctx.fillText(text, x, y);
      ctx.restore();
    }

    function arrow(x1, y1, x2, y2, color, width) {
      const angle = Math.atan2(y2 - y1, x2 - x1);
      path([[x1, y1], [x2, y2]], color || rgba(secondary, .72), width || 1.6);
      path([
        [x2 - Math.cos(angle - .55) * 7, y2 - Math.sin(angle - .55) * 7],
        [x2, y2],
        [x2 - Math.cos(angle + .55) * 7, y2 - Math.sin(angle + .55) * 7]
      ], color || rgba(secondary, .72), width || 1.6);
    }

    function node(x, y, text, active, radius) {
      const r = radius || 10;
      ctx.fillStyle = active ? rgba(secondary, .18) : rgba(primary, .085);
      ctx.strokeStyle = active ? rgba(secondary, .82) : rgba(primary, .42);
      ctx.lineWidth = active ? 1.8 : 1.2;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (text) label(text, x, y, active ? secondary : rgba(primary, .82), 9);
    }

    function commonBackground() {
      ctx.clearRect(0, 0, w, h);
      const gradient = ctx.createLinearGradient(0, 0, w, h);
      gradient.addColorStop(0, '#0f1420');
      gradient.addColorStop(.62, '#111522');
      gradient.addColorStop(1, '#171421');
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h);

      if (chapter.courseId === 'ds') {
        for (let x = 17; x < w; x += 21) for (let y = 17; y < h; y += 21) dot(x, y, 1, rgba(primary, .08));
      } else if (chapter.courseId === 'clang' || chapter.courseId === 'cpp' || chapter.courseId === 'python') {
        ctx.strokeStyle = rgba(primary, .055); ctx.lineWidth = 1;
        for (let x = 18; x < w; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
        for (let y = 18; y < h; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      } else {
        ctx.strokeStyle = rgba(primary, .06); ctx.lineWidth = 1;
        for (let x = 18; x < w; x += 28) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
        for (let y = 18; y < h; y += 28) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      }

      const halo = ctx.createRadialGradient(w * .55, h * .48, 0, w * .55, h * .48, w * .5);
      halo.addColorStop(0, rgba(secondary, .07));
      halo.addColorStop(1, rgba(secondary, 0));
      ctx.fillStyle = halo; ctx.fillRect(0, 0, w, h);
    }

    function markChapter() {
      label(mark, w - 17, h - 14, rgba(primary, .54), 12, 'right');
    }

    function draw(seconds, moving) {
      commonBackground();
      const t = moving ? seconds : .72;
      const pulse = .5 + .5 * Math.sin(t * 2.4);
      const sweep = moving ? (t * .23) % 1 : .62;
      let i, x, y, u;

      if (kind === 'terminal') {
        box(left, top + 5, span, height - 5, rgba(primary, .38), 'rgba(4,9,16,.54)');
        dot(left + 11, top + 15, 2.5, rgba('#fb7185', .75));
        dot(left + 20, top + 15, 2.5, rgba('#facc15', .75));
        dot(left + 29, top + 15, 2.5, rgba('#4ade80', .75));
        [0,1,2].forEach(row => path([[left + 14, top + 34 + row * 15], [left + 60 + row * 24, top + 34 + row * 15]], rgba(primary, .28 + row * .11), row === 1 ? 2 : 1.2));
        label(chapter.courseId === 'python' ? '>>> run()' : chapter.courseId === 'cpp' ? 'std::cout' : 'int main()', left + 16, bottom - 12, rgba(secondary, .75), 10, 'left');
        if (pulse > .45) ctx.fillStyle = secondary, ctx.fillRect(left + 91, bottom - 17, 7, 11);

      } else if (kind === 'types') {
        const names = chapter.courseId === 'python' ? ['int','str','list','bool'] : ['char','int','float','double'];
        names.forEach((name, index) => {
          const bw = 38 + index * 9, bx = left + index * (span - 48) / 3;
          box(bx, cy - 18, bw, 36, index === Math.floor(sweep * 4) ? rgba(secondary, .75) : rgba(primary, .34));
          label(name, bx + bw / 2, cy, index === Math.floor(sweep * 4) ? secondary : rgba(primary, .75), 9);
        });
        path([[left, bottom - 4], [right, bottom - 4]], rgba(primary, .18), 1);

      } else if (kind === 'operator') {
        node(left + 35, cy, 'a', false, 12); node(right - 35, cy, 'b', false, 12);
        box(cx - 17, cy - 17, 34, 34, rgba(secondary, .75), rgba(secondary, .10));
        label(chapter.courseId === 'cpp' ? 'op' : '+', cx, cy, secondary, 12);
        arrow(left + 49, cy, cx - 20, cy, rgba(primary, .58));
        arrow(right - 49, cy, cx + 20, cy, rgba(primary, .58));
        dot(cx, top + 9 + pulse * 5, 3.8, secondary);

      } else if (kind === 'flow') {
        box(left + 6, cy - 13, 43, 26); label('start', left + 27, cy, rgba(primary, .72), 9);
        const dx = cx, dy = cy;
        ctx.save(); ctx.translate(dx, dy); ctx.rotate(Math.PI / 4); box(-16, -16, 32, 32, rgba(secondary, .66), rgba(secondary, .08)); ctx.restore();
        label('?', dx, dy, secondary, 11);
        box(right - 49, cy - 13, 43, 26); label('end', right - 27, cy, rgba(primary, .72), 9);
        arrow(left + 51, cy, cx - 24, cy); arrow(cx + 24, cy, right - 51, cy);
        dot(left + 50 + (right - left - 100) * sweep, cy, 3.2, secondary);

      } else if (kind === 'call') {
        ['main()','solve()','calc()'].forEach((name, index) => {
          const active = index === Math.floor(sweep * 3);
          box(cx - 66 + index * 9, bottom - 31 - index * 25, 132 - index * 18, 21, active ? rgba(secondary, .75) : rgba(primary, .32), active ? rgba(secondary, .1) : rgba(primary, .05));
          label(name, cx, bottom - 20 - index * 25, active ? secondary : rgba(primary, .68), 9);
        });

      } else if (kind === 'array' || kind === 'string') {
        const chars = kind === 'string' ? ['D','A','T','A','S','E','T'] : ['0','1','2','3','4','5','6','7'];
        const count = chars.length, cellW = Math.min(31, span / count);
        const startX = cx - cellW * count / 2;
        chars.forEach((value, index) => {
          const active = index === Math.floor(sweep * count);
          box(startX + index * cellW, cy - 17, cellW - 2, 34, active ? rgba(secondary, .78) : rgba(primary, .3), active ? rgba(secondary, .13) : rgba(primary, .05));
          label(value, startX + index * cellW + (cellW - 2) / 2, cy, active ? secondary : rgba(primary, .72), 9);
        });
        if (kind === 'string') path([[startX + cellW, cy + 25], [startX + cellW * 5, cy + 25]], rgba(secondary, .58), 2);

      } else if (kind === 'pointer') {
        const cellW = Math.min(38, span / 6);
        for (i = 0; i < 6; i++) box(left + 8 + i * cellW, cy - 14, cellW - 4, 28, i === 4 ? rgba(secondary, .76) : rgba(primary, .28));
        label('p', left + 23, top + 10, secondary, 11);
        arrow(left + 29, top + 18, left + 8 + 4 * cellW + cellW / 2, cy - 19, rgba(secondary, .78), 2);
        dot(left + 8 + 4 * cellW + cellW / 2, cy, 3.2 + pulse, secondary);

      } else if (kind === 'record') {
        box(cx - 82, top + 8, 164, height - 13, rgba(primary, .42));
        ['id : int','name : char[]','score : float'].forEach((name, index) => {
          path([[cx - 70, top + 34 + index * 23], [cx + 70, top + 34 + index * 23]], rgba(primary, .15), 1);
          label(name, cx - 63, top + 23 + index * 23, index === Math.floor(sweep * 3) ? secondary : rgba(primary, .7), 9, 'left');
        });

      } else if (kind === 'file' || kind === 'filetree') {
        if (kind === 'filetree') {
          node(cx, top + 8, '/', true, 11);
          [[cx - 58, cy - 2, 'A'], [cx + 58, cy - 2, 'B']].forEach(n => { path([[cx, top + 19], [n[0], n[1] - 11]], rgba(primary, .38)); node(n[0], n[1], n[2], false, 11); });
          [[left + 28, bottom - 4], [cx - 24, bottom - 4], [cx + 24, bottom - 4], [right - 28, bottom - 4]].forEach((n, index) => {
            path([[index < 2 ? cx - 58 : cx + 58, cy + 9], [n[0], n[1] - 8]], rgba(primary, .28)); box(n[0] - 13, n[1] - 8, 26, 16, index === Math.floor(sweep * 4) ? rgba(secondary, .7) : rgba(primary, .28));
          });
        } else {
          box(cx - 58, top + 4, 116, height - 5, rgba(primary, .42), rgba(primary, .05));
          [0,1,2,3].forEach(row => path([[cx - 42, top + 24 + row * 16], [cx + 19 + row * 7, top + 24 + row * 16]], row === Math.floor(sweep * 4) ? rgba(secondary, .78) : rgba(primary, .25), row === Math.floor(sweep * 4) ? 2 : 1.2));
          arrow(cx + 72, top + 18, cx + 72, bottom - 8, rgba(secondary, .48));
        }

      } else if (kind === 'memory') {
        const cols = 8, rows = 3, bw = span / cols, bh = height / rows;
        for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
          const active = (col + row * cols) === Math.floor(sweep * cols * rows);
          box(left + col * bw, top + row * bh, bw - 3, bh - 3, active ? rgba(secondary, .75) : rgba(primary, .24), active ? rgba(secondary, .15) : rgba(primary, ((row + col) % 3 === 0) ? .08 : .025));
        }

      } else if (kind === 'objects') {
        [left + 43, cx, right - 43].forEach((nx, index) => {
          const active = index === Math.floor(sweep * 3);
          box(nx - 29, cy - 27, 58, 54, active ? rgba(secondary, .72) : rgba(primary, .34), active ? rgba(secondary, .1) : rgba(primary, .045));
          label(['obj A','obj B','obj C'][index], nx, cy - 10, active ? secondary : rgba(primary, .72), 9);
          path([[nx - 18, cy + 2], [nx + 18, cy + 2]], rgba(primary, .18));
          label('method()', nx, cy + 13, rgba(primary, .54), 7.5);
        });

      } else if (kind === 'inherit') {
        node(cx, top + 9, 'Base', true, 18);
        [left + 45, cx, right - 45].forEach((nx, index) => { path([[cx, top + 27], [nx, bottom - 24]], rgba(primary, .38)); node(nx, bottom - 12, ['A','B','C'][index], index === Math.floor(sweep * 3), 13); });

      } else if (kind === 'polymorph') {
        box(left + 4, cy - 15, 58, 30, rgba(primary, .4)); label('draw()', left + 33, cy, rgba(primary, .75), 9);
        [cx + 9, right - 26].forEach((nx, index) => { arrow(left + 65, cy, nx - 15, cy + (index ? 22 : -22)); node(nx, cy + (index ? 25 : -25), index ? '□' : '○', index === Math.floor(sweep * 2), 14); });

      } else if (kind === 'template') {
        box(cx - 28, cy - 18, 56, 36, rgba(secondary, .7), rgba(secondary, .09)); label('<T>', cx, cy, secondary, 12);
        ['int','float','string'].forEach((name, index) => { const ny = top + 10 + index * 30; arrow(left + 36, ny, cx - 34, cy + (index - 1) * 8, rgba(primary, .42)); label(name, left + 27, ny, index === Math.floor(sweep * 3) ? secondary : rgba(primary, .62), 8); });
        arrow(cx + 34, cy, right - 23, cy, rgba(secondary, .66));

      } else if (kind === 'containers') {
        const names = ['vector','map','set'];
        names.forEach((name, row) => {
          label(name, left + 22, top + 14 + row * 27, row === Math.floor(sweep * 3) ? secondary : rgba(primary, .62), 8, 'left');
          for (i = 0; i < 5; i++) box(left + 78 + i * 27, top + 3 + row * 27, 23, 20, (row === Math.floor(sweep * 3) && i === Math.floor(pulse * 4)) ? rgba(secondary, .75) : rgba(primary, .22));
        });

      } else if (kind === 'exception') {
        box(left + 7, cy - 18, 55, 36, rgba(primary, .42)); label('try', left + 34, cy, rgba(primary, .78), 10);
        box(right - 62, cy - 18, 55, 36, rgba(secondary, .6)); label('catch', right - 34, cy, secondary, 10);
        arrow(left + 66, cy, right - 66, cy, rgba(primary, .5));
        const ex = left + 70 + (span - 140) * sweep;
        dot(ex, cy, 4.2, secondary);
        path([[cx - 16, top + 7], [cx, top + 20], [cx + 16, top + 7]], rgba('#fb7185', .62), 1.6);

      } else if (kind === 'smartptr') {
        node(cx, cy, 'obj', true, 22);
        for (i = 0; i < 3; i++) {
          const angle = t * .55 + i * Math.PI * 2 / 3;
          x = cx + Math.cos(angle) * 72; y = cy + Math.sin(angle) * 34;
          node(x, y, `p${i + 1}`, false, 11); arrow(x, y, cx + Math.cos(angle) * 25, cy + Math.sin(angle) * 12, rgba(primary, .4), 1);
        }
        label('use_count', cx, bottom - 3, rgba(primary, .5), 8);

      } else if (kind === 'stream') {
        box(left + 5, cy - 20, 48, 40, rgba(primary, .36)); label('data', left + 29, cy, rgba(primary, .72), 9);
        box(right - 53, cy - 24, 48, 48, rgba(secondary, .52)); label('file', right - 29, cy, secondary, 9);
        for (i = 0; i < 4; i++) {
          x = left + 72 + i * (span - 136) / 3;
          label('»', x, cy, i === Math.floor(sweep * 4) ? secondary : rgba(primary, .32), 17);
        }

      } else if (kind === 'threads') {
        for (i = 0; i < 4; i++) {
          y = top + 12 + i * 25;
          path([[left, y], [right, y]], rgba(primary, .22), 1.4);
          dot(left + span * ((sweep + i * .19) % 1), y, 3.6, i % 2 ? secondary : primary);
        }
        path([[cx, top + 2], [cx, bottom]], rgba(secondary, .35), 1, [3,3]);

      } else if (kind === 'pattern') {
        node(cx, cy, 'core', true, 18);
        for (i = 0; i < 6; i++) {
          const angle = i * Math.PI / 3;
          x = cx + Math.cos(angle) * 76; y = cy + Math.sin(angle) * 43;
          path([[cx, cy], [x, y]], rgba(primary, .24)); node(x, y, String(i + 1), i === Math.floor(sweep * 6), 10);
        }

      } else if (kind === 'complexity') {
        path([[left, bottom], [left, top], [left, bottom], [right, bottom]], rgba(primary, .34), 1.2);
        path(sample(v => bottom - height * .67 * v), rgba(primary, .5), 1.6);
        path(sample(v => bottom - height * .45 * Math.log2(1 + 7 * v) / 3), rgba(secondary, .7), 1.8);
        dot(left + span * sweep, bottom - height * .67 * sweep, 3.7, secondary);

      } else if (kind === 'list') {
        const count = 5, gap = span / count;
        for (i = 0; i < count; i++) {
          x = left + gap * i + gap / 2;
          box(x - 18, cy - 16, 36, 32, i === Math.floor(sweep * count) ? rgba(secondary, .7) : rgba(primary, .32));
          label(String.fromCharCode(65 + i), x - 5, cy, rgba(primary, .72), 9);
          path([[x + 5, cy - 15], [x + 5, cy + 15]], rgba(primary, .18));
          if (i < count - 1) arrow(x + 19, cy, x + gap - 20, cy, rgba(primary, .44), 1.2);
        }

      } else if (kind === 'stackqueue') {
        for (i = 0; i < 4; i++) box(left + 13, bottom - 18 - i * 20, 58, 17, i === Math.floor(sweep * 4) ? rgba(secondary, .65) : rgba(primary, .26));
        label('STACK', left + 42, top + 4, rgba(primary, .55), 8);
        for (i = 0; i < 4; i++) box(cx + 6 + i * 38, cy - 10, 32, 20, i === Math.floor(sweep * 4) ? rgba(secondary, .65) : rgba(primary, .26));
        arrow(cx - 16, cy, cx + 2, cy, rgba(primary, .42)); arrow(right - 4, cy, right + 8, cy, rgba(primary, .42));
        label('QUEUE', cx + 68, top + 4, rgba(primary, .55), 8);

      } else if (kind === 'matrix') {
        const cols = 7, rows = 4, bw = span / cols, bh = height / rows;
        for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
          const wave = Math.abs(col / cols - sweep) < .14;
          box(left + col * bw, top + row * bh, bw - 3, bh - 3, wave ? rgba(secondary, .68) : rgba(primary, .22), wave ? rgba(secondary, .12) : rgba(primary, .03));
        }

      } else if (kind === 'tree') {
        const levels = [[cx, top + 6], [cx - 58, cy - 13], [cx + 58, cy - 13], [left + 22, bottom - 5], [left + 86, bottom - 5], [right - 86, bottom - 5], [right - 22, bottom - 5]];
        [[0,1],[0,2],[1,3],[1,4],[2,5],[2,6]].forEach(e => path([[levels[e[0]][0], levels[e[0]][1]], [levels[e[1]][0], levels[e[1]][1]]], rgba(primary, .32), 1.2));
        levels.forEach((n, index) => node(n[0], n[1], String(index + 1), index === Math.floor(sweep * levels.length), 10));

      } else if (kind === 'graph') {
        const points = [[left + 14,cy],[left + 68,top + 9],[cx,cy - 3],[right - 66,top + 15],[right - 13,cy + 14],[cx - 48,bottom - 4],[cx + 54,bottom - 2]];
        [[0,1],[0,5],[1,2],[2,3],[2,5],[2,6],[3,4],[4,6],[5,6]].forEach(e => path([[points[e[0]][0], points[e[0]][1]], [points[e[1]][0], points[e[1]][1]]], rgba(primary, .25), 1.1));
        points.forEach((p, index) => node(p[0], p[1], '', index === Math.floor(sweep * points.length), 7));

      } else if (kind === 'search') {
        const values = [2,6,11,17,23,31,45,52], cellW = span / values.length;
        const active = Math.min(values.length - 1, Math.floor(sweep * values.length));
        values.forEach((value, index) => { box(left + index * cellW, cy - 16, cellW - 2, 32, index === active ? rgba(secondary, .75) : rgba(primary, .27)); label(value, left + index * cellW + (cellW - 2) / 2, cy, index === active ? secondary : rgba(primary, .68), 8); });
        arrow(left + active * cellW + cellW / 2, top + 3, left + active * cellW + cellW / 2, cy - 20, rgba(secondary, .7));

      } else if (kind === 'sort') {
        const values = [6,2,8,4,7,3,9,5,1], bw = span / values.length;
        const active = Math.floor(sweep * values.length);
        values.forEach((value, index) => {
          const bh = 8 + value * 7;
          ctx.fillStyle = index === active || index === active + 1 ? rgba(secondary, .52) : rgba(primary, .18);
          ctx.fillRect(left + index * bw + 3, bottom - bh, bw - 6, bh);
        });

      } else if (kind === 'merge') {
        const upper = [2,8,15,27], lower = [4,7,19,30];
        [upper, lower].forEach((arr, row) => arr.forEach((value, index) => { const bx = left + index * 36; box(bx, top + 4 + row * 31, 31, 24, rgba(primary, .3)); label(value, bx + 15, top + 16 + row * 31, rgba(primary, .68), 8); }));
        arrow(cx - 15, cy + 4, cx + 12, bottom - 8, rgba(secondary, .6));
        for (i = 0; i < 8; i++) { x = cx + 32 + i * 19; dot(x, bottom - 8, i === Math.floor(sweep * 8) ? 4 : 2.4, i === Math.floor(sweep * 8) ? secondary : rgba(primary, .58)); }

      } else if (kind === 'dice') {
        [cx - 43, cx + 43].forEach((dx, dieIndex) => {
          box(dx - 25, cy - 25, 50, 50, dieIndex === Math.floor(sweep * 2) ? rgba(secondary, .7) : rgba(primary, .38));
          const dots = dieIndex ? [[-10,-10],[10,-10],[0,0],[-10,10],[10,10]] : [[-10,-10],[10,10]];
          dots.forEach(p => dot(dx + p[0], cy + p[1], 3.2, dieIndex === Math.floor(sweep * 2) ? secondary : primary));
        });

      } else if (kind === 'distribution') {
        path([[left,bottom],[right,bottom]], rgba(primary,.25));
        const bell = u => bottom - 67 * Math.exp(-Math.pow((u - .5) / .2, 2) / 2);
        strokeFill(sample(bell), bottom, rgba(primary,.7), rgba(primary,.08));
        x = left + span * sweep; dot(x, bell(sweep), 4, secondary);

      } else if (kind === 'joint') {
        const cols = 8, rows = 5, bw = span / cols, bh = height / rows;
        for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
          const dx = (col - 4) / 2.6, dy = (row - 2) / 1.7;
          const density = Math.exp(-(dx * dx + dy * dy) / 2);
          ctx.fillStyle = rgba(col === Math.floor(sweep * cols) ? secondary : primary, .025 + density * .25);
          ctx.fillRect(left + col * bw + 1, top + row * bh + 1, bw - 3, bh - 3);
        }

      } else if (kind === 'expectation') {
        const values = [1,3,6,8,6,3,1], bw = span / values.length;
        values.forEach((value,index) => { const bh = value * 7; ctx.fillStyle = rgba(primary, .14 + value * .025); ctx.fillRect(left + index * bw + 4, bottom - bh, bw - 8, bh); });
        const meanX = left + span * .51;
        path([[meanX, top], [meanX,bottom]], rgba(secondary,.72), 1.6, [4,3]); dot(meanX, top + 5 + pulse * 4, 3.5, secondary);

      } else if (kind === 'clt') {
        const bell = u => bottom - 60 * Math.exp(-Math.pow((u - .5) / .19, 2) / 2);
        path(sample(bell), rgba(primary,.56), 1.7);
        for (i = 0; i < 26; i++) {
          const iu = ((i * 37) % 101) / 100;
          const pulled = .5 + (iu - .5) * (moving ? (.85 - .35 * pulse) : .66);
          dot(left + span * pulled, bottom - 5 - (i % 5) * 5, 1.8, rgba(i % 4 ? primary : secondary, .55));
        }

      } else if (kind === 'samples') {
        for (i = 0; i < 30; i++) { const px = left + ((i * 47) % 101) / 100 * span, py = top + ((i * 31) % 89) / 89 * height; dot(px, py, i % 7 === Math.floor(sweep * 7) ? 3.3 : 1.8, i % 7 === Math.floor(sweep * 7) ? secondary : rgba(primary,.35)); }
        box(cx - 37, cy - 25, 74, 50, rgba(secondary,.42), 'rgba(0,0,0,0)');

      } else if (kind === 'estimate') {
        path([[left + 18,cy],[right - 18,cy]], rgba(primary,.4), 1.8);
        const margin = 25 + pulse * 22;
        path([[cx - margin,cy - 13],[cx - margin,cy + 13]], rgba(secondary,.75), 2);
        path([[cx + margin,cy - 13],[cx + margin,cy + 13]], rgba(secondary,.75), 2);
        path([[cx - margin,cy],[cx + margin,cy]], rgba(secondary,.65), 3);
        dot(cx, cy, 4, secondary);

      } else if (kind === 'hypothesis') {
        const leftBell = sample(v => bottom - 50 * Math.exp(-Math.pow((v - .38) / .16, 2) / 2));
        const rightBell = sample(v => bottom - 50 * Math.exp(-Math.pow((v - .62) / .16, 2) / 2));
        path(leftBell, rgba(primary,.55), 1.7); path(rightBell, rgba(secondary,.58), 1.7);
        x = left + span * (.73 + .04 * Math.sin(t)); path([[x,top],[x,bottom]], rgba('#fb7185',.65), 1.4, [4,3]);

      } else if (kind === 'regression') {
        for (i = 0; i < 15; i++) { u = i / 14; x = left + span * u; y = bottom - height * (.18 + .62 * u) + Math.sin(i * 2.7) * 10; dot(x,y,2.5,rgba(primary,.55)); }
        path([[left,bottom - height * .2],[right,bottom - height * .82]], rgba(secondary,.78), 2);
        dot(left + span * sweep, bottom - height * (.2 + .62 * sweep), 4, secondary);

      } else if (kind === 'dictset') {
        [['id','07'],['name','AI'],['score','92']].forEach((pair,index) => { const yy = top + 10 + index * 29; box(left + 4, yy, 54, 23, rgba(primary,.3)); box(left + 61, yy, 54, 23, index === Math.floor(sweep * 3) ? rgba(secondary,.7) : rgba(primary,.3)); label(pair[0],left + 31,yy + 12,rgba(primary,.62),8); label(pair[1],left + 88,yy + 12,index === Math.floor(sweep * 3) ? secondary : rgba(primary,.62),8); });
        [0,1,2,3].forEach(index => node(cx + 60 + Math.cos(index * Math.PI / 2) * 38, cy + Math.sin(index * Math.PI / 2) * 29, String(index + 1), index === Math.floor(sweep * 4), 10));

      } else if (kind === 'modules') {
        const modules = [[cx,top + 7,'app'],[left + 43,cy + 11,'math'],[cx,cy + 11,'utils'],[right - 43,cy + 11,'io']];
        modules.slice(1).forEach(m => arrow(cx,top + 20,m[0],m[1] - 15,rgba(primary,.4)));
        modules.forEach((m,index) => { box(m[0] - 25,m[1] - 12,50,24,index === Math.floor(sweep * modules.length) ? rgba(secondary,.7) : rgba(primary,.32)); label(m[2],m[0],m[1],index === Math.floor(sweep * modules.length) ? secondary : rgba(primary,.68),8); });

      } else if (kind === 'project') {
        const stages = [['input',left + 24],['logic',cx],['output',right - 24]];
        stages.forEach((stage,index) => { node(stage[1],cy,stage[0],index === Math.floor(sweep * 3),18); if(index < 2) arrow(stage[1] + 21,cy,stages[index + 1][1] - 21,cy,rgba(primary,.42)); });
        path([[left + 24,cy + 23],[cx, bottom - 2],[right - 24,cy + 23]], rgba(secondary,.24), 1,[4,4]);

      } else if (kind === 'determinant') {
        const values = [['a','b','c'],['d','e','f'],['g','h','i']];
        path([[cx - 58,top + 4],[cx - 58,bottom]],rgba(primary,.62),2); path([[cx + 58,top + 4],[cx + 58,bottom]],rgba(primary,.62),2);
        values.forEach((row,ri) => row.forEach((value,ci) => label(value,cx - 35 + ci * 35,top + 18 + ri * 28,(ri + ci) % 3 === Math.floor(sweep * 3) ? secondary : rgba(primary,.72),10)));
        path([[cx - 35,top + 18],[cx + 35,bottom - 15]],rgba(secondary,.38),1.4);

      } else if (kind === 'rowops') {
        [-1,1].forEach((side,si) => { const ox = cx + side * 67; for (let row=0;row<3;row++) for(let col=0;col<3;col++){ box(ox - 31 + col * 22,cy - 30 + row * 22,18,18,(si === 1 && row === Math.floor(sweep * 3)) ? rgba(secondary,.66) : rgba(primary,.23)); } });
        arrow(cx - 18,cy,cx + 18,cy,rgba(secondary,.62));

      } else if (kind === 'vectors') {
        const ox = cx - 12, oy = bottom - 8;
        path([[left,oy],[right,oy]],rgba(primary,.24)); path([[ox,bottom],[ox,top]],rgba(primary,.24));
        const angles = [-1.25,-.85,-.45];
        angles.forEach((angle,index) => { const a = angle + (index === 1 ? Math.sin(t) * .08 : 0); arrow(ox,oy,ox + Math.cos(a) * (55 + index * 13),oy + Math.sin(a) * (55 + index * 7),index === 1 ? rgba(secondary,.8) : rgba(primary,.58),index === 1 ? 2.2 : 1.5); });

      } else if (kind === 'eigen') {
        for (i = -2; i <= 2; i++) { path([[left,cy + i * 17],[right,cy + i * 11]],rgba(primary,.16)); path([[cx + i * 28,top],[cx + i * 20,bottom]],rgba(primary,.16)); }
        const angle = -.62 + Math.sin(t) * .08;
        arrow(cx,cy,cx + Math.cos(angle) * 82,cy + Math.sin(angle) * 63,rgba(secondary,.82),2.3);
        arrow(cx,cy,cx - Math.cos(angle) * 45,cy - Math.sin(angle) * 34,rgba(primary,.46),1.4);

      } else if (kind === 'transform') {
        const shift = pulse * 13;
        const a = [[left + 28,top + 18],[cx - 18,top + 18],[cx - 18,bottom - 8],[left + 28,bottom - 8],[left + 28,top + 18]];
        const b = [[cx + 23 + shift,top + 18],[right - 13,top + 7],[right - 33,bottom - 8],[cx + 3 + shift,bottom - 1],[cx + 23 + shift,top + 18]];
        path(a,rgba(primary,.58),1.7); path(b,rgba(secondary,.75),1.9); arrow(cx - 8,cy,cx + 13,cy,rgba(primary,.42));
      }

      markChapter();
    }

    function strokeFill(points, baseline, stroke, fill) {
      ctx.save();
      ctx.fillStyle = fill;
      ctx.beginPath(); ctx.moveTo(points[0][0], baseline);
      points.forEach(point => ctx.lineTo(point[0], point[1]));
      ctx.lineTo(points[points.length - 1][0], baseline); ctx.closePath(); ctx.fill();
      ctx.restore();
      path(points, stroke, 1.8);
    }

    draw(0, false);
    if (!card || reduceMotion) return true;

    let animationId = 0;
    let startedAt = 0;
    function stop() {
      if (animationId) cancelAnimationFrame(animationId);
      animationId = 0;
    }
    function play() {
      if (animationId) return;
      startedAt = performance.now();
      function frame(now) {
        if (!canvas.isConnected || !card.matches(':hover, :focus-within')) {
          stop(); draw(0, false); return;
        }
        draw((now - startedAt) / 1000, true);
        animationId = requestAnimationFrame(frame);
      }
      animationId = requestAnimationFrame(frame);
    }

    card.addEventListener('mouseenter', play);
    card.addEventListener('focusin', play);
    card.addEventListener('mouseleave', function () { stop(); draw(0, false); });
    card.addEventListener('focusout', function () { stop(); draw(0, false); });
    return true;
  }

  window.setupCourseChapterCover = setupCourseChapterCover;
})();
