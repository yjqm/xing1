/* ═══════════════════════════════════════════
   知识点导学卡片轮播（Guide Carousel）
   每个知识点打开时，顶部自动轮播 4 张导学卡片：
   是什么 · 怎么理解 · 要记住 · 怎么学
   ═══════════════════════════════════════════ */
(function() {
  // ── 导学文案数据：key = viz id ──
  var GUIDE = {
    'la-det2': [
      ['🎯', '是什么', '二阶行列式 |a b; c d| 表示由两个向量围成的平行四边形面积（带符号）'],
      ['🖼️', '怎么理解', 'det = ad − bc，本质是两个向量的"叉积"，正负表示旋转方向'],
      ['📌', '要记住', '公式 ad − bc；几何意义 = 有向面积。|det|=0 时两向量共线'],
      ['✍️', '怎么学', '拖动上方圆点改变向量，观察平行四边形面积与 det 同步变化']
    ],
    'la-det3': [
      ['🎯', '是什么', '三阶行列式表示三个向量围成的平行六面体体积（带符号）'],
      ['🖼️', '怎么理解', '对角线法则（萨鲁斯法则）：主对角线相加，副对角线相减'],
      ['📌', '要记住', '按行展开定理：D = Σ a₁ⱼA₁ⱼ，可降阶计算'],
      ['✍️', '怎么学', '先按对角线法则手算一遍，再尝试按任意一行展开对比结果']
    ],
    'la-n-det': [
      ['🎯', '是什么', 'n 阶行列式是 n 个向量张成的 n 维"体积"（带符号）'],
      ['🖼️', '怎么理解', '从 2 阶面积、3 阶体积推广：行列式衡量 n 个向量的独立性'],
      ['📌', '要记住', '展开定理：按任一行/列展开可降阶；n! 项求和'],
      ['✍️', '怎么学', '先掌握 2、3 阶，再理解归纳式的定义方式']
    ],
    'la-det-prop': [
      ['🎯', '是什么', '行列式的运算性质，是计算与证明的基石'],
      ['🖼️', '怎么理解', '交换两行变号、一行乘 k 提公因子、行变换不改变行列式的几何本质'],
      ['📌', '要记住', '|kA|=kⁿ|A|、|AB|=|A||B|、|Aᵀ|=|A|、|A⁻¹|=1/|A|'],
      ['✍️', '怎么学', '用 2 阶行列式的"面积"意义逐一验证每条性质']
    ],
    'la-cofactor': [
      ['🎯', '是什么', '按行（列）展开：用低阶行列式计算高阶行列式'],
      ['🖼️', '怎么理解', '代数余子式 Aᵢⱼ = (−1)ⁱ⁺ʲ·Mᵢⱼ，符号按棋盘分布'],
      ['📌', '要记住', 'D = Σ aᵢⱼAᵢⱼ（对任意一行展开）'],
      ['✍️', '怎么学', '选 0 最多的一行展开，能大幅减少计算量']
    ],
    'la-cramer': [
      ['🎯', '是什么', '克拉默法则：用行列式解线性方程组'],
      ['🖼️', '怎么理解', 'xᵢ = Dᵢ/D，把系数矩阵第 i 列换成常数项列'],
      ['📌', '要记住', '仅当 D ≠ 0（唯一解）时适用'],
      ['✍️', '怎么学', '拖动直线观察交点，理解 D、Dᵢ 的几何来源']
    ],
    'la-mat-mul': [
      ['🎯', '是什么', '矩阵乘法是线性变换的复合'],
      ['🖼️', '怎么理解', 'C 的每个元素 = A 的一行与 B 的一列做点积'],
      ['📌', '要记住', '左行右列；不满足交换律 AB ≠ BA；满足结合律'],
      ['✍️', '怎么学', '先手算一个 2×2 例子，再想"先施加哪个变换"']
    ],
    'la-mat-add': [
      ['🎯', '是什么', '矩阵加法与数乘：对应元素逐个运算'],
      ['🖼️', '怎么理解', '与向量运算一致，要求同型矩阵才能相加'],
      ['📌', '要记住', '加法交换、结合；数乘满足分配律'],
      ['✍️', '怎么学', '把矩阵看成"一堆向量排排站"，运算就自然了']
    ],
    'la-transpose': [
      ['🎯', '是什么', '转置 Aᵀ：把矩阵沿主对角线翻转'],
      ['🖼️', '怎么理解', '行变列、列变行；几何上是镜像'],
      ['📌', '要记住', '(AB)ᵀ=BᵀAᵀ；|Aᵀ|=|A|；对称矩阵 Aᵀ=A'],
      ['✍️', '怎么学', '手写一个 2×3 矩阵翻转，再验证 (AB)ᵀ 公式']
    ],
    'la-inverse': [
      ['🎯', '是什么', '逆矩阵 A⁻¹ 是矩阵的"除法"，满足 AA⁻¹ = E'],
      ['🖼️', '怎么理解', 'A 把向量变过去，A⁻¹ 把它变回来'],
      ['📌', '要记住', 'det ≠ 0 才可逆；二阶公式：1/det·[d −b; −c a]'],
      ['✍️', '怎么学', '先判断可逆性，再用公式算一遍，最后乘回验证']
    ],
    'la-block': [
      ['🎯', '是什么', '分块矩阵：把大矩阵分成小块，按块运算'],
      ['🖼️', '怎么理解', '分块后矩阵运算规则照旧，像"缩小的矩阵"'],
      ['📌', '要记住', '分块对角阵的行列式 = 各块行列式之积'],
      ['✍️', '怎么学', '用分块技巧计算大型矩阵，先算对角分块']
    ],
    'la-det-prod': [
      ['🎯', '是什么', '方阵行列式与运算的相容性'],
      ['🖼️', '怎么理解', '|AB|=|A||B|：两次"缩放"的比例相乘'],
      ['📌', '要记住', '|Aᵀ|=|A|、|A⁻¹|=1/|A|、|kA|=kⁿ|A|'],
      ['✍️', '怎么学', '结合 2 阶"面积缩放"理解乘积公式']
    ],
    'la-row-op': [
      ['🎯', '是什么', '初等行变换：换行、数乘、倍加'],
      ['🖼️', '怎么理解', '三种变换对应三种"合法操作"，不改变方程组的解'],
      ['📌', '要记住', '目标 = 化为行阶梯形，主元列向下消元'],
      ['✍️', '怎么学', '跟随步骤动画，看每一行如何被逐步化简']
    ],
    'la-elem-mat': [
      ['🎯', '是什么', '初等矩阵：单位阵做一次初等变换得到'],
      ['🖼️', '怎么理解', '左乘初等矩阵 = 对该矩阵做对应行变换'],
      ['📌', '要记住', '三种初等矩阵与三种初等变换一一对应'],
      ['✍️', '怎么学', '把行变换"翻译"成乘矩阵，体会两者的等价性']
    ],
    'la-gauss': [
      ['🎯', '是什么', '高斯消元：用初等行变换解线性方程组'],
      ['🖼️', '怎么理解', '把增广矩阵化为行阶梯形，再回代求解'],
      ['📌', '要记住', '主元不能为 0（可换行）；消元顺序：逐列向下'],
      ['✍️', '怎么学', '用行变换工具，一步步把矩阵消成阶梯形']
    ],
    'la-solution': [
      ['🎯', '是什么', '线性方程组的解：唯一解 / 无解 / 无穷多解'],
      ['🖼️', '怎么理解', '几何上：两条直线相交、平行、重合'],
      ['📌', '要记住', 'R(A)=R(A|b) 有解；=n 唯一解，<n 无穷多解'],
      ['✍️', '怎么学', '切换三种情形，对比几何图形与秩的判定']
    ],
    'la-lincomb': [
      ['🎯', '是什么', '线性组合 k₁α₁+k₂α₂：用系数"合成"新向量'],
      ['🖼️', '怎么理解', '系数是力度，结果是两个向量的"合力"'],
      ['📌', '要记住', '结果 = 坐标分别乘系数再相加'],
      ['✍️', '怎么学', '拖动系数圆点，看合成向量如何变化']
    ],
    'la-depend': [
      ['🎯', '是什么', '线性相关/无关：一组向量是否"有冗余"'],
      ['🖼️', '怎么理解', '相关 = 共线（2 个）/共面（3 个）；无关 = 彼此独立'],
      ['📌', '要记住', 'k₁α₁+k₂α₂=0 有非零解 ⇔ 线性相关'],
      ['✍️', '怎么学', '拖动向量到共线位置，观察何时由无关变相关']
    ],
    'la-vec-rank': [
      ['🎯', '是什么', '向量组的秩 = 极大无关组所含向量个数'],
      ['🖼️', '怎么理解', '秩是"最核心"的向量个数，其余都是多余的'],
      ['📌', '要记住', '秩 ≤ 向量个数；秩 ≤ 维数；矩阵秩 = 行(列)向量组秩'],
      ['✍️', '怎么学', '逐步增加向量，看秩什么时候不再增大']
    ],
    'la-sol-struct': [
      ['🎯', '是什么', '齐次方程组解的结构：x = 特解 + 基础解系的组合'],
      ['🖼️', '怎么理解', '自由变量个数 = n − R(A)，对应基础解系向量个数'],
      ['📌', '要记住', '基础解系向量线性无关，且能表示所有解'],
      ['✍️', '怎么学', '把解空间想象成直线/平面，基础解系就是它的"坐标轴"']
    ],
    'la-vec-space': [
      ['🎯', '是什么', '向量空间：对加法和数乘封闭的集合'],
      ['🖼️', '怎么理解', '子空间必须过原点、对两种运算封闭'],
      ['📌', '要记住', '验证封闭性是判断子空间的核心'],
      ['✍️', '怎么学', '判断一条过原点的直线是不是子空间']
    ],
    'la-inner': [
      ['🎯', '是什么', '内积：衡量两个向量方向的"接近程度"'],
      ['🖼️', '怎么理解', 'a·b=|a||b|cosθ；垂直时内积为 0'],
      ['📌', '要记住', 'a ⊥ b ⇔ a·b = 0；||a||² = a·a'],
      ['✍️', '怎么学', '回想高中点乘，再推广到 n 维向量']
    ],
    'la-similar': [
      ['🎯', '是什么', '相似矩阵 B=P⁻¹AP：同一变换在不同基下的表示'],
      ['🖼️', '怎么理解', '相似 = 换了个坐标系看同一个线性变换'],
      ['📌', '要记住', '相似矩阵有相同特征值、行列式、迹'],
      ['✍️', '怎么学', '观察旋转矩阵，理解"换基不换变换"']
    ],
    'la-diag': [
      ['🎯', '是什么', '对角化：A = PΛP⁻¹，把矩阵变成对角阵'],
      ['🖼️', '怎么理解', '在特征向量基下，线性变换只是"各方向缩放"'],
      ['📌', '要记住', 'n 阶矩阵有 n 个线性无关特征向量 ⇔ 可对角化'],
      ['✍️', '怎么学', '先求特征值、特征向量，再组装 P 和 Λ']
    ],
    'la-eigen': [
      ['🎯', '是什么', '特征值 λ 与特征向量 ξ：Aξ = λξ'],
      ['🖼️', '怎么理解', '矩阵对特征方向只缩放、不旋转'],
      ['📌', '要记住', '解特征方程 |λI − A| = 0 求 λ'],
      ['✍️', '怎么学', '从"哪个方向不被扭弯"理解，再算特征多项式']
    ],
    'la-quadform': [
      ['🎯', '是什么', '二次型 f=xᵀAx：二次齐次函数'],
      ['🖼️', '怎么理解', '标准形 = 消去交叉项；几何是椭圆或双曲线'],
      ['📌', '要记住', '用正交变换 x=Py 化为标准形，系数为特征值'],
      ['✍️', '怎么学', '用配方法化简，拖动系数看椭圆如何变化']
    ],
    'la-completesq': [
      ['🎯', '是什么', '配方法（拉格朗日法）：把二次型化为标准形'],
      ['🖼️', '怎么理解', '把平方项配成完全平方，逐项消去交叉项'],
      ['📌', '要记住', '每次配方后，系数即为标准形系数'],
      ['✍️', '怎么学', '跟随步骤一步步配方，体会"换元"的本质']
    ],
    'la-posdef': [
      ['🎯', '是什么', '正定二次型/正定矩阵：f=xᵀAx 恒大于 0'],
      ['🖼️', '怎么理解', '几何上开口向上的椭圆，永不经过原点以下的点'],
      ['📌', '要记住', '顺序主子式全 > 0；特征值全正'],
      ['✍️', '怎么学', '调整系数，观察椭圆何时"塌陷"成非正定']
    ],
    'la-basechange': [
      ['🎯', '是什么', '基变换：换一组基描述同一个向量'],
      ['🖼️', '怎么理解', '坐标 = 向量在新基下的分量；换基坐标就变'],
      ['📌', '要记住', 'x = Px′，P 是新基到旧基的过渡矩阵'],
      ['✍️', '怎么学', '对比新旧基，看同一个点坐标如何变化']
    ],
    'la-lintrans': [
      ['🎯', '是什么', '线性变换：保持线性组合的映射'],
      ['🖼️', '怎么理解', '直线仍是直线、原点不动；T 与矩阵一一对应'],
      ['📌', '要记住', 'T(k₁α₁+k₂α₂) = k₁Tα₁ + k₂Tα₂'],
      ['✍️', '怎么学', '观察网格如何被拉伸/旋转/压缩']
    ],
    'la-transmat': [
      ['🎯', '是什么', '线性变换的矩阵：列 = 基向量的像'],
      ['🖼️', '怎么理解', '矩阵的第 j 列 = T(eⱼ)，决定了整个变换'],
      ['📌', '要记住', '找到基向量像，就找到了变换矩阵'],
      ['✍️', '怎么学', '拖 T(e₁) 的端点，看矩阵如何随之改变']
    ],
    'la-matrix-concept': [
      ['🎯', '是什么', '特殊矩阵：零矩阵、单位矩阵、对角阵、对称阵'],
      ['🖼️', '怎么理解', '各有特殊结构，运算时"走捷径"'],
      ['📌', '要记住', 'E 是乘法的"1"；对称阵 Aᵀ=A'],
      ['✍️', '怎么学', '切换四种类型，记住各自的结构特征']
    ]
  };

  // 默认导学卡片
  function defaultGuide(viz) {
    var kp = (typeof state !== 'undefined' && state.currentKP) ? state.currentKP : {};
    var courseId = (typeof state !== 'undefined' && state.currentCourse) ? state.currentCourse.id : '';
    var name = kp.name || viz.title || '本节知识点';
    var desc = kp.desc || '理解定义、条件与结论之间的关系';
    var understand = {
      gaoshu: '先读坐标轴和关键量，再观察参数变化如何改变图像与极限过程',
      prob: '把样本空间、事件和概率逐层对应，再用重复试验验证直觉',
      ds: '跟着状态变化逐步追踪数据的位置、连接关系与操作代价',
      python: '对照代码执行顺序，观察变量、对象和输出在每一步如何变化',
      clang: '对照代码执行顺序，重点观察变量、指针与内存状态的变化',
      cpp: '对照对象生命周期和调用关系，观察封装、继承与多态如何发生'
    }[courseId] || '先看输入、过程和结果的对应关系，再用交互验证自己的判断';
    var practice = (courseId === 'python' || courseId === 'clang' || courseId === 'cpp' || courseId === 'ds')
      ? '先预测下一步，再播放动画；最后修改示例并运行验证'
      : '先预测图形变化，再拖动参数；最后用例题检验是否真正理解';
    return [
      ['🎯', '是什么', '<strong>' + name + '</strong>：' + desc],
      ['🖼️', '怎么理解', understand],
      ['📌', '要记住', viz.formula || '记住定义、适用条件，以及结论在什么情况下成立'],
      ['✍️', '怎么学', practice]
    ];
  }

  // 渲染导学 HTML
  function renderGuideHTML(vizId, color) {
    var viz = vizTypes[vizId];
    if (!viz) return '';
    var cards = GUIDE[vizId] || defaultGuide(viz);
    var c = color || '#6366f1';
    var html = '';
    html += '<div class="guide-wrap" id="guideWrap" style="--gc:' + c + '">';
    html += '<div class="guide-track" id="guideTrack">';
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      html += '<div class="guide-card">' +
        '<span class="guide-icon">' + card[0] + '</span>' +
        '<div class="guide-content">' +
        '<span class="guide-tag">' + card[1] + '</span>' +
        '<div class="guide-text">' + card[2] + '</div>' +
        '</div>' +
        '<div class="guide-count">' + (i+1) + ' / ' + cards.length + '</div>' +
      '</div>';
    }
    html += '</div>';
    html += '<div class="guide-arrows">' +
      '<button class="guide-arrow" onclick="guideNav(-1)">‹</button>' +
      '<button class="guide-arrow" onclick="guideNav(1)">›</button>' +
    '</div>';
    html += '<div class="guide-dots" id="guideDots"></div>';
    html += '<button class="guide-close" onclick="closeGuide()">✕</button>';
    html += '<button class="guide-play" onclick="playGuide()">▶ 播放导学动画</button>';
    html += '</div>';
    return html;
  }

  // ═══ 导学动画（全屏弹窗，逐帧播放）═══
  var guideModal = null;
  var guideAnimTimer = null;
  var guideFrames = [];

  function buildFrames(kp) {
    var viz = vizTypes[kp.viz];
    if (!viz) return [];
    var cards = GUIDE[kp.viz] || defaultGuide(viz);
    var frames = [];
    // 帧 0：开场（标题 + 章节 + 小型可视化画布）
    frames.push({
      icon: cards[0] ? cards[0][0] : '📘',
      tag: '本知识点导学',
      title: kp.name,
      sub: '第' + (kp.chNum || kp.num || '?') + '章 · ' + (viz.title || ''),
      text: '',
      isIntro: true,
      vizKey: kp.viz
    });
    // 帧 1-4：是什么 / 怎么理解 / 要记住 / 怎么学
    for (var i = 0; i < cards.length; i++) {
      frames.push({
        icon: cards[i][0],
        tag: cards[i][1],
        title: '',
        sub: '',
        text: cards[i][2]
      });
    }
    return frames;
  }

  function showGuideFrame(idx) {
    if (!guideModal) return;
    var frames = guideModal.querySelectorAll('.gf');
    for (var i = 0; i < frames.length; i++) {
      frames[i].className = 'gf' + (i === idx ? ' active' : '');
    }
    // 帧内的打字机效果（文本逐字显示）
    var frame = frames[idx];
    if (frame) {
      var txtEl = frame.querySelector('.gf-text');
      var full = frame.getAttribute('data-text') || '';
      if (txtEl && full) {
        txtEl.textContent = '';
        var k = 0;
        var typeTimer = setInterval(function() {
          k += 2; // 每次 2 字符，动画快
          txtEl.textContent = full.slice(0, k);
          if (k >= full.length) clearInterval(typeTimer);
        }, 28);
      }
    }
  }

  window.playGuide = function() {
    var kp = state.currentKP;
    if (!kp) return;
    guideFrames = buildFrames(kp);
    if (guideFrames.length === 0) return;

    if (!document.getElementById('guideModal')) {
      guideModal = document.createElement('div');
      guideModal.id = 'guideModal';
      guideModal.className = 'guide-modal';
      guideModal.innerHTML =
        '<div class="gm-inner">' +
        '<div class="gm-stage" id="gmStage"></div>' +
        '<div class="gm-progress"><div class="gm-bar" id="gmBar"></div></div>' +
        '<div class="gm-controls"><button class="gm-skip" onclick="closeGuideModal()">跳过 ›</button></div>' +
        '</div>';
      document.body.appendChild(guideModal);
    } else {
      guideModal = document.getElementById('guideModal');
    }

    // 构建帧
    var stage = guideModal.querySelector('#gmStage');
    var html = '';
    for (var i = 0; i < guideFrames.length; i++) {
      var f = guideFrames[i];
      var cls = i === 0 ? 'gf active' : 'gf';
      if (f.isIntro) {
        html += '<div class="' + cls + ' gf-intro">' +
          '<div class="gf-icon-big">' + f.icon + '</div>' +
          '<div class="gf-tag">' + f.tag + '</div>' +
          '<div class="gf-title">' + f.title + '</div>' +
          '<div class="gf-sub">' + f.sub + '</div>' +
          '<div class="gf-canvas-wrap"><canvas id="gmIntroCanvas" width="220" height="110"></canvas></div>' +
          '</div>';
      } else {
        html += '<div class="' + cls + '" data-text="' + f.text + '">' +
          '<div class="gf-icon">' + f.icon + '</div>' +
          '<div class="gf-tag">' + f.tag + '</div>' +
          '<div class="gf-text">' + f.text + '</div>' +
          '</div>';
      }
    }
    stage.innerHTML = html;
    guideModal.style.display = 'flex';

    // 启动开场动画
    var introT0 = Date.now();
    if (window._introAnimTimer) cancelAnimationFrame(window._introAnimTimer);
    function loopIntro() {
      if (!document.getElementById('gmIntroCanvas')) return;
      drawIntroViz(f.vizKey, Date.now() - introT0);
      window._introAnimTimer = requestAnimationFrame(loopIntro);
    }
    requestAnimationFrame(loopIntro);

    // 逐帧播放
    if (guideAnimTimer) clearInterval(guideAnimTimer);
    var frameDur = 3000; // 每帧 3 秒
    var idx = 0;
    showGuideFrame(0);
    animateBar(frameDur * guideFrames.length);
    guideAnimTimer = setInterval(function() {
      idx++;
      if (idx >= guideFrames.length) {
        clearInterval(guideAnimTimer);
        if (window._introAnimTimer) cancelAnimationFrame(window._introAnimTimer);
        setTimeout(closeGuideModal, 600);
        return;
      }
      showGuideFrame(idx);
    }, frameDur);
  };

  window.closeGuideModal = function() {
    var m = document.getElementById('guideModal');
    if (m) { m.style.display = 'none'; }
    if (guideAnimTimer) { clearInterval(guideAnimTimer); guideAnimTimer = null; }
    if (window._introAnimTimer) { cancelAnimationFrame(window._introAnimTimer); window._introAnimTimer = null; }
    var bar = document.getElementById('gmBar');
    if (bar) bar.style.transition = 'none';
  };

  function animateBar(duration) {
    var bar = document.getElementById('gmBar');
    if (!bar) return;
    bar.style.transition = 'none';
    bar.style.width = '0%';
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        bar.style.transition = 'width ' + duration + 'ms linear';
        bar.style.width = '100%';
      });
    });
  }

  // ── 开场帧的微缩可视化（按 viz 类型画不同图形） ──
  function drawIntroViz(vizKey, t) {
    var canvas = document.getElementById('gmIntroCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    var v = (vizKey || '').toLowerCase();
    var cx = W / 2, cy = H / 2;

    function grid() {
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      for (var i = 1; i < 11; i++) {
        ctx.beginPath(); ctx.moveTo(i * 22, 0); ctx.lineTo(i * 22, H); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * 11); ctx.lineTo(W, i * 11); ctx.stroke();
      }
    }

    function vector(vx, vy, color, lw) {
      ctx.strokeStyle = color; ctx.lineWidth = lw || 2.5;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + vx, cy - vy); ctx.stroke();
      // 箭头
      var ang = Math.atan2(-vy, vx);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(cx + vx, cy - vy);
      ctx.lineTo(cx + vx - 7 * Math.cos(ang - 0.4), cy - vy + 7 * Math.sin(ang - 0.4));
      ctx.lineTo(cx + vx - 7 * Math.cos(ang + 0.4), cy - vy + 7 * Math.sin(ang + 0.4));
      ctx.closePath(); ctx.fill();
      // 端点圆
      ctx.beginPath(); ctx.arc(cx + vx, cy - vy, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#fff'; ctx.fill();
      ctx.beginPath(); ctx.arc(cx + vx, cy - vy, 2, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
    }

    if (v.indexOf('det') >= 0) {
      // 矩阵 + 平行四边形
      var cell = 22, cols = 3, rows = 2;
      var x0 = cx - cols * cell / 2, y0 = cy - rows * cell / 2;
      ctx.strokeStyle = 'rgba(165,180,252,0.5)';
      ctx.lineWidth = 1;
      for (var i = 0; i <= rows; i++) { ctx.beginPath(); ctx.moveTo(x0, y0 + i * cell); ctx.lineTo(x0 + cols * cell, y0 + i * cell); ctx.stroke(); }
      for (var j = 0; j <= cols; j++) { ctx.beginPath(); ctx.moveTo(x0 + j * cell, y0); ctx.lineTo(x0 + j * cell, y0 + rows * cell); ctx.stroke(); }
      ctx.fillStyle = '#a5b4fc';
      ctx.font = '11px Menlo, monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (var i = 0; i < rows; i++) for (var j = 0; j < cols; j++) {
        var val = Math.floor(Math.sin(t/700 + i*7 + j*3) * 4 + 4.5);
        ctx.fillText(val + '', x0 + j * cell + cell/2, y0 + i * cell + cell/2);
      }
      // 平行四边形
      var swing = Math.sin(t/600) * 12;
      var v1x = 38, v1y = 18 + swing;
      var v2x = 28, v2y = -22 + swing;
      ctx.strokeStyle = 'rgba(245,158,11,0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx + v1x, cy - v1y); ctx.lineTo(cx + v1x + v2x, cy - v1y - v2y); ctx.lineTo(cx + v2x, cy - v2y); ctx.closePath(); ctx.stroke();
      ctx.fillStyle = 'rgba(245,158,11,0.15)'; ctx.fill();
    } else if (v.indexOf('eigen') >= 0 || v.indexOf('diag') >= 0 || v.indexOf('quadform') >= 0 || v.indexOf('posdef') >= 0 || v.indexOf('similar') >= 0 || v.indexOf('lincomb') >= 0 || v.indexOf('lintrans') >= 0 || v.indexOf('transmat') >= 0 || v.indexOf('basechange') >= 0) {
      // 椭圆 + 特征方向
      grid();
      var pulse = 1 + Math.sin(t / 500) * 0.08;
      var rx = 70 * pulse, ry = 40 * pulse;
      ctx.strokeStyle = 'rgba(245,158,11,0.85)';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
      // 主轴
      var ang = Math.sin(t / 1500) * 0.4;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
      ctx.strokeStyle = 'rgba(99,102,241,0.7)'; ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(-rx, 0); ctx.lineTo(rx, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -ry); ctx.lineTo(0, ry); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      // 特征向量箭头
      vector(rx - 4, 0, '#a78bfa', 2);
      vector(0, -(ry - 4), '#10b981', 2);
    } else if (v.indexOf('rank') >= 0 || v.indexOf('vec') >= 0) {
      // 多个向量
      grid();
      var colors = ['#818cf8', '#10b981', '#f59e0b', '#ec4899'];
      for (var i = 0; i < 4; i++) {
        var ang = (i / 4) * Math.PI * 1.5 + t / 2000;
        var len = 50 + Math.sin(t / 600 + i) * 8;
        vector(Math.cos(ang) * len, Math.sin(ang) * len, colors[i], 2);
      }
    } else if (v.indexOf('gauss') >= 0 || v.indexOf('row-op') >= 0 || v.indexOf('elem') >= 0 || v.indexOf('solution') >= 0 || v.indexOf('cramer') >= 0) {
      // 阶梯形 / 直线
      ctx.strokeStyle = 'rgba(165,180,252,0.7)';
      ctx.lineWidth = 2;
      // 阶梯
      ctx.beginPath();
      ctx.moveTo(20, 28); ctx.lineTo(80, 28); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(20, 55); ctx.lineTo(130, 55); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(20, 82); ctx.lineTo(160, 82); ctx.stroke();
      // 主元点
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath(); ctx.arc(20, 28, 4, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(50, 55, 4, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(90, 82, 4, 0, Math.PI*2); ctx.fill();
    } else {
      // 通用：网格 + 两个向量
      grid();
      var swing = Math.sin(t / 700) * 8;
      vector(50, 20 + swing, '#a78bfa', 2.5);
      vector(45, -25 + swing, '#10b981', 2.5);
    }
  }

  // ── 轮播逻辑 ──
  var guideIdx = 0;
  var guideTimer = null;

  window.guideNav = function(dir) {
    var track = document.getElementById('guideTrack');
    if (!track) return;
    var total = track.children.length;
    guideIdx = (guideIdx + dir + total) % total;
    track.style.transform = 'translateX(-' + guideIdx * 100 + '%)';
    updateGuideDots(total);
    restartGuideTimer();
  };

  window.closeGuide = function() {
    var wrap = document.getElementById('guideWrap');
    if (wrap) wrap.style.display = 'none';
    if (guideTimer) { clearInterval(guideTimer); guideTimer = null; }
  };

  function updateGuideDots(total) {
    var dots = document.getElementById('guideDots');
    if (!dots) return;
    var html = '';
    for (var i = 0; i < total; i++) {
      html += '<span class="guide-dot' + (i === guideIdx ? ' active' : '') + '" onclick="guideGoTo(' + i + ')"></span>';
    }
    dots.innerHTML = html;
  }

  window.guideGoTo = function(i) {
    var track = document.getElementById('guideTrack');
    if (!track) return;
    guideIdx = i;
    track.style.transform = 'translateX(-' + i * 100 + '%)';
    updateGuideDots(track.children.length);
    restartGuideTimer();
  };

  function restartGuideTimer() {
    if (guideTimer) clearInterval(guideTimer);
    guideTimer = setInterval(function() { guideNav(1); }, 3500);
  }

  // ── 注入到 renderVizView ──
  function injectGuide() {
    var kp = state.currentKP;
    if (!kp) return;
    var viz = vizTypes[kp.viz];
    if (!viz) return;
    var header = document.querySelector('.viz-header');
    if (!header || document.querySelector('.guide-wrap')) return;
    var color = chapterColors[kp.chNum] || chapterColors[kp.num] || '#6366f1';
    var wrap = document.createElement('div');
    wrap.innerHTML = renderGuideHTML(kp.viz, color);
    var guideEl = wrap.firstChild;
    header.parentNode.insertBefore(guideEl, header.nextSibling);
    // 初始化圆点 + 启动自动轮播
    updateGuideDots(document.getElementById('guideTrack').children.length);
    restartGuideTimer();
    guideIdx = 0;
  }

  var origRenderVizView = window.renderVizView;
  if (origRenderVizView) {
    window.renderVizView = function(ch, kp) {
      origRenderVizView(ch, kp);
      setTimeout(injectGuide, 100);
    };
  }
})();
