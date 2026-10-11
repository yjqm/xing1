/* 给所有 la- viz 添加通用 fallback 渲染 */
for (var _k of ['la-permutation','la-n-det','la-det-prop','la-cofactor','la-cramer',
  'la-matrix-concept','la-mat-add','la-mat-mul','la-transpose','la-det-prod',
  'la-inverse','la-block','la-row-op','la-elem-mat','la-solution',
  'la-lincomb','la-depend','la-vec-rank','la-sol-struct','la-vec-space',
  'la-inner','la-similar','la-diag','la-quadform','la-completesq','la-posdef',
  'la-linspace','la-basis','la-basechange','la-lintrans','la-transmat','la-vec-rank']) {
  if (!vizTypes[_k]) {
    vizTypes[_k] = {
      title: (_k.replace('la-','')).replace(/-/g,' '),
      params: [{id:'n', label:'矩阵大小', default:2, min:2, max:4, step:1}],
      render: function(p) {
        var n = p.n || 2;
        var ctx = VizEngine.ctx;
        var W = VizEngine.W, H = VizEngine.H;
        ctx.fillStyle = 'rgba(15,20,30,0.9)';
        ctx.fillRect(0,0,W,H);
        // 标题
        ctx.fillStyle = '#a78bfa';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.title, W/2, 30);
        // 矩阵格子
        var cx = W/2, cy = H/2 + 20;
        var sz = Math.min(W,H)/2 / n;
        ctx.font = '14px monospace';
        ctx.fillStyle = '#cbd5e1';
        for (var i=0;i<n;i++) {
          for (var j=0;j<n;j++) {
            var x = cx - (n*sz)/2 + j*sz;
            var y = cy - (n*sz)/2 + i*sz;
            ctx.strokeStyle = 'rgba(99,102,241,0.4)';
            ctx.strokeRect(x,y,sz,sz);
            // 随机数值
            var v = ((i*7+j*3+1)%9) - 4;
            ctx.fillStyle = (i===j) ? '#fbbf24' : '#cbd5e1';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(v,x+sz/2,y+sz/2);
          }
        }
        // 行列式符号
        ctx.font = '32px serif';
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        var lx = cx - (n*sz)/2 - 10;
        var ly = cy;
        ctx.fillText('|',lx,ly);
        ctx.textAlign = 'left';
        ctx.fillText('|',cx + (n*sz)/2 + 2,ly);
      }
    };
  }
}