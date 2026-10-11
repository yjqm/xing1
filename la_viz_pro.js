/* ═══════════════════════════════════════════════════════════════
   线性代数互动可视化 2.0
   - 覆盖课程 6 章 35 个知识点
   - 统一直接拖拽、触屏、键盘微调与即时数值反馈
   - 只增强 courseId=la，不影响高数、概率论和编程课程
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (typeof VizEngine === 'undefined' || typeof vizTypes === 'undefined') return;

  var C = {
    bg: '#07111f', panel: '#0d1b2e', panel2: '#10243c', grid: 'rgba(148,163,184,.11)',
    axis: 'rgba(203,213,225,.42)', text: '#eaf2ff', muted: '#94a3b8',
    blue: '#60a5fa', green: '#34d399', amber: '#fbbf24', pink: '#f472b6',
    purple: '#a78bfa', red: '#fb7185', cyan: '#22d3ee', white: '#fff'
  };
  var RANGE = { xMin: -6, xMax: 6, yMin: -4.8, yMax: 4.8 };
  var Pro = { handles: [], active: null, focused: 0, last: null };

  function ctx() { return VizEngine.ctx; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function fmt(v, n) {
    if (!isFinite(v)) return '—';
    var z = Math.abs(v) < 1e-8 ? 0 : v;
    return Number.isInteger(z) ? String(z) : z.toFixed(n == null ? 2 : n).replace(/0+$/, '').replace(/\.$/, '');
  }
  function rgba(hex, a) {
    if (hex.indexOf('#') !== 0) return hex;
    var h = hex.slice(1); if (h.length === 3) h = h.split('').map(function (x) { return x + x; }).join('');
    return 'rgba(' + parseInt(h.slice(0,2),16) + ',' + parseInt(h.slice(2,4),16) + ',' + parseInt(h.slice(4,6),16) + ',' + a + ')';
  }
  function rr(x, y, w, h, r, fill, stroke) {
    var g = ctx(); r = Math.min(r || 8, w / 2, h / 2);
    g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r);
    g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath();
    if (fill) { g.fillStyle=fill; g.fill(); } if (stroke) { g.strokeStyle=stroke; g.lineWidth=1; g.stroke(); }
  }
  function stext(t, x, y, color, size, align, weight) {
    var g=ctx(); g.fillStyle=color||C.text; g.font=(weight||500)+' '+(size||12)+'px Inter,"Noto Sans SC",sans-serif';
    g.textAlign=align||'left'; g.textBaseline='middle'; g.fillText(t,x,y);
  }
  function start(title, subtitle, range) {
    Pro.handles=[]; Pro.active = Pro.active && Pro.active;
    var g=ctx(), w=VizEngine.W, h=VizEngine.H;
    var grad=g.createLinearGradient(0,0,w,h); grad.addColorStop(0,C.bg); grad.addColorStop(1,'#0b1830');
    g.fillStyle=grad; g.fillRect(0,0,w,h);
    stext(title,20,22,C.text,15,'left',700); stext(subtitle,20,43,C.muted,11,'left',500);
    rr(w-126,12,106,28,14,rgba(C.amber,.11),rgba(C.amber,.28));
    stext('● 可直接拖动',w-73,26,C.amber,11,'center',650);
    if (range) grid(range);
  }
  function grid(r) {
    var g=ctx(), p1=VizEngine.toScreen(r.xMin,r.yMin,r.xMin,r.xMax,r.yMin,r.yMax), p2=VizEngine.toScreen(r.xMax,r.yMax,r.xMin,r.xMax,r.yMin,r.yMax);
    g.save(); g.strokeStyle=C.grid; g.lineWidth=1;
    for(var x=Math.ceil(r.xMin);x<=Math.floor(r.xMax);x++){var sx=VizEngine.toScreen(x,0,r.xMin,r.xMax,r.yMin,r.yMax)[0];g.beginPath();g.moveTo(sx,p2[1]);g.lineTo(sx,p1[1]);g.stroke();}
    for(var y=Math.ceil(r.yMin);y<=Math.floor(r.yMax);y++){var sy=VizEngine.toScreen(0,y,r.xMin,r.xMax,r.yMin,r.yMax)[1];g.beginPath();g.moveTo(p1[0],sy);g.lineTo(p2[0],sy);g.stroke();}
    var o=VizEngine.toScreen(0,0,r.xMin,r.xMax,r.yMin,r.yMax); g.strokeStyle=C.axis; g.lineWidth=1.4;
    g.beginPath();g.moveTo(p1[0],o[1]);g.lineTo(p2[0],o[1]);g.stroke();g.beginPath();g.moveTo(o[0],p2[1]);g.lineTo(o[0],p1[1]);g.stroke();g.restore();
  }
  function mpoint(x,y,r){return VizEngine.toScreen(x,y,r.xMin,r.xMax,r.yMin,r.yMax);}
  function line(x1,y1,x2,y2,r,color,width,dash){var a=mpoint(x1,y1,r),b=mpoint(x2,y2,r),g=ctx();g.save();g.strokeStyle=color||C.blue;g.lineWidth=width||2;g.setLineDash(dash||[]);g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.stroke();g.restore();}
  function arrow(x1,y1,x2,y2,r,color,width,label){
    var a=mpoint(x1,y1,r),b=mpoint(x2,y2,r),g=ctx(),ang=Math.atan2(b[1]-a[1],b[0]-a[0]);
    g.save();g.strokeStyle=color||C.blue;g.fillStyle=color||C.blue;g.lineWidth=width||3;g.lineCap='round';g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.stroke();
    g.beginPath();g.moveTo(b[0],b[1]);g.lineTo(b[0]-11*Math.cos(ang-.42),b[1]-11*Math.sin(ang-.42));g.lineTo(b[0]-11*Math.cos(ang+.42),b[1]-11*Math.sin(ang+.42));g.closePath();g.fill();g.restore();
    if(label) stext(label,b[0]+10*(Math.cos(ang)>=0?1:-1),b[1]-12,color||C.blue,12,Math.cos(ang)>=0?'left':'right',700);
  }
  function polygon(points,r,fill,stroke){var g=ctx();g.beginPath();points.forEach(function(q,i){var p=mpoint(q[0],q[1],r);if(i)g.lineTo(p[0],p[1]);else g.moveTo(p[0],p[1]);});g.closePath();g.fillStyle=fill;g.fill();g.strokeStyle=stroke;g.lineWidth=2;g.stroke();}
  function pill(text,x,y,color){var g=ctx();g.font='650 11px Inter,"Noto Sans SC",sans-serif';var w=g.measureText(text).width+18;rr(x,y-12,w,24,12,rgba(color,.14),rgba(color,.32));stext(text,x+9,y,color,11,'left',650);return w;}
  function status(main, detail, color) {var w=VizEngine.W;rr(18,VizEngine.H-45,w-36,31,10,rgba(color||C.green,.10),rgba(color||C.green,.25));stext(main,30,VizEngine.H-29,color||C.green,12,'left',700);if(detail)stext(detail,w-30,VizEngine.H-29,C.muted,11,'right',500);}
  function matrix(data,x,y,opts){
    opts=opts||{};var rows=data.length,cols=data[0].length,cw=opts.cw||38,ch=opts.ch||34,g=ctx(),high=opts.high||[],fade=opts.fade||[];
    g.save();g.strokeStyle=opts.color||C.muted;g.lineWidth=2;g.beginPath();g.moveTo(x+8,y);g.lineTo(x,y);g.lineTo(x,y+rows*ch);g.lineTo(x+8,y+rows*ch);g.moveTo(x+cols*cw-8,y);g.lineTo(x+cols*cw,y);g.lineTo(x+cols*cw,y+rows*ch);g.lineTo(x+cols*cw-8,y+rows*ch);g.stroke();
    for(var i=0;i<rows;i++)for(var j=0;j<cols;j++){var key=i+','+j,isHi=high.indexOf(key)>=0,isFade=fade.indexOf(key)>=0;if(isHi)rr(x+j*cw+4,y+i*ch+3,cw-8,ch-6,7,rgba(opts.hiColor||C.amber,.18),rgba(opts.hiColor||C.amber,.45));stext(String(data[i][j]),x+j*cw+cw/2,y+i*ch+ch/2,isFade?rgba(C.muted,.32):(isHi?(opts.hiColor||C.amber):C.text),13,'center',isHi?750:550);}
    g.restore();return {x:x,y:y,w:cols*cw,h:rows*ch,cw:cw,ch:ch};
  }
  function handleScreen(sx,sy,onDrag,label,color){Pro.handles.push({sx:sx,sy:sy,onDrag:onDrag,label:label||'',color:color||C.amber});var g=ctx();g.save();g.shadowColor=color||C.amber;g.shadowBlur=14;g.fillStyle=color||C.amber;g.beginPath();g.arc(sx,sy,7,0,Math.PI*2);g.fill();g.shadowBlur=0;g.strokeStyle=C.white;g.lineWidth=2;g.stroke();g.restore();if(label)stext(label,sx+12,sy-12,color||C.amber,10,'left',700);}
  function handleMath(x,y,r,onDrag,label,color){var p=mpoint(x,y,r);handleScreen(p[0],p[1],function(sx,sy){var pad=40,mx=r.xMin+(sx-pad)/(VizEngine.W-2*pad)*(r.xMax-r.xMin),my=r.yMin+((VizEngine.H-pad)-sy)/(VizEngine.H-2*pad)*(r.yMax-r.yMin);return onDrag(mx,my);},label,color);}
  function rail(id,value,min,max,label,y,color){
    var x1=82,x2=VizEngine.W-58,yy=y||VizEngine.H-70,t=(value-min)/(max-min),hx=x1+clamp(t,0,1)*(x2-x1),g=ctx();
    stext(label,20,yy,C.muted,11,'left',600);g.strokeStyle=rgba(color||C.amber,.25);g.lineWidth=6;g.lineCap='round';g.beginPath();g.moveTo(x1,yy);g.lineTo(x2,yy);g.stroke();g.strokeStyle=color||C.amber;g.beginPath();g.moveTo(x1,yy);g.lineTo(hx,yy);g.stroke();
    handleScreen(hx,yy,function(sx){var v=min+clamp((sx-x1)/(x2-x1),0,1)*(max-min);var o={};o[id]=v;return o;},fmt(value),color||C.amber);
  }
  function drawEquation(text,y,color){rr(20,y-18,VizEngine.W-40,36,10,rgba(color||C.blue,.08),rgba(color||C.blue,.2));stext(text,VizEngine.W/2,y,color||C.text,14,'center',650);}
  function det2(a,b,c,d){return a*d-b*c;}
  function invCoords(u,v,p){var z=det2(u[0],v[0],u[1],v[1]);if(Math.abs(z)<1e-7)return[0,0];return[(p[0]*v[1]-p[1]*v[0])/z,(u[0]*p[1]-u[1]*p[0])/z];}
  function permutations(n){var out=[];function go(prefix,left){if(!left.length){out.push(prefix);return;}left.forEach(function(v,i){go(prefix.concat(v),left.slice(0,i).concat(left.slice(i+1)));});}go([],Array.from({length:n},function(_,i){return i;}));return out;}
  function inversions(p){var n=0,pairs=[];for(var i=0;i<p.length;i++)for(var j=i+1;j<p.length;j++)if(p[i]>p[j]){n++;pairs.push((i+1)+','+(j+1));}return {n:n,pairs:pairs};}

  var defs = {};

  defs['la-det2']={title:'二阶与三阶行列式',formula:'det(A)=ad-bc',params:[
    {id:'a',label:'a₁₁',min:-4,max:4,step:.1,default:3},{id:'b',label:'a₁₂',min:-4,max:4,step:.1,default:1},{id:'c',label:'a₂₁',min:-4,max:4,step:.1,default:1},{id:'d',label:'a₂₂',min:-4,max:4,step:.1,default:2}],range:RANGE,render:function(p){
    var r=RANGE,D=det2(p.a,p.b,p.c,p.d),col=D>=0?C.green:C.pink;start('行列式 = 有向面积','拖动两个列向量的端点，面积与方向会同步变化',r);
    polygon([[0,0],[p.a,p.c],[p.a+p.b,p.c+p.d],[p.b,p.d]],r,rgba(col,.16),rgba(col,.72));arrow(0,0,p.a,p.c,r,C.blue,3,'第1列');arrow(0,0,p.b,p.d,r,C.amber,3,'第2列');
    handleMath(p.a,p.c,r,function(x,y){return{a:x,c:y};},'拖我',C.blue);handleMath(p.b,p.d,r,function(x,y){return{b:x,d:y};},'拖我',C.amber);
    status('det(A) = '+fmt(p.a)+'×'+fmt(p.d)+' − '+fmt(p.b)+'×'+fmt(p.c)+' = '+fmt(D),D===0?'压成一条线 · 不可逆':(D>0?'保持方向':'翻转方向'),col);
  }};

  defs['la-permutation']={title:'全排列与对换',formula:'(-1)^{N(τ)}',params:[{id:'perm',label:'排列编号',min:0,max:5,step:1,default:0}],range:{xMin:0,xMax:8,yMin:0,yMax:6},render:function(p){
    var ps=permutations(3),idx=Math.round(p.perm),q=ps[idx],iv=inversions(q);start('排列的奇偶性','拖动下方游标，观察逆序对如何决定符号');
    var xs=[VizEngine.W*.25,VizEngine.W*.5,VizEngine.W*.75],yt=100,yb=235;for(var i=0;i<3;i++){pill(String(i+1),xs[i]-16,yt,C.blue);pill(String(q[i]+1),xs[i]-16,yb,C.amber);var j=q[i],g=ctx();g.strokeStyle=rgba(iv.n%2?C.pink:C.green,.7);g.lineWidth=3;g.beginPath();g.moveTo(xs[i],yt+16);g.bezierCurveTo(xs[i],160,xs[j],175,xs[j],yb-16);g.stroke();}
    stext('τ = ('+q.map(function(x){return x+1;}).join('  ')+')',20,275,C.text,14,'left',700);stext('逆序对：'+(iv.pairs.join('、')||'无'),20,300,C.muted,12,'left',500);rail('perm',idx,0,5,'排列',VizEngine.H-67,C.amber);status('N(τ) = '+iv.n+'  →  '+(iv.n%2?'奇排列，符号 −':'偶排列，符号 +'),'一次对换会改变奇偶性',iv.n%2?C.pink:C.green);
  }};

  defs['la-n-det']={title:'n阶行列式的定义',formula:'|A|=Σ(-1)^{N(τ)}a₁t₁…aₙtₙ',params:[{id:'term',label:'展开项',min:0,max:23,step:1,default:0}],range:{xMin:0,xMax:8,yMin:0,yMax:6},render:function(p){
    var A=[[2,1,0,3],[1,-1,2,0],[0,2,1,1],[3,0,1,2]],q=permutations(4)[Math.round(p.term)],iv=inversions(q),high=q.map(function(v,i){return i+','+v;}),box;
    start('n阶行列式：每行每列各取一个','拖动游标遍历 4! 个乘积项；高亮格组成当前项');box=matrix(A,VizEngine.W/2-92,72,{cw:46,ch:42,high:high,hiColor:iv.n%2?C.pink:C.green});
    for(var i=0;i<4;i++){var x=box.x+q[i]*box.cw+box.cw/2,y=box.y+i*box.ch+box.ch/2;if(i){var px=box.x+q[i-1]*box.cw+box.cw/2,py=box.y+(i-1)*box.ch+box.ch/2;var g=ctx();g.strokeStyle=rgba(C.amber,.65);g.lineWidth=2;g.setLineDash([5,4]);g.beginPath();g.moveTo(px,py);g.lineTo(x,y);g.stroke();g.setLineDash([]);}}
    var factors=q.map(function(v,i){return A[i][v];}),prod=factors.reduce(function(a,b){return a*b;},1)*(iv.n%2?-1:1);drawEquation((iv.n%2?'− ':'+ ')+factors.join(' × ')+' = '+prod,275,iv.n%2?C.pink:C.green);rail('term',Math.round(p.term),0,23,'展开项',VizEngine.H-67,C.amber);status('τ = '+q.map(function(x){return x+1;}).join('')+'，逆序数 '+iv.n,'共 4! = 24 项',iv.n%2?C.pink:C.green);
  }};

  defs['la-det-prop']={title:'行列式的性质',formula:'行变换如何改变 det(A)',params:[{id:'prop',label:'性质',min:0,max:3,step:1,default:0},{id:'k',label:'变换系数 k',min:-3,max:3,step:.1,default:1.5}],range:RANGE,render:function(p){
    var r=RANGE,k=p.k,kind=Math.round(p.prop),u=[3,1],v=[1,2],u2=u.slice(),v2=v.slice(),label='';if(kind===0){u2=v;v2=u;label='交换两列：det 变号';}if(kind===1){u2=[k*u[0],k*u[1]];label='一列乘 k：det 乘 k';}if(kind===2){v2=[v[0]+k*u[0],v[1]+k*u[1]];label='一列加另一列 k 倍：det 不变';}if(kind===3){u2=[u[0]+v[0],u[1]+v[1]];label='可加性：拆成两个面积之和';}
    var before=det2(u[0],v[0],u[1],v[1]),after=det2(u2[0],v2[0],u2[1],v2[1]);start('行列式性质：把公式变成面积操作','上方选择性质；直接拖动黄色端点改变系数 k',r);polygon([[0,0],u2,[u2[0]+v2[0],u2[1]+v2[1]],v2],r,rgba(C.green,.12),rgba(C.green,.65));arrow(0,0,u2[0],u2[1],r,C.blue,3,'r₁');arrow(0,0,v2[0],v2[1],r,C.amber,3,'r₂');
    handleMath(v2[0],v2[1],r,function(x,y){if(kind===2){var den=u[0]*u[0]+u[1]*u[1];return{k:((x-v[0])*u[0]+(y-v[1])*u[1])/den};}return{k:y/Math.max(.1,v[1])};},'k',C.amber);pill(['交换','倍乘','倍加','拆分'][kind],20,65,C.purple);rail('prop',kind,0,3,'性质',VizEngine.H-91,C.purple);status(label,'原 det='+fmt(before)+'；新 det='+fmt(after),Math.abs(after-before)<.05?C.green:C.amber);
  }};

  defs['la-cofactor']={title:'按行（列）展开',formula:'Aᵢⱼ=(-1)ⁱ⁺ʲMᵢⱼ',params:[{id:'row',label:'选中行',min:0,max:2,step:1,default:0},{id:'col',label:'选中列',min:0,max:2,step:1,default:1}],range:{xMin:0,xMax:8,yMin:0,yMax:6},render:function(p){
    var A=[[2,1,3],[0,-1,2],[4,2,1]],i=Math.round(p.row),j=Math.round(p.col);start('代数余子式：划去一行一列','拖动黄色点选择元素 aᵢⱼ；余下四格就是二阶余子式');var fade=[],high=[i+','+j];for(var r=0;r<3;r++)for(var c=0;c<3;c++)if((r===i||c===j)&&!(r===i&&c===j))fade.push(r+','+c);var box=matrix(A,62,85,{cw:50,ch:46,high:high,fade:fade});var M=[];for(r=0;r<3;r++)if(r!==i){var row=[];for(c=0;c<3;c++)if(c!==j)row.push(A[r][c]);M.push(row);}var minor=det2(M[0][0],M[0][1],M[1][0],M[1][1]),cof=((i+j)%2?-1:1)*minor;stext('划去第 '+(i+1)+' 行、第 '+(j+1)+' 列',45,245,C.muted,12,'left',600);stext('留下',VizEngine.W*.48,150,C.muted,12,'center',600);matrix(M,VizEngine.W*.57,105,{cw:55,ch:48,high:['0,0','0,1','1,0','1,1'],hiColor:C.green});drawEquation('A'+(i+1)+(j+1)+' = (−1)^'+(i+j+2)+' × ('+minor+') = '+cof,270,C.amber);
    handleScreen(box.x+j*box.cw+box.cw/2,box.y+i*box.ch+box.ch/2,function(sx,sy){return{col:clamp(Math.floor((sx-box.x)/box.cw),0,2),row:clamp(Math.floor((sy-box.y)/box.ch),0,2)};},'选元素',C.amber);status('a'+(i+1)+(j+1)+' = '+A[i][j]+'，M'+(i+1)+(j+1)+' = '+minor,'棋盘符号 '+(((i+j)%2)?'−':'+'),C.green);
  }};

  defs['la-cramer']={title:'克拉默法则',formula:'x=Dₓ/D, y=Dᵧ/D',params:[{id:'b1',label:'b₁',min:-6,max:6,step:.1,default:4},{id:'b2',label:'b₂',min:-6,max:6,step:.1,default:1}],range:RANGE,render:function(p){
    var r=RANGE,D=-3,x=(p.b1*(-1)-p.b2)/D,y=(2*p.b2-p.b1)/D;start('克拉默法则：交点坐标由三个行列式给出','拖动交点，相当于改变常数列 b',r);line(-6,p.b1+12,6,p.b1-12,r,C.blue,2);line(-6,-p.b2-6,6,6-p.b2,r,C.pink,2);handleMath(x,y,r,function(mx,my){return{b1:2*mx+my,b2:mx-my};},'解 (x,y)',C.amber);var Dx=det2(p.b1,1,p.b2,-1),Dy=det2(2,p.b1,1,p.b2);pill('D = −3',20,66,C.blue);pill('Dₓ = '+fmt(Dx),98,66,C.green);pill('Dᵧ = '+fmt(Dy),190,66,C.pink);status('(x, y) = ('+fmt(x)+', '+fmt(y)+')','D≠0，所以解唯一',C.green);
  }};

  defs['la-matrix-concept']={title:'矩阵的概念',formula:'A=(aᵢⱼ)ₘ×ₙ',params:[{id:'rows',label:'行数 m',min:1,max:5,step:1,default:3},{id:'cols',label:'列数 n',min:1,max:5,step:1,default:4},{id:'kind',label:'矩阵类型',min:0,max:3,step:1,default:0}],range:{xMin:0,xMax:8,yMin:0,yMax:6},render:function(p){
    var m=Math.round(p.rows),n=Math.round(p.cols),kind=Math.round(p.kind),A=[];for(var i=0;i<m;i++){var row=[];for(var j=0;j<n;j++){var v=(i+1)*10+j+1;if(kind===1)v=i===j?1:0;if(kind===2)v=i===j?i+1:0;if(kind===3)v=(i===j?2:(Math.abs(i-j)===1?1:0));row.push(v);}A.push(row);}start('矩阵 = 按行列排成的数表','拖动右下角改变阶数；下方切换特殊矩阵');var cw=Math.min(46,220/n),ch=Math.min(38,165/m),x=VizEngine.W/2-n*cw/2,y=75,box=matrix(A,x,y,{cw:cw,ch:ch});handleScreen(box.x+box.w,box.y+box.h,function(sx,sy){return{cols:clamp(Math.round((sx-x)/cw),1,5),rows:clamp(Math.round((sy-y)/ch),1,5)};},'m×n',C.amber);rail('kind',kind,0,3,'类型',VizEngine.H-67,C.purple);status(m+' × '+n+' '+['一般矩阵','单位矩阵','对角矩阵','对称矩阵'][kind],m===n?'方阵':'非方阵',C.green);
  }};

  defs['la-mat-add']={title:'矩阵的线性运算',formula:'(A+kB)ᵢⱼ=aᵢⱼ+kbᵢⱼ',params:[{id:'k',label:'数乘 k',min:-2,max:3,step:.1,default:1},{id:'cell',label:'观察元素',min:0,max:3,step:1,default:0}],range:{xMin:0,xMax:8,yMin:0,yMax:6},render:function(p){
    var A=[[2,-1],[3,1]],B=[[1,4],[-2,2]],k=p.k,idx=Math.round(p.cell),i=Math.floor(idx/2),j=idx%2,R=A.map(function(row,r){return row.map(function(v,c){return +(v+k*B[r][c]).toFixed(2);});});start('矩阵加法：同位置元素逐个相加','拖动结果矩阵中的黄色点选择元素；拖动 k 改变数乘');var y=85,b1=matrix(A,35,y,{high:[i+','+j],hiColor:C.blue}),b2=matrix(B,VizEngine.W/2-40,y,{high:[i+','+j],hiColor:C.pink}),b3=matrix(R,VizEngine.W-125,y,{high:[i+','+j],hiColor:C.amber});stext('+ '+fmt(k)+' ×',VizEngine.W*.37,y+36,C.muted,15,'center',700);stext('=',VizEngine.W*.72,y+36,C.muted,18,'center',700);handleScreen(b3.x+j*b3.cw+b3.cw/2,b3.y+i*b3.ch+b3.ch/2,function(sx,sy){var c=clamp(Math.floor((sx-b3.x)/b3.cw),0,1),r=clamp(Math.floor((sy-b3.y)/b3.ch),0,1);return{cell:r*2+c};},'选元素',C.amber);drawEquation('c'+(i+1)+(j+1)+' = '+A[i][j]+' + '+fmt(k)+'×'+B[i][j]+' = '+fmt(R[i][j]),220,C.amber);rail('k',k,-2,3,'k',VizEngine.H-67,C.pink);status('矩阵必须同型才能相加','每个位置独立运算',C.green);
  }};

  defs['la-mat-mul']={title:'矩阵乘法',formula:'cᵢⱼ=Σaᵢₖbₖⱼ',params:[{id:'cell',label:'结果元素',min:0,max:3,step:1,default:0}],range:{xMin:0,xMax:8,yMin:0,yMax:6},render:function(p){
    var A=[[1,2,-1],[2,0,3]],B=[[2,1],[-1,3],[1,2]],Cmat=[[ -1,5],[7,8]],idx=Math.round(p.cell),i=Math.floor(idx/2),j=idx%2;start('矩阵乘法 = 行 × 列','拖动结果矩阵的黄色点，看对应行列如何做内积');var ya=75,a=matrix(A,25,ya,{cw:34,ch:38,high:[i+',0',i+',1',i+',2'],hiColor:C.blue}),b=matrix(B,VizEngine.W/2-55,55,{cw:34,ch:38,high:['0,'+j,'1,'+j,'2,'+j],hiColor:C.pink}),d=matrix(Cmat,VizEngine.W-112,75,{cw:38,ch:38,high:[i+','+j],hiColor:C.amber});stext('×',VizEngine.W*.35,112,C.muted,18,'center',700);stext('=',VizEngine.W*.74,112,C.muted,18,'center',700);handleScreen(d.x+j*d.cw+d.cw/2,d.y+i*d.ch+d.ch/2,function(sx,sy){return{cell:clamp(Math.floor((sy-d.y)/d.ch),0,1)*2+clamp(Math.floor((sx-d.x)/d.cw),0,1)};},'cᵢⱼ',C.amber);var terms=A[i].map(function(v,k){return v+'×'+B[k][j];}).join(' + ');drawEquation('c'+(i+1)+(j+1)+' = '+terms+' = '+Cmat[i][j],220,C.amber);status('A 的第 '+(i+1)+' 行 · B 的第 '+(j+1)+' 列','内维 3 消失，得到 2×2',C.green);
  }};

  defs['la-transpose']={title:'矩阵的转置',formula:'(Aᵀ)ᵢⱼ=aⱼᵢ',params:[{id:'cell',label:'原矩阵元素',min:0,max:5,step:1,default:1}],range:{xMin:0,xMax:8,yMin:0,yMax:6},render:function(p){
    var A=[[1,2,3],[4,5,6]],T=[[1,4],[2,5],[3,6]],idx=Math.round(p.cell),i=Math.floor(idx/3),j=idx%3;start('转置 = 沿主对角线翻折','拖动 A 中的黄色点，观察它在 Aᵀ 中交换行列');var a=matrix(A,55,78,{cw:42,ch:42,high:[i+','+j],hiColor:C.blue}),t=matrix(T,VizEngine.W-145,55,{cw:42,ch:42,high:[j+','+i],hiColor:C.amber});stext('沿对角线翻折  →',VizEngine.W/2,130,C.muted,12,'center',650);handleScreen(a.x+j*a.cw+a.cw/2,a.y+i*a.ch+a.ch/2,function(sx,sy){return{cell:clamp(Math.floor((sy-a.y)/a.ch),0,1)*3+clamp(Math.floor((sx-a.x)/a.cw),0,2)};},'aᵢⱼ',C.blue);drawEquation('a'+(i+1)+(j+1)+' = '+A[i][j]+'  →  (Aᵀ)'+(j+1)+(i+1)+' = '+T[j][i],235,C.amber);status('2×3 经过转置变为 3×2','(AB)ᵀ = BᵀAᵀ',C.green);
  }};

  defs['la-det-prod']={title:'方阵的行列式',formula:'det(AB)=det(A)det(B)',params:[{id:'sx',label:'A 的面积倍率',min:-2.5,max:2.5,step:.1,default:1.5},{id:'sy',label:'B 的面积倍率',min:-2.5,max:2.5,step:.1,default:1.2}],range:RANGE,render:function(p){
    var r=RANGE,da=p.sx,db=p.sy,total=da*db;start('乘积行列式：面积倍率连续相乘','拖动蓝、黄端点，观察单位面积经过 A 再经过 B',r);polygon([[0,0],[2,0],[2,2],[0,2]],r,rgba(C.muted,.08),rgba(C.muted,.35));polygon([[0,0],[2*da,0],[2*da,2],[0,2]],r,rgba(C.blue,.10),rgba(C.blue,.55));polygon([[0,0],[2*da,0],[2*da,2*db],[0,2*db]],r,rgba(C.amber,.12),rgba(C.amber,.7));handleMath(2*da,0,r,function(x){return{sx:x/2};},'det A',C.blue);handleMath(0,2*db,r,function(x,y){return{sy:y/2};},'det B',C.amber);pill('单位正方形',20,66,C.muted);pill('A 后面积 ×'+fmt(da),128,66,C.blue);pill('AB 后面积 ×'+fmt(total),270,66,C.amber);status('det(AB) = '+fmt(da)+' × '+fmt(db)+' = '+fmt(total),'两次面积伸缩相乘',total>=0?C.green:C.pink);
  }};

  defs['la-inverse']={title:'逆矩阵',formula:'A⁻¹Ax=x',params:[{id:'x',label:'向量 x₁',min:-4,max:4,step:.1,default:2},{id:'y',label:'向量 x₂',min:-4,max:4,step:.1,default:1}],range:RANGE,render:function(p){
    var r=RANGE,u=[p.x,p.y],v=[1.5*p.x+.5*p.y,.4*p.x+1.2*p.y];start('逆矩阵 = 把变换完整撤销','拖动输入 x：蓝色是 Ax，绿色是 A⁻¹(Ax)，会回到原点位',r);arrow(0,0,u[0],u[1],r,C.amber,3,'x');arrow(0,0,v[0],v[1],r,C.blue,3,'Ax');line(u[0],u[1],v[0],v[1],r,rgba(C.muted,.65),2,[5,5]);arrow(0,0,u[0],u[1],r,C.green,1.5,'A⁻¹Ax');handleMath(u[0],u[1],r,function(x,y){return{x:x,y:y};},'输入 x',C.amber);status('A⁻¹(Ax) = x = ('+fmt(p.x)+', '+fmt(p.y)+')','可逆的前提：det(A) ≠ 0',C.green);
  }};

  defs['la-block']={title:'矩阵分块法',formula:'把大矩阵视为若干子矩阵',params:[{id:'sr',label:'横向分界',min:1,max:3,step:1,default:2},{id:'sc',label:'纵向分界',min:1,max:3,step:1,default:2}],range:{xMin:0,xMax:8,yMin:0,yMax:6},render:function(p){
    var A=[[1,2,0,0],[3,4,0,0],[0,0,5,6],[0,0,7,8]],sr=Math.round(p.sr),sc=Math.round(p.sc);start('分块矩阵：把矩阵当成“矩阵的矩阵”','拖动分割点改变分块；兼容尺寸的块才能相乘');var box=matrix(A,VizEngine.W/2-96,62,{cw:48,ch:45}),sx=box.x+sc*box.cw,sy=box.y+sr*box.ch,g=ctx();g.strokeStyle=C.amber;g.lineWidth=3;g.setLineDash([7,4]);g.beginPath();g.moveTo(sx,box.y-5);g.lineTo(sx,box.y+box.h+5);g.moveTo(box.x-5,sy);g.lineTo(box.x+box.w+5,sy);g.stroke();g.setLineDash([]);handleScreen(sx,sy,function(x,y){return{sc:clamp(Math.round((x-box.x)/box.cw),1,3),sr:clamp(Math.round((y-box.y)/box.ch),1,3)};},'分割点',C.amber);status('分块尺寸：'+sr+'+'+(4-sr)+' 行，'+sc+'+'+(4-sc)+' 列','块对角结构可大幅简化运算',C.green);
  }};

  defs['la-row-op']={title:'矩阵的初等变换',formula:'交换、倍乘、倍加',params:[{id:'op',label:'行变换类型',min:0,max:2,step:1,default:2},{id:'k',label:'变换系数 k',min:-3,max:3,step:.1,default:-2}],range:{xMin:0,xMax:8,yMin:0,yMax:6},render:function(p){
    var A=[[1,2,1],[2,3,4],[1,1,2]],op=Math.round(p.op),k=p.k,B=A.map(function(r){return r.slice();}),caption='';if(op===0){var tmp=B[0];B[0]=B[1];B[1]=tmp;caption='r₁ ↔ r₂';}if(op===1){B[1]=B[1].map(function(x){return +(k*x).toFixed(2);});caption='r₂ ← '+fmt(k)+'r₂';}if(op===2){B[1]=B[1].map(function(x,j){return +(x+k*B[0][j]).toFixed(2);});caption='r₂ ← r₂ + ('+fmt(k)+')r₁';}start('初等行变换：只做三种合法动作','拖动系数 k；高亮行是本次被改变的行');matrix(A,42,78,{cw:38,ch:38,high:[op===0?'0,0':'1,0',op===0?'0,1':'1,1',op===0?'0,2':'1,2'],hiColor:C.blue});stext(caption,VizEngine.W/2,130,C.amber,13,'center',700);stext('→',VizEngine.W/2,162,C.muted,18,'center',700);matrix(B,VizEngine.W-162,78,{cw:38,ch:38,high:['1,0','1,1','1,2'],hiColor:C.amber});rail('op',op,0,2,'类型',VizEngine.H-92,C.purple);rail('k',k,-3,3,'k',VizEngine.H-67,C.amber);status('初等变换不改变方程组的解','倍乘时 k 不能为 0',C.green);
  }};

  defs['la-elem-mat']={title:'初等矩阵',formula:'EA = 对 A 做一次行变换',params:[{id:'op',label:'初等矩阵类型',min:0,max:2,step:1,default:0},{id:'k',label:'参数 k',min:-2,max:3,step:.1,default:1}],range:{xMin:0,xMax:8,yMin:0,yMax:6},render:function(p){
    var op=Math.round(p.op),k=p.k,E=op===0?[[0,1],[1,0]]:(op===1?[[k,0],[0,1]]:[[1,0],[k,1]]),A=[[2,1],[3,4]],R=[[E[0][0]*2+E[0][1]*3,E[0][0]+E[0][1]*4],[E[1][0]*2+E[1][1]*3,E[1][0]+E[1][1]*4]];start('初等矩阵：把“行操作”装进矩阵','拖动类型游标；左乘 E 会对 A 执行同样的行变换');matrix(E,35,92,{high:['0,0','0,1','1,0','1,1'],hiColor:C.purple});stext('E',75,72,C.purple,12,'center',700);stext('×',145,126,C.muted,18,'center',700);matrix(A,175,92,{high:['0,0','0,1','1,0','1,1'],hiColor:C.blue});stext('A',215,72,C.blue,12,'center',700);stext('=',280,126,C.muted,18,'center',700);matrix(R,310,92,{high:['0,0','0,1','1,0','1,1'],hiColor:C.amber});rail('op',op,0,2,'类型',VizEngine.H-92,C.purple);rail('k',k,-2,3,'k',VizEngine.H-67,C.amber);status(['交换两行','第1行乘 k','第2行加 k 倍第1行'][op],'E⁻¹ 也是初等矩阵',C.green);
  }};

  defs['la-rank']={title:'矩阵的秩',formula:'R(A)=最大无关方向数',params:[{id:'x',label:'第二向量 x',min:-4,max:4,step:.1,default:2},{id:'y',label:'第二向量 y',min:-4,max:4,step:.1,default:2}],range:RANGE,render:function(p){
    var r=RANGE,u=[3,1],v=[p.x,p.y],cross=det2(u[0],v[0],u[1],v[1]),rank=(Math.hypot(p.x,p.y)<.08?1:(Math.abs(cross)<.18?1:2));start('秩 = 能撑开的独立方向数','拖动黄色向量：共线时只能撑开一条线，不共线时撑开整个平面',r);if(rank===2)polygon([[0,0],u,[u[0]+v[0],u[1]+v[1]],v],r,rgba(C.green,.12),rgba(C.green,.5));else line(-6,-2,6,2,r,rgba(C.purple,.35),5);arrow(0,0,u[0],u[1],r,C.blue,3,'r₁');arrow(0,0,v[0],v[1],r,C.amber,3,'r₂');handleMath(v[0],v[1],r,function(x,y){return{x:x,y:y};},'拖动 r₂',C.amber);status('R(A) = '+rank,rank===1?'两个行向量线性相关':'两个行向量线性无关',rank===2?C.green:C.pink);
  }};

  defs['la-solution']={title:'线性方程组的解',formula:'比较 R(A) 与 R(A|b)',params:[{id:'y1',label:'第二直线左端',min:-4,max:4,step:.1,default:-1},{id:'y2',label:'第二直线右端',min:-4,max:4,step:.1,default:3}],range:RANGE,render:function(p){
    var r=RANGE,m1=.5,c1=1,m2=(p.y2-p.y1)/8,c2=(p.y1+p.y2)/2,parallel=Math.abs(m1-m2)<.04,coincide=parallel&&Math.abs(c1-c2)<.08,statusText=coincide?'无穷多解':(parallel?'无解':'唯一解');start('方程组的解 = 直线的交点','拖动第二条直线两端：相交、平行、重合对应三种解况',r);line(-4,m1*(-4)+c1,4,m1*4+c1,r,C.blue,3);line(-4,p.y1,4,p.y2,r,C.amber,3);handleMath(-4,p.y1,r,function(x,y){return{y1:y};},'端点',C.amber);handleMath(4,p.y2,r,function(x,y){return{y2:y};},'端点',C.amber);if(!parallel){var x=(c2-c1)/(m1-m2),y=m1*x+c1;var q=mpoint(x,y,r);ctx().fillStyle=C.green;ctx().beginPath();ctx().arc(q[0],q[1],6,0,Math.PI*2);ctx().fill();}status(statusText,coincide?'R(A)=R(A|b)<n':(parallel?'R(A)<R(A|b)':'R(A)=R(A|b)=n'),statusText==='唯一解'?C.green:C.pink);
  }};

  defs['la-gauss']={title:'消元法解方程组',formula:'增广矩阵 → 阶梯形 → 回代',params:[{id:'step',label:'消元步骤',min:0,max:3,step:1,default:0}],range:{xMin:0,xMax:8,yMin:0,yMax:6},render:function(p){
    var s=Math.round(p.step),steps=[[[1,1,1,6],[2,-1,1,3],[1,2,-1,3]],[[1,1,1,6],[0,-3,-1,-9],[0,1,-2,-3]],[[1,1,1,6],[0,1,-2,-3],[0,0,-7,-18]],[[1,0,0,1],[0,1,0,2],[0,0,1,3]]],notes=['原增广矩阵','消去第1列下方元素','选主元并消去第2列','回代得到最简形'];start('高斯消元：一步步制造“楼梯”','拖动步骤游标；当前主元与被消去区域同步高亮');var hi=s===0?['0,0']:(s===1?['0,0','1,1']:(s===2?['0,0','1,1','2,2']:['0,0','1,1','2,2']));matrix(steps[s],VizEngine.W/2-92,72,{cw:46,ch:44,high:hi,hiColor:C.amber});drawEquation(notes[s],240,C.amber);rail('step',s,0,3,'步骤',VizEngine.H-67,C.amber);status(s===3?'解：x=1，y=2，z=3':'目标：主元下方逐个变成 0','行变换保持解集不变',s===3?C.green:C.blue);
  }};

  defs['la-lincomb']={title:'向量组与线性组合',formula:'v=c₁α₁+c₂α₂',params:[{id:'c1',label:'系数 c₁',min:-2,max:2,step:.05,default:1},{id:'c2',label:'系数 c₂',min:-2,max:2,step:.05,default:1}],range:RANGE,render:function(p){
    var r=RANGE,u=[3,1],v=[1,2],q=[p.c1*u[0]+p.c2*v[0],p.c1*u[1]+p.c2*v[1]];start('线性组合：两个方向像两根“坐标尺”','直接拖动结果向量端点，系统反算 c₁、c₂',r);arrow(0,0,p.c1*u[0],p.c1*u[1],r,C.blue,3,'c₁α₁');arrow(p.c1*u[0],p.c1*u[1],q[0],q[1],r,C.green,3,'c₂α₂');arrow(0,0,q[0],q[1],r,C.amber,4,'v');line(0,0,p.c2*v[0],p.c2*v[1],r,rgba(C.green,.35),2,[5,5]);handleMath(q[0],q[1],r,function(x,y){var z=invCoords(u,v,[x,y]);return{c1:z[0],c2:z[1]};},'拖动 v',C.amber);status('v = '+fmt(p.c1)+'α₁ + '+fmt(p.c2)+'α₂','分量首尾相接',C.green);
  }};

  defs['la-depend']={title:'线性相关与线性无关',formula:'det[α₁ α₂]=0 ⇔ 相关',params:[{id:'x',label:'α₂ 的 x',min:-4,max:4,step:.1,default:2},{id:'y',label:'α₂ 的 y',min:-4,max:4,step:.1,default:2}],range:RANGE,render:function(p){
    var r=RANGE,u=[3,1],cross=3*p.y-p.x,dep=Math.abs(cross)<.18;start('线性相关：一个向量能否由另一个表示','拖动 α₂；当它落到紫色直线上时，两个向量失去独立性',r);line(-6,-2,6,2,r,rgba(C.purple,.35),5);arrow(0,0,u[0],u[1],r,C.blue,3,'α₁');arrow(0,0,p.x,p.y,r,C.amber,3,'α₂');handleMath(p.x,p.y,r,function(x,y){return{x:x,y:y};},'拖动 α₂',C.amber);status(dep?'线性相关':'线性无关','det = '+fmt(cross),dep?C.pink:C.green);
  }};

  defs['la-vec-rank']={title:'向量组的秩',formula:'秩 = 极大无关组所含向量数',params:[{id:'x',label:'α₃ 的 x',min:-4,max:4,step:.1,default:1},{id:'y',label:'α₃ 的 y',min:-4,max:4,step:.1,default:3}],range:RANGE,render:function(p){
    var r=RANGE,a=[2,1],b=[4,2],cross=2*p.y-p.x,rank=Math.abs(cross)<.18?1:2;start('向量组的秩：只数真正新增的方向','α₂ 已经是 α₁ 的 2 倍；拖动 α₃ 看它是否带来新方向',r);line(-6,-3,6,3,r,rgba(C.purple,.28),5);arrow(0,0,a[0],a[1],r,C.blue,3,'α₁');arrow(0,0,b[0],b[1],r,C.purple,3,'α₂=2α₁');arrow(0,0,p.x,p.y,r,C.amber,3,'α₃');handleMath(p.x,p.y,r,function(x,y){return{x:x,y:y};},'拖动 α₃',C.amber);status('R(α₁,α₂,α₃) = '+rank,rank===1?'极大无关组可取 {α₁}':'极大无关组可取 {α₁,α₃}',rank===2?C.green:C.pink);
  }};

  defs['la-sol-struct']={title:'线性方程组解的结构',formula:'x=x*+tξ',params:[{id:'t',label:'自由参数 t',min:-3,max:3,step:.05,default:1},{id:'h',label:'特解偏移',min:-2,max:2,step:.1,default:.8}],range:RANGE,render:function(p){
    var r=RANGE,x0=[1,p.h],xi=[1.4,1],q=[x0[0]+p.t*xi[0],x0[1]+p.t*xi[1]];start('非齐次解 = 一个特解 + 齐次解','拖动黄点沿解集移动；整条绿色直线都满足同一方程组',r);line(x0[0]-8*xi[0],x0[1]-8*xi[1],x0[0]+8*xi[0],x0[1]+8*xi[1],r,rgba(C.green,.62),4);arrow(0,0,x0[0],x0[1],r,C.blue,3,'x*');arrow(x0[0],x0[1],q[0],q[1],r,C.purple,3,'tξ');handleMath(q[0],q[1],r,function(x,y){var den=xi[0]*xi[0]+xi[1]*xi[1];return{t:((x-x0[0])*xi[0]+(y-x0[1])*xi[1])/den};},'任意解 x',C.amber);status('x = x* + '+fmt(p.t)+'ξ = ('+fmt(q[0])+', '+fmt(q[1])+')','ξ 属于 Ax=0 的解空间',C.green);
  }};

  defs['la-vec-space']={title:'向量空间',formula:'加法封闭 + 数乘封闭',params:[{id:'x',label:'测试向量 x',min:-4,max:4,step:.1,default:2},{id:'y',label:'测试向量 y',min:-4,max:4,step:.1,default:1},{id:'type',label:'集合类型',min:0,max:1,step:1,default:0}],range:RANGE,render:function(p){
    var r=RANGE,type=Math.round(p.type),on=type===0?Math.abs(p.y-.5*p.x)<.18:Math.abs(p.y-(.5*p.x+1))<.18;start('子空间必须穿过原点，并对运算封闭','拖动测试向量；切换“过原点直线 / 平移直线”比较',r);line(-6,type===0?-3:-2,6,type===0?3:4,r,type===0?rgba(C.green,.7):rgba(C.pink,.7),5);arrow(0,0,p.x,p.y,r,on?C.green:C.amber,3,'v');handleMath(p.x,p.y,r,function(x,y){return{x:x,y:y};},'测试 v',C.amber);rail('type',type,0,1,'集合',VizEngine.H-67,C.purple);status(type===0?'过原点直线：是子空间':'平移直线：不是子空间',type===0?'含零向量且封闭':'不含零向量，首先出局',type===0?C.green:C.pink);
  }};

  defs['la-inner']={title:'向量的内积与正交',formula:'u·v=|u||v|cosθ',params:[{id:'ux',label:'u₁',min:-4,max:4,step:.1,default:3},{id:'uy',label:'u₂',min:-4,max:4,step:.1,default:1},{id:'vx',label:'v₁',min:-4,max:4,step:.1,default:1},{id:'vy',label:'v₂',min:-4,max:4,step:.1,default:3}],range:RANGE,render:function(p){
    var r=RANGE,dot=p.ux*p.vx+p.uy*p.vy,nu=Math.hypot(p.ux,p.uy),nv=Math.hypot(p.vx,p.vy),cos=nu*nv?clamp(dot/(nu*nv),-1,1):0,ang=Math.acos(cos)*180/Math.PI,scale=nu?dot/(nu*nu):0,proj=[scale*p.ux,scale*p.uy];start('内积：测量两个方向有多“同向”','拖动两个向量端点；虚线是 v 在 u 上的投影',r);arrow(0,0,p.ux,p.uy,r,C.blue,3,'u');arrow(0,0,p.vx,p.vy,r,C.amber,3,'v');arrow(0,0,proj[0],proj[1],r,C.green,3,'projᵤv');line(proj[0],proj[1],p.vx,p.vy,r,rgba(C.muted,.7),2,[5,5]);handleMath(p.ux,p.uy,r,function(x,y){return{ux:x,uy:y};},'拖 u',C.blue);handleMath(p.vx,p.vy,r,function(x,y){return{vx:x,vy:y};},'拖 v',C.amber);status('u·v = '+fmt(dot)+'，θ = '+fmt(ang,1)+'°',Math.abs(dot)<.15?'近似正交':(dot>0?'夹角为锐角':'夹角为钝角'),Math.abs(dot)<.15?C.green:C.amber);
  }};

  defs['la-eigen']={title:'特征值与特征向量',formula:'Av=λv',params:[{id:'x',label:'v₁',min:-4,max:4,step:.1,default:3},{id:'y',label:'v₂',min:-4,max:4,step:.1,default:1}],range:RANGE,render:function(p){
    var r=RANGE,w=[1.8*p.x,.65*p.y],cross=p.x*w[1]-p.y*w[0],eigen=Math.abs(cross)<.18;start('特征向量：变换后方向不改变','拖动 v；当 v 落在坐标轴特征方向上，Av 与 v 共线',r);line(-6,0,6,0,r,rgba(C.blue,.25),5);line(0,-4.8,0,4.8,r,rgba(C.purple,.25),5);arrow(0,0,p.x,p.y,r,C.amber,3,'v');arrow(0,0,w[0],w[1],r,C.green,3,'Av');handleMath(p.x,p.y,r,function(x,y){return{x:x,y:y};},'拖动 v',C.amber);var lam=(Math.abs(p.x)>Math.abs(p.y)?(p.x?w[0]/p.x:0):(p.y?w[1]/p.y:0));status(eigen?'这是特征向量，λ≈'+fmt(lam):'不是特征向量','特征方向：x轴 λ=1.8，y轴 λ=0.65',eigen?C.green:C.pink);
  }};

  defs['la-similar']={title:'相似矩阵',formula:'B=P⁻¹AP',params:[{id:'ang',label:'基旋转角',min:-3.14,max:3.14,step:.01,default:.55}],range:RANGE,render:function(p){
    var r=RANGE,a=p.ang,c=Math.cos(a),s=Math.sin(a);start('相似矩阵：同一个变换，换一套坐标描述','拖动彩色基向量旋转；矩阵元素改变，但特征值不变',r);line(-6,0,6,0,r,rgba(C.muted,.24),2);line(0,-5,0,5,r,rgba(C.muted,.24),2);arrow(0,0,3.5*c,3.5*s,r,C.blue,3,'e₁′');arrow(0,0,-3.5*s,3.5*c,r,C.green,3,'e₂′');handleMath(3.5*c,3.5*s,r,function(x,y){return{ang:Math.atan2(y,x)};},'旋转基',C.amber);var b11=2*c*c+s*s,b12=c*s,b22=2*s*s+c*c;rr(20,68,190,82,10,rgba(C.panel2,.82),rgba(C.blue,.25));stext('B = P⁻¹AP',35,88,C.blue,12,'left',700);stext('['+fmt(b11)+'  '+fmt(b12)+']',35,112,C.text,13,'left',600);stext('['+fmt(b12)+'  '+fmt(b22)+']',35,134,C.text,13,'left',600);status('特征值始终是 {2, 1}','相似只改变坐标语言，不改变变换本身',C.green);
  }};

  defs['la-diag']={title:'对称矩阵的对角化',formula:'QᵀAQ=Λ',params:[{id:'ang',label:'主轴方向',min:-3.14,max:3.14,step:.01,default:.6}],range:RANGE,render:function(p){
    var r=RANGE,a=p.ang,c=Math.cos(a),s=Math.sin(a),g=ctx();start('正交对角化：把椭圆转正','拖动主轴；沿特征向量选基后，交叉项消失',r);var center=mpoint(0,0,r),rx=(VizEngine.W-80)/12*3.2,ry=(VizEngine.H-80)/9.6*1.7;g.save();g.translate(center[0],center[1]);g.rotate(-a);g.fillStyle=rgba(C.purple,.10);g.strokeStyle=C.purple;g.lineWidth=3;g.beginPath();g.ellipse(0,0,rx,ry,0,0,Math.PI*2);g.fill();g.stroke();g.restore();arrow(0,0,3.6*c,3.6*s,r,C.blue,3,'q₁');arrow(0,0,-2.5*s,2.5*c,r,C.green,3,'q₂');handleMath(3.6*c,3.6*s,r,function(x,y){return{ang:Math.atan2(y,x)};},'主轴',C.amber);pill('原坐标有 xy 交叉项',20,68,C.pink);pill('特征基下 Λ=diag(3,1)',20,98,C.green);status('Q 的列向量就是单位特征向量','QᵀQ=I，旋转不改变长度',C.green);
  }};

  defs['la-quadform']={title:'二次型及其标准形',formula:'f(x,y)=xᵀAx',params:[{id:'x',label:'点 x',min:-4,max:4,step:.05,default:1.5},{id:'y',label:'点 y',min:-4,max:4,step:.05,default:1},{id:'b',label:'交叉项系数 b',min:-1.8,max:1.8,step:.05,default:.5}],range:RANGE,render:function(p){
    var r=RANGE,val=2*p.x*p.x+2*p.b*p.x*p.y+p.y*p.y,g=ctx();start('二次型：每个点都对应一个“能量高度”','拖动黄色点；它所在的等值线满足 xᵀAx = 常数',r);for(var k=1;k<=5;k++){var level=k*2;g.strokeStyle=rgba(k<4?C.blue:C.purple,.22+k*.05);g.lineWidth=1.5;g.beginPath();var begun=false;for(var t=0;t<=Math.PI*2+.02;t+=.025){var ux=Math.cos(t),uy=Math.sin(t),den=2*ux*ux+2*p.b*ux*uy+uy*uy;if(den<=.02)continue;var rr0=Math.sqrt(level/den),q=mpoint(rr0*ux,rr0*uy,r);if(!begun){g.moveTo(q[0],q[1]);begun=true;}else g.lineTo(q[0],q[1]);}g.stroke();}handleMath(p.x,p.y,r,function(x,y){return{x:x,y:y};},'拖动点',C.amber);status('f('+fmt(p.x)+','+fmt(p.y)+') = '+fmt(val),'交叉项 2bxy，b='+fmt(p.b),val>=0?C.green:C.pink);
  }};

  defs['la-completesq']={title:'配方法化标准形',formula:'x²+2hxy+… → (x+hy)²+…',params:[{id:'h',label:'混合系数 h',min:-2,max:2,step:.05,default:1},{id:'step',label:'配方步骤',min:0,max:2,step:1,default:0}],range:RANGE,render:function(p){
    var r=RANGE,s=Math.round(p.step),h=p.h;start('拉格朗日配方法：把斜坐标“扶正”','拖动黄色基向量改变混合项；步骤游标展示配方过程',r);arrow(0,0,3,0,r,C.blue,3,'x');arrow(0,0,3*h,2.2,r,C.amber,3,'x+hy');handleMath(3*h,2.2,r,function(x){return{h:x/3};},'拖动混合项',C.amber);var lines=['f=x²+2('+fmt(h)+')xy+('+fmt(h*h+2)+')y²','=[x+'+fmt(h)+'y]²+2y²','令 u=x+'+fmt(h)+'y，v=y → f=u²+2v²'];for(var i=0;i<3;i++){rr(20,76+i*44,VizEngine.W*.58,34,9,i<=s?rgba(i===s?C.amber:C.blue,.11):rgba(C.muted,.04),i<=s?rgba(i===s?C.amber:C.blue,.26):rgba(C.muted,.1));stext(lines[i],32,93+i*44,i<=s?(i===s?C.amber:C.text):rgba(C.muted,.45),12,'left',i===s?700:500);}rail('step',s,0,2,'步骤',VizEngine.H-67,C.purple);status(s===2?'标准形完成：f=u²+2v²':'继续拖动步骤查看下一步','本质是逐项消去交叉项',s===2?C.green:C.blue);
  }};

  defs['la-posdef']={title:'正定二次型',formula:'xᵀAx>0 (x≠0)',params:[{id:'a',label:'a₁₁',min:-1,max:4,step:.05,default:2},{id:'b',label:'a₁₂',min:-2,max:2,step:.05,default:.4},{id:'c',label:'a₂₂',min:-1,max:4,step:.05,default:1.5}],range:RANGE,render:function(p){
    var r=RANGE,D1=p.a,D2=p.a*p.c-p.b*p.b,pos=D1>0&&D2>0,g=ctx();start('正定性：原点是否是唯一“碗底”','拖动黄色系数控制点；等值线闭合时二次型处处为正',r);if(pos){for(var k=1;k<=4;k++){var level=k*1.6;g.strokeStyle=rgba(C.green,.18+k*.09);g.lineWidth=2;g.beginPath();var begun=false;for(var t=0;t<=Math.PI*2+.03;t+=.025){var ux=Math.cos(t),uy=Math.sin(t),den=p.a*ux*ux+2*p.b*ux*uy+p.c*uy*uy;if(den<=.01)continue;var rad=Math.sqrt(level/den),q=mpoint(rad*ux,rad*uy,r);if(!begun){g.moveTo(q[0],q[1]);begun=true;}else g.lineTo(q[0],q[1]);}g.stroke();}}else{for(var m=-3;m<=3;m++)line(-5,m-1,5,-m+1,r,rgba(C.pink,.18),2);}rail('b',p.b,-2,2,'交叉项 b',VizEngine.H-67,C.amber);status(pos?'正定：Δ₁>0 且 Δ₂>0':'非正定：顺序主子式条件失败','Δ₁='+fmt(D1)+'，Δ₂='+fmt(D2),pos?C.green:C.pink);
  }};

  defs['la-linspace']={title:'线性空间的定义',formula:'对加法和数乘封闭',params:[{id:'a',label:'直线截距 a',min:-2,max:2,step:.05,default:0},{id:'k',label:'数乘 k',min:-2,max:2,step:.05,default:1.5}],range:RANGE,render:function(p){
    var r=RANGE,isSpace=Math.abs(p.a)<.08,v=[2,1+p.a],kv=[p.k*v[0],p.k*(v[1]-p.a)+p.a];start('线性空间：运算后仍不能“跑出去”','拖动截距让集合离开/经过原点；拖动 k 测试数乘封闭',r);line(-6,-3+p.a,6,3+p.a,r,isSpace?rgba(C.green,.72):rgba(C.pink,.72),5);arrow(0,0,v[0],v[1],r,C.blue,3,'v');arrow(0,0,kv[0],kv[1],r,C.amber,3,'kv');handleMath(kv[0],kv[1],r,function(x){return{k:x/Math.max(.1,v[0])};},'拖动 kv',C.amber);rail('a',p.a,-2,2,'截距 a',VizEngine.H-67,C.purple);status(isSpace?'这是线性空间（过原点且封闭）':'这不是线性空间（不含零向量）','零向量是第一道检查',isSpace?C.green:C.pink);
  }};

  defs['la-basis']={title:'维数、基与坐标',formula:'v=c₁e₁+c₂e₂',params:[{id:'x',label:'v₁',min:-4,max:4,step:.05,default:2.5},{id:'y',label:'v₂',min:-4,max:4,step:.05,default:2}],range:RANGE,render:function(p){
    var r=RANGE,e1=[3,1],e2=[1,2],co=invCoords(e1,e2,[p.x,p.y]);start('基 = 空间里的两把坐标尺','拖动 v：几何位置改变，基坐标 (c₁,c₂) 即时更新',r);arrow(0,0,e1[0],e1[1],r,C.blue,3,'e₁');arrow(0,0,e2[0],e2[1],r,C.green,3,'e₂');arrow(0,0,co[0]*e1[0],co[0]*e1[1],r,rgba(C.blue,.65),2);arrow(co[0]*e1[0],co[0]*e1[1],p.x,p.y,r,rgba(C.green,.75),2);arrow(0,0,p.x,p.y,r,C.amber,4,'v');handleMath(p.x,p.y,r,function(x,y){return{x:x,y:y};},'拖动 v',C.amber);status('[v]ᴮ = ('+fmt(co[0])+', '+fmt(co[1])+')','二维空间的基含 2 个线性无关向量',C.green);
  }};

  defs['la-basechange']={title:'基变换与坐标变换',formula:'x=P x′',params:[{id:'ang',label:'新基旋转角',min:-3.14,max:3.14,step:.01,default:.55},{id:'x',label:'固定向量 x',min:-4,max:4,step:.05,default:3},{id:'y',label:'固定向量 y',min:-4,max:4,step:.05,default:2}],range:RANGE,render:function(p){
    var r=RANGE,a=p.ang,c=Math.cos(a),s=Math.sin(a),co=[p.x*c+p.y*s,-p.x*s+p.y*c];start('换基：向量不动，坐标会变','拖动蓝色新基旋转，或拖动黄色向量；观察新坐标',r);arrow(0,0,3.7*c,3.7*s,r,C.blue,3,'e₁′');arrow(0,0,-3.2*s,3.2*c,r,C.green,3,'e₂′');arrow(0,0,p.x,p.y,r,C.amber,4,'x');handleMath(3.7*c,3.7*s,r,function(x,y){return{ang:Math.atan2(y,x)};},'旋转新基',C.blue);handleMath(p.x,p.y,r,function(x,y){return{x:x,y:y};},'拖动 x',C.amber);status('旧坐标 ('+fmt(p.x)+', '+fmt(p.y)+') → 新坐标 ('+fmt(co[0])+', '+fmt(co[1])+')','同一个几何向量，两套数字描述',C.green);
  }};

  defs['la-lintrans']={title:'线性变换',formula:'T(αu+βv)=αT(u)+βT(v)',params:[{id:'x',label:'输入 x',min:-4,max:4,step:.05,default:2},{id:'y',label:'输入 y',min:-4,max:4,step:.05,default:1},{id:'k',label:'剪切系数 k',min:-2,max:2,step:.05,default:.8}],range:RANGE,render:function(p){
    var r=RANGE,w=[p.x+p.k*p.y,.65*p.y];start('线性变换：网格可以拉伸、剪切，但原点不动','拖动输入向量 u；绿色箭头实时显示 T(u)',r);for(var i=-4;i<=4;i++){line(-5+p.k*i,i*.65,5+p.k*i,i*.65,r,rgba(C.blue,.11),1);line(i-4*p.k,-2.6,i+4*p.k,2.6,r,rgba(C.blue,.11),1);}arrow(0,0,p.x,p.y,r,C.amber,3,'u');arrow(0,0,w[0],w[1],r,C.green,4,'T(u)');line(p.x,p.y,w[0],w[1],r,rgba(C.muted,.6),2,[5,5]);handleMath(p.x,p.y,r,function(x,y){return{x:x,y:y};},'拖动 u',C.amber);status('T('+fmt(p.x)+','+fmt(p.y)+') = ('+fmt(w[0])+','+fmt(w[1])+')','T(0)=0，直线仍变成直线',C.green);
  }};

  defs['la-transmat']={title:'线性变换的矩阵表示',formula:'[T]ᴮ 的列 = T(eᵢ) 的坐标',params:[{id:'a',label:'T(e₁) x',min:-3,max:3,step:.05,default:2},{id:'c',label:'T(e₁) y',min:-3,max:3,step:.05,default:.5},{id:'b',label:'T(e₂) x',min:-3,max:3,step:.05,default:.5},{id:'d',label:'T(e₂) y',min:-3,max:3,step:.05,default:2}],range:RANGE,render:function(p){
    var r=RANGE,D=det2(p.a,p.b,p.c,p.d);start('变换矩阵：两列就是两个基向量的像','直接拖动 T(e₁)、T(e₂)，矩阵四个元素随端点坐标更新',r);polygon([[0,0],[p.a,p.c],[p.a+p.b,p.c+p.d],[p.b,p.d]],r,rgba(D>=0?C.green:C.pink,.12),rgba(D>=0?C.green:C.pink,.55));arrow(0,0,p.a,p.c,r,C.blue,3,'T(e₁) = 第1列');arrow(0,0,p.b,p.d,r,C.green,3,'T(e₂) = 第2列');handleMath(p.a,p.c,r,function(x,y){return{a:x,c:y};},'拖第1列',C.blue);handleMath(p.b,p.d,r,function(x,y){return{b:x,d:y};},'拖第2列',C.green);rr(20,66,122,76,10,rgba(C.panel2,.86),rgba(C.amber,.25));stext('[ '+fmt(p.a)+'  '+fmt(p.b)+' ]',35,90,C.text,13,'left',650);stext('[ '+fmt(p.c)+'  '+fmt(p.d)+' ]',35,116,C.text,13,'left',650);status('det[T] = '+fmt(D),Math.abs(D)<.08?'像空间降维':'两列独立，变换可逆',Math.abs(D)<.08?C.pink:C.green);
  }};

  Object.assign(vizTypes, defs);

  function paramMeta(id) {
    var kp=(typeof state!=='undefined')&&state.currentKP;if(!kp)return null;var v=vizTypes[kp.viz];if(!v)return null;for(var i=0;i<v.params.length;i++)if(v.params[i].id===id)return v.params[i];return null;
  }
  function applyUpdates(updates, snap) {
    if(!updates)return;Object.keys(updates).forEach(function(id){var m=paramMeta(id);if(!m)return;var v=clamp(updates[id],+m.min,+m.max),step=+m.step;if(step>0)v=Math.round(v/step)*step;v=+v.toFixed(8);setVizParamUI(id,v);});if(typeof updateViz==='function')updateViz();
  }
  function hit(sx,sy){for(var i=Pro.handles.length-1;i>=0;i--){var h=Pro.handles[i],dx=sx-h.sx,dy=sy-h.sy;if(dx*dx+dy*dy<=28*28)return h;}return null;}
  function bindCanvas(){
    var cv=document.getElementById('vizCanvas');if(!cv||cv._laProBound)return;cv._laProBound=true;cv.tabIndex=0;cv.setAttribute('role','application');cv.setAttribute('aria-label','线性代数互动可视化。使用鼠标或触摸拖动黄色控制点，也可用方向键微调。');cv.style.touchAction='none';
    function fitCanvas(){
      if(!cv.isConnected||!cv.parentElement)return;var width=cv.parentElement.getBoundingClientRect().width;
      if(width>200&&Math.abs(width-VizEngine.W)>2){VizEngine.resize();if(typeof updateViz==='function')updateViz();}
    }
    if(typeof ResizeObserver!=='undefined'){
      cv._laResizeObserver=new ResizeObserver(function(){fitCanvas();});
      cv._laResizeObserver.observe(cv.parentElement);
    }
    setTimeout(fitCanvas,180);setTimeout(fitCanvas,420);
    function pos(e){var b=cv.getBoundingClientRect();return[(e.clientX-b.left)*VizEngine.W/b.width,(e.clientY-b.top)*VizEngine.H/b.height];}
    cv.addEventListener('pointerdown',function(e){var q=pos(e),h=hit(q[0],q[1]);if(!h)return;Pro.active=h;Pro.last=q;cv.setPointerCapture(e.pointerId);cv.style.cursor='grabbing';e.preventDefault();});
    cv.addEventListener('pointermove',function(e){var q=pos(e);if(Pro.active){Pro.last=q;applyUpdates(Pro.active.onDrag(q[0],q[1]),false);e.preventDefault();}else cv.style.cursor=hit(q[0],q[1])?'grab':'default';});
    function end(e){if(!Pro.active)return;var q=Pro.last;applyUpdates(Pro.active.onDrag(q[0],q[1]),true);Pro.active=null;cv.style.cursor='default';if(e&&cv.hasPointerCapture&&cv.hasPointerCapture(e.pointerId))cv.releasePointerCapture(e.pointerId);}
    cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',end);
    cv.addEventListener('keydown',function(e){if(!Pro.handles.length)return;var h=Pro.handles[clamp(Pro.focused,0,Pro.handles.length-1)],dx=0,dy=0;if(e.key==='ArrowLeft')dx=-6;if(e.key==='ArrowRight')dx=6;if(e.key==='ArrowUp')dy=-6;if(e.key==='ArrowDown')dy=6;if(!dx&&!dy)return;applyUpdates(h.onDrag(h.sx+dx,h.sy+dy),false);e.preventDefault();});
  }
  window.resetLAViz=function(){var kp=state.currentKP;if(!kp)return;var v=vizTypes[kp.viz];v.params.forEach(function(p){setVizParamUI(p.id,p.default);});updateViz();};
  function enhance(ch){
    if(!ch||ch.courseId!=='la')return;var col=document.getElementById('vizCollapsible');if(!col)return;col.classList.remove('collapsed');var tabs=col.parentElement.querySelector('.viz-tabs');if(tabs)col.parentElement.insertBefore(col,tabs);var title=col.querySelector('.viz-collapse-title');if(title)title.lastChild.textContent=' 互动可视化实验';var hint=col.querySelector('.viz-canvas-hint');if(hint)hint.textContent='拖动发光控制点 · 滑块可精确调节 · 支持触屏';var bar=col.querySelector('.viz-custom-bar');if(bar){bar.className='la-viz-toolbar';bar.innerHTML='<span class="la-viz-chip">直接拖动</span><span class="la-viz-chip">即时公式</span><span class="la-viz-chip">几何含义</span><button type="button" class="la-viz-reset" onclick="resetLAViz()">恢复默认</button>';}setTimeout(function(){var cv=document.getElementById('vizCanvas');if(cv){VizEngine.init(cv);updateViz();bindCanvas();}},70);
  }
  var original=window.renderVizView;if(original){window.renderVizView=function(ch,kp){original(ch,kp);enhance(ch);};}
})();
