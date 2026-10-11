/* =========================================================
 * 算法库 · 查找算法
 * ========================================================= */
"use strict";
(function () {
  const LINEAR = `// 线性查找：从左到右逐个比对，找到目标即返回
const N = 15;
const A = Randomize.Array1D({ N: N, value: () => Math.floor(Math.random() * 30) });
const target = A[Math.floor(Math.random() * N)];
const t = new Array1DTracer('线性查找 Linear Search');
t.set(A);
const log = new LogTracer('步骤日志');
log.println('目标值: ' + target);
function linearSearch(t, A, x) {
  for (let i = 0; i < A.length; i++) {
    t.select(i);
    log.println('比较 A[' + i + ']=' + A[i] + ' 与目标 ' + x);
    if (A[i] === x) {
      t.mark(i, '命中');
      log.println('在位置 ' + i + ' 找到 ' + x);
      t.done(i);
      t.deselect(i);
      return i;
    }
    t.deselect(i);
  }
  log.println('未找到');
  return -1;
}
linearSearch(t, A, target);`;

  const BINARY = `// 二分查找：有序数组，每次把区间折半
const N = 15;
const A = Randomize.Array1D({ N: N, sorted: true, value: () => Math.floor(Math.random() * 80) + 5 });
const target = A[Math.floor(Math.random() * N)];
const t = new Array1DTracer('二分查找 Binary Search');
t.set(A);
const log = new LogTracer('步骤日志');
log.println('有序数组，目标值: ' + target);
function binarySearch(t, A, x) {
  let lo = 0;
  let hi = A.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    t.select(lo, hi);
    t.mark(mid, 'mid');
    log.println('区间 [' + lo + ',' + hi + '] mid=' + mid + ' A[mid]=' + A[mid]);
    if (A[mid] === x) {
      t.done(mid);
      t.deselect();
      return mid;
    }
    if (A[mid] < x) {
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
    t.unmark(mid);
    t.deselect();
  }
  return -1;
}
const pos = binarySearch(t, A, target);
log.println('结果位置: ' + pos);`;

  const INTERP = `// 插值查找：按值比例估算 mid，分布均匀时更快
const N = 15;
const A = Randomize.Array1D({ N: N, sorted: true, value: () => Math.floor(Math.random() * 80) + 5 });
const target = A[Math.floor(Math.random() * N)];
const t = new Array1DTracer('插值查找 Interpolation Search');
t.set(A);
const log = new LogTracer('步骤日志');
log.println('目标值: ' + target);
function interpSearch(t, A, x) {
  let lo = 0;
  let hi = A.length - 1;
  while (lo <= hi && x >= A[lo] && x <= A[hi]) {
    if (A[hi] === A[lo]) break;
    const mid = lo + Math.floor(((hi - lo) * (x - A[lo])) / (A[hi] - A[lo]));
    t.select(lo, hi);
    t.mark(mid, 'mid');
    log.println('区间 [' + lo + ',' + hi + '] 估算 mid=' + mid);
    if (A[mid] === x) {
      t.done(mid);
      t.deselect();
      return mid;
    }
    if (A[mid] < x) {
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
    t.unmark(mid);
    t.deselect();
  }
  return -1;
}
const pos = interpSearch(t, A, target);
log.println('结果位置: ' + pos);`;

  const R = [];
  const reg = function (name, code) {
    R.push({ cat: '查找算法', name: name, code: code });
  };
  reg('线性查找', LINEAR);
  reg('二分查找', BINARY);
  reg('插值查找', INTERP);
  window.__ALG_SEARCH = R;
})();
