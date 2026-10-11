/* =========================================================
 * 算法库 · 树与递归：二叉树遍历 / 汉诺塔 / 斐波那契
 * ========================================================= */
"use strict";
(function () {
  // 共享前导：15 节点完全二叉树（下标 0..14）
  const TREE_PRO = `const N = 15;
const nodes = [];
for (let i = 0; i < N; i++) nodes.push(i);
const parents = [];
parents[0] = -1;
for (let i = 1; i < N; i++) parents[i] = Math.floor((i - 1) / 2);
const log = new LogTracer('访问序列');
const order = [];
`;

  const PRE = TREE_PRO + `const t = new TreeTracer('二叉树 · 先序遍历 (根→左→右)');
t.set(nodes, parents);
function pre(i) {
  if (i >= N) return;
  order.push(nodes[i]);
  t.visit(i);
  log.println('访问节点 ' + nodes[i]);
  t.leave(i);
  pre(2 * i + 1);
  pre(2 * i + 2);
}
pre(0);
log.println('先序序列: ' + order.join(' → '));`;

  const IN = TREE_PRO + `const t = new TreeTracer('二叉树 · 中序遍历 (左→根→右)');
t.set(nodes, parents);
function ino(i) {
  if (i >= N) return;
  ino(2 * i + 1);
  order.push(nodes[i]);
  t.visit(i);
  log.println('访问节点 ' + nodes[i]);
  t.leave(i);
  ino(2 * i + 2);
}
ino(0);
log.println('中序序列: ' + order.join(' → '));`;

  const POST = TREE_PRO + `const t = new TreeTracer('二叉树 · 后序遍历 (左→右→根)');
t.set(nodes, parents);
function pos(i) {
  if (i >= N) return;
  pos(2 * i + 1);
  pos(2 * i + 2);
  order.push(nodes[i]);
  t.visit(i);
  log.println('访问节点 ' + nodes[i]);
  t.leave(i);
}
pos(0);
log.println('后序序列: ' + order.join(' → '));`;

  const LEVEL = TREE_PRO + `const t = new TreeTracer('二叉树 · 层序遍历 (队列)');
t.set(nodes, parents);
function level(i) {
  const q = [0];
  while (q.length > 0) {
    const u = q.shift();
    order.push(nodes[u]);
    t.visit(u);
    log.println('访问节点 ' + nodes[u]);
    t.leave(u);
    if (2 * u + 1 < N) q.push(2 * u + 1);
    if (2 * u + 2 < N) q.push(2 * u + 2);
  }
}
level(0);
log.println('层序序列: ' + order.join(' → '));`;

  const HANOI = `// 汉诺塔：递归调用树 + 移动步骤（4 个盘）
const t = new RecursionTracer('汉诺塔 Hanoi 调用树 (n=4)');
const log = new LogTracer('移动步骤');
function hanoi(n, from, to, via) {
  t.call(from + '→' + to + '  n=' + n);
  if (n === 1) {
    log.println('移动盘 1: ' + from + ' → ' + to);
    t.done();
    t.back();
    return;
  }
  hanoi(n - 1, from, via, to);
  log.println('移动盘 ' + n + ': ' + from + ' → ' + to);
  hanoi(n - 1, via, to, from);
  t.done();
  t.back();
}
hanoi(4, 'A', 'C', 'B');
log.println('共 15 步完成');`;

  const FIB = `// 斐波那契：指数级递归调用树
const t = new RecursionTracer('斐波那契 递归调用树');
const log = new LogTracer('计算结果');
function fib(n) {
  t.call('fib(' + n + ')');
  if (n <= 1) {
    log.println('fib(' + n + ') = ' + n);
    t.done();
    t.back();
    return n;
  }
  const a = fib(n - 1);
  const b = fib(n - 2);
  const r = a + b;
  log.println('fib(' + n + ') = ' + a + '+' + b + ' = ' + r);
  t.done();
  t.back();
  return r;
}
const r = fib(6);
t.result('fib(6) = ' + r);
log.println('最终结果: ' + r);`;

  const R = [];
  const reg = function (name, code, desc) {
    R.push({ cat: '树与递归', name: name, desc: desc, code: code });
  };
  reg('先序遍历', PRE, '根→左→右。递归进入左右子树，橙色=当前访问，绿=已完成。对照日志里的访问序列理解递归路径。');
  reg('中序遍历', IN, '左→根→右。二叉树有序遍历的基础（BST 下会得到升序）。');
  reg('后序遍历', POST, '左→右→根。先算完子树再处理根，常用于自底向上计算。');
  reg('层序遍历', LEVEL, '队列逐层扫描，展示"广度优先"在树上的样子。');
  reg('汉诺塔 Hanoi', HANOI, '调用树可视化 + 15 步搬运日志。节点=每次函数调用(实线=调用链)，返回时弹栈标绿。');
  reg('斐波那契 Fib', FIB, 'fib(6) 的指数级递归调用树，橙色=当前正在计算的调用，看它如何重复求解子问题。');
  window.__ALG_TREE = R;
})();
