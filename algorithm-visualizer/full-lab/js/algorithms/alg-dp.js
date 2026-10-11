/* =========================================================
 * 算法库 · 动态规划与回溯：N皇后 / LCS / 0-1背包
 * ========================================================= */
"use strict";
(function () {
  const NQUEEN = `// N 皇后 (N=4)：回溯逐行放置，冲突即撤销换列
const N = 4;
const board = [];
for (let r = 0; r < N; r++) {
  const row = [];
  for (let c = 0; c < N; c++) row.push(0);
  board.push(row);
}
const t = new Array2DTracer('N皇后回溯棋盘');
t.set(board);
const log = new LogTracer('回溯日志');
function canPlace(b, r, c) {
  for (let i = 0; i < r; i++) {
    if (b[i][c] === 1) return false;
    const d1 = c - (r - i);
    const d2 = c + (r - i);
    if (d1 >= 0 && b[i][d1] === 1) return false;
    if (d2 < N && b[i][d2] === 1) return false;
  }
  return true;
}
function solve(r) {
  if (r === N) {
    log.println('第 ' + N + ' 行放完，找到解！');
    return true;
  }
  for (let c = 0; c < N; c++) {
    t.select(r, c);
    if (canPlace(board, r, c)) {
      board[r][c] = 1;
      t.patch(r, c, 1);
      log.println('放置皇后 (' + r + ',' + c + ')');
      if (solve(r + 1)) {
        t.done(r, c);
        return true;
      }
      board[r][c] = 0;
      t.patch(r, c, 0);
      log.println('冲突回溯，移除 (' + r + ',' + c + ')');
    } else {
      log.println('(' + r + ',' + c + ') 冲突');
    }
    t.deselect(r, c);
  }
  return false;
}
const ok = solve(0);
log.println(ok ? '解法: 每行皇后位置见绿色格' : '无解');`;

  const LCS = `// 最长公共子序列 LCS：DP 填表 + 回溯找序列
const S = 'ABCBDAB';
const T = 'BDCABA';
const m = S.length;
const n = T.length;
const dp = [];
for (let i = 0; i <= m; i++) {
  const row = [];
  for (let j = 0; j <= n; j++) row.push(0);
  dp.push(row);
}
const t = new Array2DTracer('LCS 动态规划表');
t.set(dp);
const log = new LogTracer('填表与回溯');
log.println('S=' + S + '  T=' + T);
for (let i = 1; i <= m; i++) {
  for (let j = 1; j <= n; j++) {
    t.select(i, j);
    if (S[i - 1] === T[j - 1]) {
      dp[i][j] = dp[i - 1][j - 1] + 1;
      t.patch(i, j, dp[i][j]);
      log.println('S[' + (i - 1) + ']=T[' + (j - 1) + ']=' + S[i - 1] + ' → dp=' + dp[i][j]);
    } else {
      dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      t.patch(i, j, dp[i][j]);
    }
    t.depatch(i, j);
    t.deselect(i, j);
  }
}
log.println('最长公共子序列长度 = ' + dp[m][n]);
const lcs = [];
let i = m;
let j = n;
while (i > 0 && j > 0) {
  if (S[i - 1] === T[j - 1]) {
    lcs.push(S[i - 1]);
    t.done(i, j);
    log.println('回溯命中字符 ' + S[i - 1] + ' 于 (' + i + ',' + j + ')');
    i--;
    j--;
  } else if (dp[i - 1][j] >= dp[i][j - 1]) {
    i--;
  } else {
    j--;
  }
}
log.println('LCS = ' + lcs.reverse().join(''));`;

  const KNAPSACK = `// 0-1 背包：容量 7，4 件物品，DP 表 + 回溯方案
const wt = [1, 3, 4, 5];
const val = [1, 4, 5, 7];
const cap = 7;
const n = wt.length;
const dp = [];
for (let i = 0; i <= n; i++) {
  const row = [];
  for (let w = 0; w <= cap; w++) row.push(0);
  dp.push(row);
}
const t = new Array2DTracer('0-1背包 DP 表');
t.set(dp);
const log = new LogTracer('填表与回溯');
log.println('物品(重量,价值): (1,1) (3,4) (4,5) (5,7)，容量 ' + cap);
for (let i = 1; i <= n; i++) {
  for (let w = 0; w <= cap; w++) {
    t.select(i, w);
    if (w >= wt[i - 1]) {
      const take = val[i - 1] + dp[i - 1][w - wt[i - 1]];
      dp[i][w] = Math.max(dp[i - 1][w], take);
    } else {
      dp[i][w] = dp[i - 1][w];
    }
    t.patch(i, w, dp[i][w]);
    t.depatch(i, w);
    t.deselect(i, w);
  }
}
log.println('最大价值 = ' + dp[n][cap]);
const chosen = [];
let i = n;
let w = cap;
while (i > 0 && w > 0) {
  if (dp[i][w] !== dp[i - 1][w]) {
    chosen.push(i);
    t.done(i, w);
    log.println('选物品 ' + i + ' (重量 ' + wt[i - 1] + '，价值 ' + val[i - 1] + ')');
    w -= wt[i - 1];
    i--;
  } else {
    i--;
  }
}
log.println('选择物品: ' + chosen.reverse().join(', '));`;

  const R = [];
  const reg = function (name, code, desc) {
    R.push({ cat: '动态规划 / 回溯', name: name, desc: desc, code: code });
  };
  reg('N皇后 回溯', NQUEEN, '4×4 棋盘。红色=正在试探的格子，值 1 = 已放皇后，日志记录"放置→冲突→回溯清除"全过程。');
  reg('最长公共子序列 LCS', LCS, '两串 ABCBDAB 与 BDCABA。DP 表逐格填充(橙/红=当前读写)，最后沿对角线回溯出子序列(绿格)。');
  reg('0-1背包', KNAPSACK, '容量 7、4 件物品的经典背包。逐物品逐容量填表，绿格=回溯确认选入的物品。');
  window.__ALG_DP = R;
})();
