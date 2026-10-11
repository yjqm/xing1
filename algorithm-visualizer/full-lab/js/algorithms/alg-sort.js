/* =========================================================
 * 算法库 · 排序算法（每个算法 = 一段完整可运行代码）
 * ========================================================= */
"use strict";
(function () {
  const BUBBLE = `// 冒泡排序：相邻逆序对交换，每轮把最大值"冒"到末尾
const N = 16;
const A = Randomize.Array1D({ N: N, value: () => Math.floor(Math.random() * 60) + 3 });
const t = new Array1DTracer('冒泡排序 Bubble Sort');
const chart = new ChartTracer('元素值波动');
t.set(A);
chart.set(A);
function bubbleSort(t, A) {
  const n = A.length;
  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    for (let j = 0; j < n - 1 - i; j++) {
      t.select(j, j + 1);
      if (A[j] > A[j + 1]) {
        const x = A[j];
        A[j] = A[j + 1];
        A[j + 1] = x;
        t.patch(j, A[j]);
        t.patch(j + 1, A[j + 1]);
        chart.patch(j, A[j]);
        chart.patch(j + 1, A[j + 1]);
        t.depatch(j);
        t.depatch(j + 1);
        swapped = true;
      }
      t.deselect(j, j + 1);
    }
    t.done(n - 1 - i);
    if (!swapped) break;
  }
  t.done();
}
bubbleSort(t, A);`;

  const SELECT = `// 选择排序：每轮从未排序区选出最小值放到前面
const N = 16;
const A = Randomize.Array1D({ N: N, value: () => Math.floor(Math.random() * 60) + 3 });
const t = new Array1DTracer('选择排序 Selection Sort');
t.set(A);
function selectionSort(t, A) {
  const n = A.length;
  for (let i = 0; i < n - 1; i++) {
    let mn = i;
    t.mark(i, 'min');
    for (let j = i + 1; j < n; j++) {
      t.select(j);
      if (A[j] < A[mn]) {
        if (mn !== i) t.unmark(mn);
        mn = j;
        t.mark(mn, 'min');
      }
      t.deselect(j);
    }
    if (mn !== i) {
      const x = A[i];
      A[i] = A[mn];
      A[mn] = x;
      t.patch(i, A[i]);
      t.patch(mn, A[mn]);
      t.depatch(i);
      t.depatch(mn);
    }
    t.unmark(mn);
    t.done(i);
  }
  t.done(n - 1);
}
selectionSort(t, A);`;

  const INSERT = `// 插入排序：把当前元素插入到左侧已排序区正确位置
const N = 16;
const A = Randomize.Array1D({ N: N, value: () => Math.floor(Math.random() * 60) + 3 });
const t = new Array1DTracer('插入排序 Insertion Sort');
t.set(A);
function insertionSort(t, A) {
  const n = A.length;
  for (let i = 1; i < n; i++) {
    const key = A[i];
    let j = i - 1;
    t.mark(i, 'key');
    while (j >= 0 && A[j] > key) {
      t.select(j, j + 1);
      A[j + 1] = A[j];
      t.patch(j + 1, A[j + 1]);
      t.depatch(j + 1);
      t.deselect(j, j + 1);
      j--;
    }
    A[j + 1] = key;
    t.patch(j + 1, key);
    t.depatch(j + 1);
    t.unmark(i);
  }
  t.done();
}
insertionSort(t, A);`;

  const SHELL = `// 希尔排序：按间隔分组做插入排序，间隔逐步减半
const N = 18;
const A = Randomize.Array1D({ N: N, value: () => Math.floor(Math.random() * 70) + 3 });
const t = new Array1DTracer('希尔排序 Shell Sort');
t.set(A);
function shellSort(t, A) {
  const n = A.length;
  let gap = Math.floor(n / 2);
  while (gap > 0) {
    for (let i = gap; i < n; i++) {
      const key = A[i];
      let j = i;
      t.select(j);
      while (j >= gap && A[j - gap] > key) {
        t.select(j - gap);
        A[j] = A[j - gap];
        t.patch(j, A[j]);
        t.depatch(j);
        t.deselect(j - gap);
        j -= gap;
        t.select(j);
      }
      A[j] = key;
      t.patch(j, key);
      t.depatch(j);
      t.deselect(i);
      t.deselect(j);
    }
    gap = Math.floor(gap / 2);
  }
  t.done();
}
shellSort(t, A);`;

  const QUICK = `// 快速排序：Lomuto 分区，递归处理左右两侧
const N = 16;
const A = Randomize.Array1D({ N: N, value: () => Math.floor(Math.random() * 70) + 3 });
const t = new Array1DTracer('快速排序 Quick Sort');
t.set(A);
function quickSort(t, A, lo, hi) {
  if (lo >= hi) return;
  const pv = A[hi];
  t.mark(hi, 'pivot');
  let i = lo - 1;
  for (let j = lo; j < hi; j++) {
    t.select(j);
    if (A[j] < pv) {
      i++;
      t.select(i);
      const x = A[i];
      A[i] = A[j];
      A[j] = x;
      t.patch(i, A[i]);
      t.patch(j, A[j]);
      t.depatch(i);
      t.depatch(j);
      t.deselect(i);
    }
    t.deselect(j);
  }
  const y = A[i + 1];
  A[i + 1] = A[hi];
  A[hi] = y;
  t.patch(i + 1, A[i + 1]);
  t.patch(hi, A[hi]);
  t.depatch(i + 1);
  t.depatch(hi);
  t.unmark(hi);
  t.done(i + 1);
  quickSort(t, A, lo, i);
  quickSort(t, A, i + 2, hi);
}
quickSort(t, A, 0, A.length - 1);
t.done();`;

  const MERGE = `// 归并排序：分治合并，把两段有序区间线性归并
const N = 16;
const A = Randomize.Array1D({ N: N, value: () => Math.floor(Math.random() * 70) + 3 });
const t = new Array1DTracer('归并排序 Merge Sort');
t.set(A);
function mergeSort(t, A, L, R) {
  if (L >= R) return;
  const M = Math.floor((L + R) / 2);
  mergeSort(t, A, L, M);
  mergeSort(t, A, M + 1, R);
  const B = [];
  let i = L;
  let j = M + 1;
  while (i <= M && j <= R) {
    t.select(i);
    t.select(j);
    if (A[i] <= A[j]) {
      B.push(A[i]);
      i++;
    } else {
      B.push(A[j]);
      j++;
    }
    t.deselect(i - 1);
    t.deselect(j - 1);
  }
  while (i <= M) {
    B.push(A[i]);
    i++;
  }
  while (j <= R) {
    B.push(A[j]);
    j++;
  }
  for (let k = L; k <= R; k++) {
    A[k] = B[k - L];
    t.patch(k, A[k]);
    t.depatch(k);
  }
}
mergeSort(t, A, 0, A.length - 1);
t.done();`;

  const HEAP = `// 堆排序：建大顶堆后反复把堆顶换到末尾并下沉
const N = 16;
const A = Randomize.Array1D({ N: N, value: () => Math.floor(Math.random() * 70) + 3 });
const t = new Array1DTracer('堆排序 Heap Sort');
t.set(A);
function siftDown(t, A, n, i) {
  while (true) {
    let mx = i;
    const l = 2 * i + 1;
    const r = 2 * i + 2;
    if (l < n && A[l] > A[mx]) mx = l;
    if (r < n && A[r] > A[mx]) mx = r;
    if (mx === i) break;
    t.select(i);
    t.select(mx);
    const x = A[i];
    A[i] = A[mx];
    A[mx] = x;
    t.patch(i, A[i]);
    t.patch(mx, A[mx]);
    t.depatch(i);
    t.depatch(mx);
    t.deselect(i);
    t.deselect(mx);
    i = mx;
  }
}
function heapSort(t, A) {
  const n = A.length;
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) siftDown(t, A, n, i);
  for (let e = n - 1; e > 0; e--) {
    t.select(0);
    t.select(e);
    const x = A[0];
    A[0] = A[e];
    A[e] = x;
    t.patch(0, A[0]);
    t.patch(e, A[e]);
    t.depatch(0);
    t.depatch(e);
    t.deselect(0);
    t.deselect(e);
    t.done(e);
    siftDown(t, A, e, 0);
  }
  t.done(0);
}
heapSort(t, A);`;

  const R = [];
  const reg = function (name, code) {
    R.push({ cat: '排序算法', name: name, code: code });
  };
  reg('冒泡排序', BUBBLE);
  reg('选择排序', SELECT);
  reg('插入排序', INSERT);
  reg('希尔排序', SHELL);
  reg('快速排序', QUICK);
  reg('归并排序', MERGE);
  reg('堆排序', HEAP);
  window.__ALG_SORT = R;
})();
