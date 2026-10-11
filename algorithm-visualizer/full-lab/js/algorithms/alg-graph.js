/* =========================================================
 * 算法库 · 图算法（一）：BFS / DFS / Dijkstra
 * ========================================================= */
"use strict";
(function () {
  // 固定无向图（BFS / DFS 共用）
  const GA = [[0, 1], [0, 3], [1, 2], [1, 4], [2, 5], [3, 6], [4, 7], [6, 7], [2, 4], [5, 6]];
  // 固定带权图（Dijkstra 共用）
  const GW = [[0, 1, 4], [0, 6, 8], [1, 2, 8], [1, 6, 11], [2, 3, 7], [2, 5, 4], [3, 4, 9], [3, 5, 14], [4, 5, 10], [6, 5, 1], [6, 4, 2]];
  const NODE_STR = 'ABCDEFGH';

  const BFS = `// BFS 广度优先搜索：用队列逐层向外扩展
const nodes = [0, 1, 2, 3, 4, 5, 6, 7];
const edges = [[0,1],[0,3],[1,2],[1,4],[2,5],[3,6],[4,7],[6,7],[2,4],[5,6]];
const t = new UndirectedGraphTracer('BFS 广度优先搜索');
t.set(nodes, edges);
const log = new LogTracer('队列日志');
function buildAdj(edges, n) {
  const adj = [];
  for (let i = 0; i < n; i++) adj.push([]);
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    adj[e[0]].push(e[1]);
    adj[e[1]].push(e[0]);
  }
  return adj;
}
function bfs(t, adj, start) {
  const n = adj.length;
  const seen = new Array(n).fill(false);
  const dist = new Array(n).fill(-1);
  const q = [start];
  seen[start] = true;
  dist[start] = 0;
  t.visit(start);
  log.println('起点 ' + start + ' 入队 (距离 0)');
  while (q.length > 0) {
    const u = q.shift();
    log.println('→ 出队访问 ' + u);
    const nbrs = adj[u].slice();
    for (let k = 0; k < nbrs.length; k++) {
      const v = nbrs[k];
      if (!seen[v]) {
        seen[v] = true;
        dist[v] = dist[u] + 1;
        t.visit(v);
        t.selectEdge(u, v);
        log.println('  从 ' + u + ' 发现 ' + v + ' (距离 ' + dist[v] + ') 入队');
        t.deselectEdge(u, v);
        q.push(v);
      }
    }
    t.leave(u);
  }
  log.println('遍历完成，各点距离: ' + dist.join(','));
}
bfs(t, buildAdj(edges, nodes.length), 0);`;

  const DFS = `// DFS 深度优先搜索：递归深入，回溯时标绿
const nodes = [0, 1, 2, 3, 4, 5, 6, 7];
const edges = [[0,1],[0,3],[1,2],[1,4],[2,5],[3,6],[4,7],[6,7],[2,4],[5,6]];
const t = new UndirectedGraphTracer('DFS 深度优先搜索');
t.set(nodes, edges);
const log = new LogTracer('递归日志');
function buildAdj(edges, n) {
  const adj = [];
  for (let i = 0; i < n; i++) adj.push([]);
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    adj[e[0]].push(e[1]);
    adj[e[1]].push(e[0]);
  }
  return adj;
}
function dfs(t, adj, u, seen) {
  seen[u] = true;
  t.visit(u);
  log.println('进入节点 ' + u);
  const nbrs = adj[u].slice();
  for (let k = 0; k < nbrs.length; k++) {
    const v = nbrs[k];
    if (!seen[v]) {
      t.selectEdge(u, v);
      log.println('  → 深入 ' + v);
      dfs(t, adj, v, seen);
      t.deselectEdge(u, v);
    }
  }
  t.leave(u);
  log.println('回溯离开 ' + u);
}
const seen = new Array(edges.length).fill(false);
dfs(t, buildAdj(edges, nodes.length), 0, seen);
log.println('遍历完成');`;

  const DIJKSTRA = `// Dijkstra 单源最短路：贪心选最小距离点并松弛
const nodes = [0, 1, 2, 3, 4, 5, 6];
const edges = [[0,1,4],[0,6,8],[1,2,8],[1,6,11],[2,3,7],[2,5,4],[3,4,9],[3,5,14],[4,5,10],[6,5,1],[6,4,2]];
const t = new UndirectedGraphTracer('Dijkstra 最短路径 (起点0)');
t.set(nodes, edges);
const log = new LogTracer('松弛日志');
function buildAdjW(edges, n) {
  const adj = [];
  for (let i = 0; i < n; i++) adj.push([]);
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    adj[e[0]].push(e);
    adj[e[1]].push(e);
  }
  return adj;
}
function dijkstra(t, adj, n, src) {
  const INF = Infinity;
  const dist = new Array(n).fill(INF);
  const done = new Array(n).fill(false);
  const parent = new Array(n).fill(-1);
  dist[src] = 0;
  t.visit(src);
  log.println('起点 ' + src + '，dist=0');
  for (let cnt = 0; cnt < n; cnt++) {
    let u = -1;
    let best = INF;
    for (let i = 0; i < n; i++) {
      if (!done[i] && dist[i] < best) {
        best = dist[i];
        u = i;
      }
    }
    if (u < 0) break;
    done[u] = true;
    t.visit(u);
    if (parent[u] >= 0) t.doneEdge(parent[u], u);
    log.println('选中 ' + u + ' (dist=' + dist[u] + ') 最短距离确定');
    const nbrs = adj[u].slice();
    for (let k = 0; k < nbrs.length; k++) {
      const e = nbrs[k];
      const v = e[0] === u ? e[1] : e[0];
      const w = e[2];
      if (!done[v] && dist[u] + w < dist[v]) {
        t.selectEdge(u, v);
        log.println('  松弛 ' + v + ': ' + dist[v] + ' → ' + (dist[u] + w));
        dist[v] = dist[u] + w;
        parent[v] = u;
        t.deselectEdge(u, v);
      }
    }
    t.leave(u);
  }
  log.println('最终距离: ' + dist.join(','));
}
dijkstra(t, buildAdjW(edges, nodes.length), nodes.length, 0);`;

  // 辅助：edges -> adj（带权）
  const R = [];
  const reg = function (name, code, desc) {
    R.push({ cat: '图算法', name: name, desc: desc, code: code });
  };
  reg('广度优先搜索 BFS', BFS, '固定 8 节点无向图。队列逐层访问，橙色=在队列中，绿色=处理完毕，日志同步展示队列动作与分层距离。');
  reg('深度优先搜索 DFS', DFS, '同一张 8 节点无向图。递归深入优先，日志展示调用/回溯轨迹，绿色节点表示已全部探索完毕。');
  reg('Dijkstra 最短路径', DIJKSTRA, '经典带权图(边权=1..14)，起点 0。每轮贪心选中 dist 最小的未确定点（橙色），对其出边做松弛，绿边 = 已确定的最短路径树。');
  window.__ALG_GRAPH = R;
})();
