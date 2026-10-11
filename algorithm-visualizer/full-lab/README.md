# 算法实验室（Algorithm Visualizer 复现版）

纯前端的算法可视化平台：左侧算法库、中间代码、右侧可视化画布。
支持播放 / 暂停 / 步进 / 后退 / 变速，全部在浏览器本地运行，无需服务器。

## 快速开始

直接用浏览器打开 `index.html` 即可（无需构建、无需联网）。

## 功能

### 1. 内置算法库（25 个）
排序 / 查找 / 图 / 树 / 动态规划五大类，选择左侧算法即自动运行可视化。

### 2. 自定义代码 + 多语言
点击「✎ 自定义代码」进入编辑模式，顶部可选编程语言：

| 语言 | 运行方式 |
|---|---|
| JavaScript | 原生执行 |
| C | 常用语法子集，自动转译后执行 |
| C++ | 常用语法子集（含 cout / vector），自动转译后执行 |
| Python | 常用语法子集，自动转译后执行 |

每种语言各有一份冒泡排序模板，切换语言时草稿自动保留。
C/C++/Python 不支持的结构会给出**带行号**的明确报错。

**支持的可视化对象（Tracer）**：
`Array1DTracer`（一维数组/柱状）、`Array2DTracer`（二维）、`ChartTracer`（折线）、
`GraphTracer / DirectedGraphTracer / UndirectedGraphTracer`（图）、`TreeTracer`（树）、
`RecursionTracer`（递归栈）、`LogTracer`（日志）。

常用方法：`set / patch / depatch / select / deselect / highlight / mark / done / println`。

**子集语法速查**
- Python：变量/列表、`a, b = b, a`、`if/elif/else`、`for range`、`for in`、`while`、`def`、`print`、`len/str/int/float/abs`、`and/or/not`、切片(读)、`append/pop/sort`、`//`、`**`；Tracer 自动加 `new`
- C：`int/float/double/char/bool/long` 变量与一维数组、`for/while/if`、函数（定义 `main` 会自动调用）、Tracer 用 `类型* t = new 类型(...)` 声明、`->` 调用
- C++：C 子集 + `cout <<`（自动拼接）+ `vector<T>` + `push_back/size`
- 均不支持：结构体/类/指针运算/STL(除 vector)/输入函数/try

## 目录结构

```
av-clone/
├── index.html          入口页面
├── css/styles.css      全部样式
├── js/
│   ├── core.js         核心引擎：逐行插桩录制 → 命令流
│   ├── player.js       播放器：回放/步进/检查点
│   ├── render-graph.js 图/树渲染
│   ├── langs.js        C/C++/Python → JS 子集转译器 + 四语言模板
│   ├── app.js          应用控制器（算法树/编辑器/工具栏）
│   └── algorithms/     内置算法库（25 个，纯数据）
└── test/
    ├── smoke.js        全算法冒烟测试（75 项）
    ├── custom.js       自定义示例录制/回放测试
    └── langs.js        多语言转译测试（34 项）
```

## 运行测试

```bash
node test/smoke.js   # 75 PASS
node test/custom.js
node test/langs.js   # 34 PASS
```

## 技术机制

算法是**真实代码**：运行时对源码逐行插桩（注入行号标记），把 Tracer 方法调用
录制为带行号的命令流；播放器回放命令流驱动渲染器，支持任意前后步进
（每 150 条命令设一个状态检查点）。C/C++/Python 代码先经 `langs.js`
逐行结构转译为 JS 子集，再走同一条插桩管线，保证可视化行为完全一致。
