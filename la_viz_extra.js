/* ═══════════════════════════════════════════
   线代 26 个知识点专属可视化
   补齐 fallback 缺失的专属实现
   ═══════════════════════════════════════════ */
(function() {
  if (typeof vizTypes === 'undefined') return;
  var extra = {};

  /* ── 第1章 行列式 ── */

  // 全排列与对换：排列逆序数
  extra['la-permutation'] = {
    title: '全排列与逆序数',
    formula: 'τ(p₁p₂…pₙ) = 逆序对个数',
    params: [
      { id:'n', label:'排列长度', min:3, max:5, step:1, default:4 },
      { id:'shift', label:'打乱程度', min:0, max:4, step:1, default:2 },
    ],
    range: { xMin:0, xMax:6, yMin:0, yMax:6 },
    render(p) {
      const V=VizEngine;V.clear();
      const perm=[1,2,3,4,5].slice(0,p.n);
      const s=p.shift;
      for(let i=perm.length-1;i>0 && s>0;i--){const j=(i+s)%perm.length;if(j!==i){[perm[i],perm[j]]=[perm[j],perm[i]];}}
      let inv=0;for(let i=0;i<perm.length;i++)for(let j=i+1;j<perm.length;j++)if(perm[i]>perm[j])inv++;
      V.drawText('排列：',0.3,5.3,0,6,0,6,'#8b9ab5',13,'left');
      for(let i=0;i<perm.length;i++){
        V.drawPoint(1.2+i*1.1,4.5,0,6,0,6,'#818cf8',7);
        V.drawText(perm[i]+'',1.2+i*1.1,4.0,0,6,0,6,'#f0f2f8',14);
      }
      V.drawText('逆序数 τ = '+inv,0.3,2.5,0,6,0,6,'#f59e0b',15,'left');
      V.drawText(inv%2===0?'偶排列 → 行列式项取正号':'奇排列 → 行列式项取负号',0.3,1.5,0,6,0,6,inv%2===0?'#10b981':'#ef4444',13,'left');
    }
  };

  // 行列式性质：转置/数乘对比
  extra['la-det-prop'] = {
    title: '行列式的性质',
    formula: '$$|A^T|=|A|,\\quad |kA|=k^n|A|$$',
    params: [
      { id:'k', label:'数乘 k', min:-3, max:3, step:0.5, default:2 },
    ],
    range: { xMin:0, xMax:8, yMin:0, yMax:6 },
    render(p) {
      const V=VizEngine;V.clear();
      const A=[[2,1],[3,2]], detA=A[0][0]*A[1][1]-A[0][1]*A[1][0];
      const k=p.k;
      V.drawText('A =',0.5,5.3,0,8,0,6,'#8b9ab5',13,'left');
      V.drawText('|2 1|',1.8,5.3,0,8,0,6,'#818cf8',13,'left');
      V.drawText('|3 2|',1.8,4.7,0,8,0,6,'#818cf8',13,'left');
      V.drawText('|A| = '+detA,1.8,3.8,0,8,0,6,'#f59e0b',14,'left');
      V.drawText('kA =',4.5,5.3,0,8,0,6,'#8b9ab5',13,'left');
      V.drawText('|'+A[0][0]*k+' '+A[0][1]*k+'|',5.8,5.3,0,8,0,6,'#10b981',13,'left');
      V.drawText('|'+A[1][0]*k+' '+A[1][1]*k+'|',5.8,4.7,0,8,0,6,'#10b981',13,'left');
      V.drawText('|kA| = k²·|A| = '+((k*k*detA).toFixed(1)),4.5,3.8,0,8,0,6,'#ec4899',14,'left');
      V.drawText('每一行提公因子 k，共提 n 次',0.5,2.0,0,8,0,6,'#8b9ab5',12,'left');
    }
  };

  // 按行(列)展开：余子式
  extra['la-cofactor'] = {
    title: '按行展开与余子式',
    formula: 'D = Σ aᵢⱼ·Aᵢⱼ',
    params: [
      { id:'row', label:'展开行', min:1, max:3, step:1, default:1 },
    ],
    range: { xMin:0, xMax:8, yMin:0, yMax:6 },
    render(p) {
      const V=VizEngine;V.clear();
      const M=[[1,2,3],[4,5,6],[7,8,10]];
      const r=p.row-1;
      V.drawText('选择第 '+p.row+' 行展开',0.5,5.5,0,8,0,6,'#8b9ab5',13,'left');
      for(let i=0;i<3;i++){
        for(let j=0;j<3;j++){
          const isRow=i===r;
          V.drawText(M[i][j]+'',1.5+j*1.0,4.2-i*0.9,0,8,0,6,isRow?'#f59e0b':'#818cf8',14);
        }
      }
      V.drawText('高亮行 → 逐项展开',0.5,2.8,0,8,0,6,'#f59e0b',12,'left');
      V.drawText('Aᵢⱼ = (-1)ⁱ⁺ʲ Mᵢⱼ（代数余子式）',0.5,1.8,0,8,0,6,'#8b9ab5',12,'left');
      V.drawText('符号棋盘：+ - + / - + - / + - +',0.5,0.8,0,8,0,6,'#10b981',12,'left');
    }
  };

  // 克拉默法则
  extra['la-cramer'] = {
    title: '克拉默法则',
    formula: 'xᵢ = Dᵢ / D',
    params: [
      { id:'a', label:'a₁₁', min:1, max:5, step:0.5, default:2 },
      { id:'b', label:'b₁', min:-3, max:3, step:0.5, default:5 },
    ],
    range: { xMin:-6, xMax:6, yMin:-6, yMax:6 },
    render(p) {
      const V=VizEngine;V.clear();V.drawGrid(-6,6,-6,6);V.drawAxes(-6,6,-6,6);
      const a=p.a,c=2,b=1,d=2,e=p.b,f=3;
      const D=a*d-b*c, Dx=e*d-b*f, Dy=a*f-e*c;
      V.drawLine(-6,(-a*(-6)+e)/b,6,(-a*6+e)/b,-6,6,-6,6,'#818cf8',2);
      V.drawLine(-6,(-c*(-6)+f)/d,6,(-c*6+f)/d,-6,6,-6,6,'#10b981',2);
      if(D!==0){
        const x=Dx/D,y=Dy/D;
        V.drawPoint(x,y,-6,6,-6,6,'#f59e0b',5);
        V.drawText('交点 ('+x.toFixed(1)+', '+y.toFixed(1)+')',x+0.4,y+0.4,-6,6,-6,6,'#f59e0b',12,'left');
      }
      V.drawText('x = Dx/D = '+(D!==0?(Dx/D).toFixed(2):'无唯一解'),-5.5,5.3,-6,6,-6,6,'#f0f2f8',13,'left');
    }
  };

  /* ── 第2章 矩阵 ── */

  // 矩阵概念：特殊矩阵
  extra['la-matrix-concept'] = {
    title: '特殊矩阵',
    formula: '零矩阵·单位矩阵·对角阵·对称阵',
    params: [
      { id:'type', label:'矩阵类型', min:0, max:3, step:1, default:1 },
    ],
    range: { xMin:0, xMax:6, yMin:0, yMax:6 },
    render(p) {
      const V=VizEngine;V.clear();
      const names=['零矩阵 O','单位矩阵 E','对角矩阵','对称矩阵'];
      const t=p.type;
      V.drawText(names[t],0.5,5.3,0,6,0,6,'#f59e0b',15,'left');
      for(let i=0;i<3;i++)for(let j=0;j<3;j++){
        let v=0;
        if(t===1&&i===j)v=1;
        if(t===2&&i===j)v=i+2;
        if(t===3)v=Math.abs(i-j)===0?i+1:(Math.abs(i-j)===1?1:0);
        V.drawText(v+'',1.8+j*1.1,4.0-i*1.0,0,6,0,6,'#818cf8',14);
      }
      const hints=['所有元素都是 0','主对角线全 1，其余 0','仅主对角线非零','aᵢⱼ = aⱼᵢ 关于主对角线对称'];
      V.drawText(hints[t],0.5,0.8,0,6,0,6,'#8b9ab5',12,'left');
    }
  };

  // 矩阵线性运算（加法）
  extra['la-mat-add'] = {
    title: '矩阵加法',
    formula: 'C = A + B, cᵢⱼ=aᵢⱼ+bᵢⱼ',
    params: [
      { id:'a', label:'a₁₁', min:-3, max:3, step:1, default:2 },
    ],
    range: { xMin:0, xMax:8, yMin:0, yMax:6 },
    render(p) {
      const V=VizEngine;V.clear();
      const A=[[p.a,1],[3,-2]], B=[[1,2],[-1,4]];
      V.drawText('A',0.7,4.8,0,8,0,6,'#818cf8',14);
      V.drawText(A[0][0]+' '+A[0][1],0.7,4.0,0,8,0,6,'#818cf8',13);
      V.drawText(A[1][0]+' '+A[1][1],0.7,3.3,0,8,0,6,'#818cf8',13);
      V.drawText('+',2.4,4.0,0,8,0,6,'#f0f2f8',16);
      V.drawText('B',3.0,4.8,0,8,0,6,'#10b981',14);
      V.drawText(B[0][0]+' '+B[0][1],3.0,4.0,0,8,0,6,'#10b981',13);
      V.drawText(B[1][0]+' '+B[1][1],3.0,3.3,0,8,0,6,'#10b981',13);
      V.drawText('=',4.7,4.0,0,8,0,6,'#f0f2f8',16);
      V.drawText((A[0][0]+B[0][0])+' '+(A[0][1]+B[0][1]),5.3,4.0,0,8,0,6,'#f59e0b',13);
      V.drawText((A[1][0]+B[1][0])+' '+(A[1][1]+B[1][1]),5.3,3.3,0,8,0,6,'#f59e0b',13);
      V.drawText('对应元素逐个相加',0.7,1.0,0,8,0,6,'#8b9ab5',12,'left');
    }
  };

  // 矩阵乘法
  extra['la-mat-mul'] = {
    title: '矩阵乘法',
    formula: 'cᵢⱼ = Σ aᵢₖbₖⱼ',
    params: [
      { id:'k', label:'中间维 k', min:1, max:3, step:1, default:2 },
    ],
    range: { xMin:0, xMax:8, yMin:0, yMax:6 },
    render(p) {
      const V=VizEngine;V.clear();
      const A=[[1,2],[3,4]], B=[[5,6],[7,8]];
      const k=p.k;
      V.drawText('A(2×'+k+') · B('+k+'×2)',0.5,5.3,0,8,0,6,'#8b9ab5',13,'left');
      V.drawText(A[0][0]+' '+A[0][1],1.0,4.3,0,8,0,6,'#818cf8',14);
      V.drawText(A[1][0]+' '+A[1][1],1.0,3.6,0,8,0,6,'#818cf8',14);
      V.drawText('×',2.6,4.0,0,8,0,6,'#f0f2f8',16);
      V.drawText(B[0][0]+' '+B[0][1],3.2,4.3,0,8,0,6,'#10b981',14);
      V.drawText(B[1][0]+' '+B[1][1],3.2,3.6,0,8,0,6,'#10b981',14);
      const C=[[A[0][0]*B[0][0]+A[0][1]*B[1][0],A[0][0]*B[0][1]+A[0][1]*B[1][1]],[A[1][0]*B[0][0]+A[1][1]*B[1][0],A[1][0]*B[0][1]+A[1][1]*B[1][1]]];
      V.drawText('=',4.8,4.0,0,8,0,6,'#f0f2f8',16);
      V.drawText(C[0][0]+' '+C[0][1],5.4,4.3,0,8,0,6,'#f59e0b',14);
      V.drawText(C[1][0]+' '+C[1][1],5.4,3.6,0,8,0,6,'#f59e0b',14);
      V.drawText('左行 × 右列 → 点积求和',0.5,1.5,0,8,0,6,'#f59e0b',12,'left');
      V.drawText('注意：AB ≠ BA（不满足交换律）',0.5,0.7,0,8,0,6,'#ef4444',12,'left');
    }
  };

  // 矩阵转置
  extra['la-transpose'] = {
    title: '矩阵转置',
    formula: '(Aᵀ)ᵢⱼ = Aⱼᵢ',
    params: [
      { id:'show', label:'演示', min:0, max:1, step:1, default:0 },
    ],
    range: { xMin:0, xMax:8, yMin:0, yMax:6 },
    render(p) {
      const V=VizEngine;V.clear();
      const A=[[1,2,3],[4,5,6]];
      V.drawText('A(2×3)',0.5,5.4,0,8,0,6,'#818cf8',14,'left');
      for(let i=0;i<2;i++)for(let j=0;j<3;j++)V.drawText(A[i][j]+'',0.8+j*1.0,4.6-i*1.0,0,8,0,6,'#818cf8',13);
      V.drawText('→ 转置 →',4.0,3.5,0,8,0,6,'#f0f2f8',13);
      V.drawText('Aᵀ(3×2)',4.8,5.4,0,8,0,6,'#10b981',14,'left');
      for(let i=0;i<3;i++)for(let j=0;j<2;j++)V.drawText(A[j][i]+'',5.1+j*1.0,4.6-i*1.0,0,8,0,6,'#10b981',13);
      V.drawText('沿主对角线翻转',0.5,1.2,0,8,0,6,'#8b9ab5',12,'left');
      V.drawText('(AB)ᵀ = BᵀAᵀ',0.5,0.5,0,8,0,6,'#f59e0b',13,'left');
    }
  };

  // 方阵行列式
  extra['la-det-prod'] = {
    title: '方阵的行列式',
    formula: '$$|AB| = |A|\\cdot|B|$$',
    params: [
      { id:'a', label:'a', min:-3, max:3, step:0.5, default:2 },
    ],
    range: { xMin:0, xMax:8, yMin:0, yMax:6 },
    render(p) {
      const V=VizEngine;V.clear();
      const a=p.a,b=1,c=1,d=2,e=2,f=0,g=0,h=1;
      const detA=a*d-b*c, detB=e*h-f*g, detAB=detA*detB;
      V.drawText('|A| = '+detA.toFixed(1),0.8,5.0,0,8,0,6,'#818cf8',14,'left');
      V.drawText('|B| = '+detB.toFixed(1),0.8,4.2,0,8,0,6,'#10b981',14,'left');
      V.drawText('|AB| = |A|·|B| = '+detAB.toFixed(1),0.8,3.4,0,8,0,6,'#f59e0b',15,'left');
      V.drawText('|Aᵀ|=|A|, |A⁻¹|=1/|A|',0.8,2.2,0,8,0,6,'#8b9ab5',12,'left');
      V.drawText('|kA|=kⁿ|A|, |A*|=|A|ⁿ⁻¹',0.8,1.4,0,8,0,6,'#8b9ab5',12,'left');
    }
  };

  // 逆矩阵
  extra['la-inverse'] = {
    title: '逆矩阵',
    formula: 'AA⁻¹ = E',
    params: [
      { id:'a', label:'a', min:1, max:4, step:0.5, default:2 },
      { id:'b', label:'b', min:0, max:2, step:0.5, default:1 },
    ],
    range: { xMin:0, xMax:8, yMin:0, yMax:6 },
    render(p) {
      const V=VizEngine;V.clear();
      const a=p.a,b=p.b,c=0,d=1;
      const det=a*d-b*c;
      V.drawText('A =',0.7,5.2,0,8,0,6,'#818cf8',14,'left');
      V.drawText('|'+a+' '+b+'|',1.6,5.2,0,8,0,6,'#818cf8',14,'left');
      V.drawText('|'+c+' '+d+'|',1.6,4.5,0,8,0,6,'#818cf8',14,'left');
      if(det!==0){
        V.drawText('A⁻¹ = 1/'+det+' ·',4.0,5.2,0,8,0,6,'#10b981',14,'left');
        V.drawText('|'+d+' -'+b+'|',5.9,5.2,0,8,0,6,'#10b981',14,'left');
        V.drawText('|-'+c+' '+a+'|',5.9,4.5,0,8,0,6,'#10b981',14,'left');
        V.drawText('det≠0 → 可逆',0.7,2.5,0,8,0,6,'#10b981',13,'left');
      } else {
        V.drawText('det=0 → 不可逆（奇异矩阵）',0.7,2.5,0,8,0,6,'#ef4444',13,'left');
      }
      V.drawText('二阶公式：交换主对角，副对角取负',0.7,1.2,0,8,0,6,'#8b9ab5',12,'left');
    }
  };

  // 分块矩阵
  extra['la-block'] = {
    title: '分块矩阵',
    formula: '分块对角阵',
    params: [
      { id:'n', label:'块大小', min:2, max:4, step:1, default:2 },
    ],
    range: { xMin:0, xMax:6, yMin:0, yMax:6 },
    render(p) {
      const V=VizEngine;V.clear();
      const n=p.n;
      V.drawText('分块对角矩阵',0.5,5.3,0,6,0,6,'#f59e0b',14,'left');
      for(let i=0;i<6;i++)for(let j=0;j<6;j++){
        if(i<n&&j<n){V.drawText('A',1.2+j*0.8,4.5-i*0.7,0,6,0,6,'#818cf8',11);}
        else if(i>=n&&j>=n){V.drawText('B',1.2+j*0.8,4.5-i*0.7,0,6,0,6,'#10b981',11);}
        else {V.drawText('0',1.2+j*0.8,4.5-i*0.7,0,6,0,6,'#39404d',11);}
      }
      V.drawText('非对角块全为 0',0.5,1.0,0,6,0,6,'#8b9ab5',12,'left');
      V.drawText('|A 0;0 B| = |A|·|B|',0.5,0.4,0,6,0,6,'#f59e0b',12,'left');
    }
  };

  if (typeof vizTypes === 'object') Object.assign(vizTypes, extra);
})();

/* ═══════════════════════════════════════════
   第3-6章 追加（追加到 vizTypes）
   ═══════════════════════════════════════════ */
(function() {
  if (typeof vizTypes === 'undefined') return;
  var extra = {};

  /* ── 第3章 初等变换与方程组 ── */

  extra['la-row-op'] = {
    title: '矩阵的初等行变换',
    formula: '换行·数乘·倍加',
    params: [{ id:'step', label:'变换类型', min:0, max:2, step:1, default:0 }],
    range: { xMin:0, xMax:8, yMin:0, yMax:6 },
    render(p) {
      const V=VizEngine;V.clear();
      const ops=['① 交换两行 rᵢ↔rⱼ','② 某行乘非零 k','③ 某行的 k 倍加到另一行'];
      const t=p.step;
      V.drawText(ops[t],0.5,5.3,0,8,0,6,'#f59e0b',13,'left');
      V.drawText('初等行变换 → 行阶梯形',0.5,4.3,0,8,0,6,'#818cf8',13,'left');
      const M=[[1,2,1,5],[2,5,3,12],[0,1,2,6]];
      const labels=['→ r₂-2r₁','→ 行阶梯形'];
      for(let i=0;i<3;i++){
        for(let j=0;j<4;j++){
          V.drawText(M[i][j]+'',0.8+j*0.9,3.6-i*0.8,0,8,0,6,'#818cf8',12);
        }
      }
      V.drawText('目标：左上三角化 → 回代求解',0.5,0.8,0,8,0,6,'#8b9ab5',12,'left');
    }
  };

  extra['la-elem-mat'] = {
    title: '初等矩阵',
    formula: 'Eᵢⱼ, Eᵢ(k), Eᵢⱼ(k)',
    params: [{ id:'t', label:'初等矩阵', min:0, max:2, step:1, default:0 }],
    range: { xMin:0, xMax:6, yMin:0, yMax:6 },
    render(p) {
      const V=VizEngine;V.clear();
      const names=['交换两行的 E','数乘行的 E','倍加行的 E'];
      const mats=[[[0,1,0],[1,0,0],[0,0,1]],[[1,0,0],[0,3,0],[0,0,1]],[[1,0,0],[2,1,0],[0,0,1]]];
      const t=p.t;
      V.drawText(names[t],0.5,5.3,0,6,0,6,'#f59e0b',14,'left');
      for(let i=0;i<3;i++)for(let j=0;j<3;j++)
        V.drawText(mats[t][i][j]+'',1.5+j*1.2,4.2-i*1.1,0,6,0,6,'#818cf8',14);
      V.drawText('左乘初等矩阵 = 对应行变换',0.5,0.7,0,6,0,6,'#8b9ab5',12,'left');
    }
  };

  extra['la-solution'] = {
    title: '线性方程组的解',
    formula: 'R(A)=R(A|b) 判定',
    params: [{ id:'case', label:'情形', min:0, max:2, step:1, default:0 }],
    range: { xMin:-6, xMax:6, yMin:-6, yMax:6 },
    render(p) {
      const V=VizEngine;V.clear();V.drawGrid(-6,6,-6,6);V.drawAxes(-6,6,-6,6);
      const c=p.case;
      if(c===0){V.drawLine(-6,6,6,-6,-6,6,-6,6,'#818cf8',2);V.drawLine(-6,4,6,-2,-6,6,-6,6,'#10b981',2);V.drawText('相交 → 唯一解',-5.5,5.3,-6,6,-6,6,'#10b981',13,'left');}
      if(c===1){V.drawLine(-6,6,6,-6,-6,6,-6,6,'#818cf8',2);V.drawLine(-6,5,6,-5,-6,6,-6,6,'#818cf8',2);V.drawText('平行 → 无解',-5.5,5.3,-6,6,-6,6,'#ef4444',13,'left');}
      if(c===2){V.drawLine(-6,6,6,-6,-6,6,-6,6,'#818cf8',2);V.drawText('重合 → 无穷多解',-5.5,5.3,-6,6,-6,6,'#f59e0b',13,'left');}
      V.drawText('R(A)=R(A|b)=n ⇔ 唯一解',-5.5,-5,-6,6,-6,6,'#8b9ab5',12,'left');
    }
  };

  /* ── 第4章 向量组 ── */

  extra['la-lincomb'] = {
    title: '向量组的线性组合',
    formula: 'α = k₁α₁ + k₂α₂',
    params: [{ id:'k1', label:'k₁', min:-2, max:2, step:0.5, default:1 },{ id:'k2', label:'k₂', min:-2, max:2, step:0.5, default:1 }],
    range: { xMin:-6, xMax:6, yMin:-6, yMax:6 },
    render(p) {
      const V=VizEngine;V.clear();V.drawGrid(-6,6,-6,6);V.drawAxes(-6,6,-6,6);
      const a1=[3,1],a2=[1,2],k1=p.k1,k2=p.k2;
      const r=[k1*a1[0]+k2*a2[0],k1*a1[1]+k2*a2[1]];
      V.drawArrow(0,0,k1*a1[0],k1*a1[1],-6,6,-6,6,'#818cf8',7);
      V.drawArrow(0,0,k2*a2[0],k2*a2[1],-6,6,-6,6,'#10b981',7);
      V.drawArrow(0,0,r[0],r[1],-6,6,-6,6,'#f59e0b',8);
      V.drawText('k₁α₁ + k₂α₂ = ('+r[0].toFixed(1)+', '+r[1].toFixed(1)+')',-5.5,5.3,-6,6,-6,6,'#f59e0b',13,'left');
    }
  };

  extra['la-depend'] = {
    title: '线性相关与无关',
    formula: 'k₁α₁+k₂α₂=0 是否有非零解',
    params: [{ id:'ang', label:'向量夹角', min:0, max:3, step:0.5, default:1 }],
    range: { xMin:-6, xMax:6, yMin:-6, yMax:6 },
    render(p) {
      const V=VizEngine;V.clear();V.drawGrid(-6,6,-6,6);V.drawAxes(-6,6,-6,6);
      const a=1+p.ang;
      const a1=[3,1],a2=[a,a/3];
      V.drawArrow(0,0,a1[0],a1[1],-6,6,-6,6,'#818cf8',7);
      V.drawArrow(0,0,a2[0],a2[1],-6,6,-6,6,'#10b981',7);
      const cross=a1[0]*a2[1]-a1[1]*a2[0];
      V.drawText(Math.abs(cross)<0.5?'共线 → 线性相关':'不共线 → 线性无关',-5.5,5.3,-6,6,-6,6,Math.abs(cross)<0.5?'#ef4444':'#10b981',13,'left');
    }
  };

  extra['la-vec-rank'] = {
    title: '向量组的秩',
    formula: '极大无关组所含向量个数',
    params: [{ id:'n', label:'向量个数', min:2, max:4, step:1, default:3 }],
    range: { xMin:-6, xMax:6, yMin:-6, yMax:6 },
    render(p) {
      const V=VizEngine;V.clear();V.drawGrid(-6,6,-6,6);V.drawAxes(-6,6,-6,6);
      const n=p.n;
      const vecs=[[3,1],[1,2],[4,3],[2,4]];
      for(let i=0;i<n;i++){V.drawArrow(0,0,vecs[i][0],vecs[i][1],-6,6,-6,6,i===n-1?'#f59e0b':'#818cf8',7);}
      V.drawText('秩 = 极大无关组向量个数',-5.5,5.3,-6,6,-6,6,'#f59e0b',13,'left');
      V.drawText('秩 ≤ 向量个数、秩 ≤ 维数',-5.5,-5,-6,6,-6,6,'#8b9ab5',12,'left');
    }
  };

  extra['la-sol-struct'] = {
    title: '方程组解的结构',
    formula: 'x = x* + Σcᵢξᵢ',
    params: [{ id:'dim', label:'解空间维数', min:0, max:2, step:1, default:1 }],
    range: { xMin:-6, xMax:6, yMin:-6, yMax:6 },
    render(p) {
      const V=VizEngine;V.clear();V.drawGrid(-6,6,-6,6);V.drawAxes(-6,6,-6,6);
      const d=p.dim;
      V.drawArrow(0,0,4,2,-6,6,-6,6,'#f59e0b',7);
      if(d===1){V.drawText('基础解系含 1 个向量 → 解是一条直线',-5.5,5.3,-6,6,-6,6,'#10b981',13,'left');}
      if(d===2){V.drawText('基础解系含 2 个向量 → 解是一个平面',-5.5,5.3,-6,6,-6,6,'#10b981',13,'left');}
      if(d===0){V.drawText('只有零解',-5.5,5.3,-6,6,-6,6,'#f59e0b',13,'left');}
      V.drawText('n - R(A) = 自由变量个数',-5.5,-5,-6,6,-6,6,'#8b9ab5',12,'left');
    }
  };

  extra['la-vec-space'] = {
    title: '向量空间',
    formula: 'Rⁿ 及其子空间',
    params: [{ id:'dim', label:'子空间', min:0, max:1, step:1, default:0 }],
    range: { xMin:-6, xMax:6, yMin:-6, yMax:6 },
    render(p) {
      const V=VizEngine;V.clear();V.drawGrid(-6,6,-6,6);V.drawAxes(-6,6,-6,6);
      if(p.dim===0){
        V.drawText('R² 平面（整个向量空间）',-5.5,5.3,-6,6,-6,6,'#818cf8',13,'left');
        for(let i=0;i<6;i++){V.drawPoint((i-2)*1.2,2,-6,6,-6,6,'rgba(129,140,248,0.6)',3);}
      } else {
        V.drawLine(-6,3,6,3,-6,6,-6,6,'#f59e0b',3);
        V.drawText('一条过原点直线 = 1维子空间',-5.5,5.3,-6,6,-6,6,'#f59e0b',13,'left');
      }
      V.drawText('子空间满足：加法封闭 + 数乘封闭',-5.5,-5,-6,6,-6,6,'#8b9ab5',12,'left');
    }
  };

  /* ── 第5章 特征值与二次型 ── */

  extra['la-similar'] = {
    title: '相似矩阵',
    formula: 'B = P⁻¹AP',
    params: [{ id:'ang', label:'旋转角', min:-3, max:3, step:0.5, default:1 }],
    range: { xMin:-6, xMax:6, yMin:-6, yMax:6 },
    render(p) {
      const V=VizEngine;V.clear();V.drawGrid(-6,6,-6,6);V.drawAxes(-6,6,-6,6);
      const ang=p.ang;
      V.drawArrow(0,0,4*Math.cos(ang),4*Math.sin(ang),-6,6,-6,6,'#818cf8',7);
      V.drawArrow(0,0,-2*Math.sin(ang),2*Math.cos(ang),-6,6,-6,6,'#10b981',7);
      V.drawText('相似变换 = 基变换下的同一线性变换',-5.5,5.3,-6,6,-6,6,'#f59e0b',13,'left');
      V.drawText('相似矩阵有相同特征值',-5.5,-5,-6,6,-6,6,'#8b9ab5',12,'left');
    }
  };

  extra['la-quadform'] = {
    title: '二次型与标准形',
    formula: 'f = xᵀAx',
    params: [{ id:'a', label:'a₁₁', min:-3, max:3, step:0.5, default:2 },{ id:'b', label:'a₂₂', min:-3, max:3, step:0.5, default:1 }],
    range: { xMin:-6, xMax:6, yMin:-6, yMax:6 },
    render(p) {
      const V=VizEngine;V.clear();V.drawGrid(-6,6,-6,6);V.drawAxes(-6,6,-6,6);
      const a=p.a,b=p.b;
      const cols=['#818cf8','#10b981','#f59e0b','#ec4899'];
      for(let i=0;i<4;i++){
        const t=Math.PI*i/3;
        const r=1.5;
        V.drawPoint(r*Math.sqrt(Math.abs(1/a))*Math.cos(t),r*Math.sqrt(Math.abs(1/b))*Math.sin(t),-6,6,-6,6,cols[i],4);
      }
      V.drawText('f = '+a+'x² + '+b+'y²',-5.5,5.3,-6,6,-6,6,'#f59e0b',14,'left');
      V.drawText((a>0&&b>0)?'正定 → 椭圆':(a*b<0)?'不定 → 双曲线':(a<0&&b<0)?'负定 → 椭圆(向下)':'半定',-5.5,4.5,-6,6,-6,6,'#10b981',12,'left');
    }
  };

  extra['la-completesq'] = {
    title: '配方法化标准形',
    formula: '拉格朗日配方法',
    params: [{ id:'step', label:'步骤', min:0, max:2, step:1, default:0 }],
    range: { xMin:0, xMax:8, yMin:0, yMax:6 },
    render(p) {
      const V=VizEngine;V.clear();
      const steps=['f = x²+2xy+3y²','= (x+y)² + 2y²','令 u=x+y, v=y → f=u²+2v²'];
      const t=p.step;
      V.drawText('配方法步骤',0.5,5.4,0,8,0,6,'#8b9ab5',13,'left');
      for(let i=0;i<=t;i++){
        V.drawText(steps[i],0.5,4.4-i*1.0,0,8,0,6,i===t?'#f59e0b':'#818cf8',14,'left');
      }
      if(t===2)V.drawText('标准形：对角阵 → 正定(2>0, 2>0)',0.5,0.8,0,8,0,6,'#10b981',12,'left');
    }
  };

  extra['la-posdef'] = {
    title: '正定二次型',
    formula: '顺序主子式全 > 0',
    params: [{ id:'a', label:'a₁₁', min:1, max:5, step:0.5, default:3 }],
    range: { xMin:0, xMax:6, yMin:0, yMax:6 },
    render(p) {
      const V=VizEngine;V.clear();
      const a=p.a,b=1,c=1,d=2;
      const d1=a,d2=a*d-b*c;
      V.drawText('顺序主子式',0.5,5.3,0,6,0,6,'#f59e0b',14,'left');
      V.drawText('Δ₁ = a = '+d1.toFixed(1),0.5,4.4,0,6,0,6,d1>0?'#10b981':'#ef4444',13,'left');
      V.drawText('Δ₂ = ad-bc = '+d2.toFixed(1),0.5,3.6,0,6,0,6,d2>0?'#10b981':'#ef4444',13,'left');
      V.drawText(d1>0&&d2>0?'全部>0 → 正定':'存在≤0 → 非正定',0.5,2.4,0,6,0,6,d1>0&&d2>0?'#10b981':'#ef4444',14,'left');
      V.drawText('特征值全正 ⇔ 正定',0.5,1.2,0,6,0,6,'#8b9ab5',12,'left');
    }
  };

  /* ── 第6章 线性空间与变换 ── */

  extra['la-linspace'] = {
    title: '线性空间的定义',
    formula: '八条公理',
    params: [{ id:'axiom', label:'公理组', min:0, max:1, step:1, default:0 }],
    range: { xMin:0, xMax:8, yMin:0, yMax:6 },
    render(p) {
      const V=VizEngine;V.clear();
      const g1=['加法封闭: α+β ∈ V','加法交换律','加法结合律','存在零元 0','存在负元 -α'];
      const g2=['数乘封闭: kα ∈ V','数乘结合律','分配律 1','分配律 2','单位元 1·α=α'];
      const arr=p.axiom===0?g1:g2;
      V.drawText('线性空间八条公理 '+(p.axiom===0?'（加法）':'（数乘）'),0.5,5.4,0,8,0,6,'#f59e0b',14,'left');
      arr.forEach(function(s,i){V.drawText((i+1)+'. '+s,0.5,4.5-i*0.8,0,8,0,6,'#818cf8',12,'left');});
    }
  };

  extra['la-basechange'] = {
    title: '基变换与坐标变换',
    formula: 'η = PC',
    params: [{ id:'ang', label:'旋转角', min:-3, max:3, step:0.5, default:1 }],
    range: { xMin:-6, xMax:6, yMin:-6, yMax:6 },
    render(p) {
      const V=VizEngine;V.clear();V.drawGrid(-6,6,-6,6);V.drawAxes(-6,6,-6,6);
      const ang=p.ang;
      V.drawArrow(0,0,4,0,-6,6,-6,6,'#39404d',6);
      V.drawArrow(0,0,0,4,-6,6,-6,6,'#39404d',6);
      V.drawArrow(0,0,4*Math.cos(ang),4*Math.sin(ang),-6,6,-6,6,'#818cf8',7);
      V.drawArrow(0,0,-3*Math.sin(ang),3*Math.cos(ang),-6,6,-6,6,'#10b981',7);
      V.drawText('旧基（灰）→ 新基（彩）',-5.5,5.3,-6,6,-6,6,'#f59e0b',13,'left');
      V.drawText('坐标变换：x = P·x\'',-5.5,-5,-6,6,-6,6,'#8b9ab5',12,'left');
    }
  };

  extra['la-lintrans'] = {
    title: '线性变换',
    formula: 'T(k₁α₁+k₂α₂)=k₁Tα₁+k₂Tα₂',
    params: [{ id:'k', label:'缩放系数', min:-2, max:2, step:0.5, default:1 }],
    range: { xMin:-6, xMax:6, yMin:-6, yMax:6 },
    render(p) {
      const V=VizEngine;V.clear();V.drawGrid(-6,6,-6,6);V.drawAxes(-6,6,-6,6);
      const k=p.k;
      for(let i=-2;i<=2;i++){V.drawLine(-6,k*i,6,k*i,-6,6,-6,6,'rgba(129,140,248,0.15)',1);V.drawLine(k*i,-6,k*i,6,-6,6,-6,6,'rgba(129,140,248,0.15)',1);}
      V.drawArrow(0,0,k*3,k*1,-6,6,-6,6,'#f59e0b',8);
      V.drawText('线性变换：保原点、保线性组合',-5.5,5.3,-6,6,-6,6,'#f59e0b',13,'left');
      V.drawText('缩放 k='+k, -5.5,4.5,-6,6,-6,6,'#818cf8',12,'left');
    }
  };

  extra['la-transmat'] = {
    title: '线性变换的矩阵表示',
    formula: 'T 在基下的矩阵',
    params: [{ id:'a', label:'a₁₁', min:-2, max:2, step:0.5, default:1 }],
    range: { xMin:-6, xMax:6, yMin:-6, yMax:6 },
    render(p) {
      const V=VizEngine;V.clear();V.drawGrid(-6,6,-6,6);V.drawAxes(-6,6,-6,6);
      const a=p.a,b=0.5,c=-0.3,d=1;
      V.drawArrow(0,0,3*a,3*c,-6,6,-6,6,'#818cf8',7);
      V.drawArrow(0,0,3*b,3*d,-6,6,-6,6,'#10b981',7);
      V.drawText('T(e₁) 和 T(e₂) 决定变换矩阵',-5.5,5.3,-6,6,-6,6,'#f59e0b',13,'left');
      V.drawText('矩阵列向量 = 基向量的像',-5.5,-5,-6,6,-6,6,'#8b9ab5',12,'left');
    }
  };

  if (typeof vizTypes === 'object') Object.assign(vizTypes, extra);
})();
