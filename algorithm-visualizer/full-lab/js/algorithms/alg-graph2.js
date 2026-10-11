/* =========================================================
 * 算法库 · 图算法（二）：Prim / Kruskal / 拓扑排序
 * ========================================================= */
"use strict";
(function () {
  const GW = [[0, 1, 4], [0, 6, 8], [1, 2, 8], [1, 6, 11], [2, 3, 7], [2, 5, 4], [3, 4, 9], [3, 5, 14], [4, 5, 10], [6, 5, 1], [6, 4, 2]];

  const PRIM = `// Prim 最小生成树：从起点向外扩展，每次加入最小割边
const nodes = [0, 1, 2, 3, 4, 5, 6];
const edges = [[0,1,4],[0,6,8],[1,2,8],[1,6,11],[2,3,7],[2,5,4],[3,4,9],[3,5,14],[4,5,10],[6,5,1],[6,4,2]];
const t = new UndirectedGraphTracer('Prim 最小生成树 (起点0)');
t.set(nodes, edges);
const log = new LogTracer('扩展日志');
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
function prim(t, adj, n) {
  const INF = Infinity;
  const inTree = new Array(n).fill(false);
  const key = new Array(n).fill(INF);
  const parent = new Array(n).fill(-1);
  key[0] = 0;
  for (let cnt = 0; cnt < n; cnt++) {
    let u = -1;
    let best = INF;
    for (let i = 0; i < n; i++) {
      if (!inTree[i] && key[i] < best) {
        best = key[i];
        u = i;
      }
    }
    if (u < 0) break;
    inTree[u] = true;
    t.visit(u);
    if (parent[u] >= 0) t.doneEdge(parent[u], u);
    log.println('加入 ' + u + ' (最小割边权 ' + key[u] + ')');
    const nbrs = adj[u].slice();
    for (let k = 0; k < nbrs.length; k++) {
      const e = nbrs[k];
      const v = e[0] === u ? e[1] : e[0];
      const w = e[2];
      if (!inTree[v] && w < key[v]) {
        t.selectEdge(u, v);
        key[v] = w;
        parent[v] = u;
        log.println('  更新 ' + v + ' 的候选边权: ' + w);
        t.deselectEdge(u, v);
      }
    }
    t.leave(u);
  }
}
prim(t, buildAdjW(edges, nodes.length), nodes.length);`;

  const KRUSKAL = `// Kruskal 最小生成树：边按权排序，并查集防环
const nodes = [0, 1, 2, 3, 4, 5, 6];
const edges = [[0,1,4],[0,6,8],[1,2,8],[1,6,11],[2,3,7],[2,5,4],[3,4,9],[3,5,14],[4,5,10],[6,5,1],[6,4,2]];
const t = new UndirectedGraphTracer('Kruskal 最小生成树');
t.set(nodes, edges);
const log = new LogTracer('并查集日志');
function find(par, x) {
  while (par[x] !== x) {
    par[x] = par[par[x]];
    x = par[x];
  }
  return x;
}
function kruskal(t, edges, n) {
  const sorted = edges.slice().sort(function (a, b) { return a[2] - b[2]; });
  const par = [];
  for (let i = 0; i < n; i++) par.push(i);
  let mst = 0;
  log.println('按边权升序: ' + sorted.map(function (e) { return e[0] + '-' + e[1] + '(' + e[2] + ')'; }).join(' '));
  for (let i = 0; i < sorted.length; i++) {
    const e = sorted[i];
    const u = e[0];
    const v = e[1];
    const w = e[2];
    const ru = find(par, u);
    const rv = find(par, v);
    t.selectEdge(u, v);
    if (ru !== rv) {
      par[ru] = rv;
      mst += w;
      t.doneEdge(u, v);
      log.println('选择边 ' + u + '-' + v + ' 权' + w + ' (不构成环)，累计 ' + mst);
    } else {
      log.println('跳过边 ' + u + '-' + v + ' 权' + w + ' (会形成环)');
    }
    t.deselectEdge(u, v);
  }
  log.println('MST 总权值: ' + mst);
}
kruskal(t, edges, nodes.length);`;

  const TOPO = `// 拓扑排序（Kahn）：反复取出入度为 0 的顶点
const nodes = [0, 1, 2, 3, 4, 5, 6];
const edges = [[0,1],[0,2],[1,3],[2,3],[3,4],[2,5],[5,6],[4,6],[1,6]];
const t = new DirectedGraphTracer('拓扑排序 Topological Sort');
t.set(nodes, edges);
const log = new LogTracer('队列日志');
function buildOut(edges, n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push([]);
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    out[e[0]].push(e[1]);
  }
  return out;
}
function kahn(t, out, n) {
  const indeg = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < out[i].length; k++) indeg[out[i][k]]++;
  }
  const q = [];
  for (let i = 0; i < n; i++) {
    if (indeg[i] === 0) q.push(i);
  }
  const order = [];
  while (q.length > 0) {
    const u = q.shift();
    order.push(u);
    t.visit(u);
    log.println('输出顶点 ' + u + ' (入度为0)');
    t.leave(u);
    const nbrs = out[u].slice();
    for (let k = 0; k < nbrs.length; k++) {
      const v = nbrs[k];
      indeg[v]--;
      t.selectEdge(u, v);
      log.println('  删除边 ' + u + '→' + v + '，其入度变为 ' + indeg[v]);
      t.deselectEdge(u, v);
      if (indeg[v] === 0) {
        q.push(v);
        t.visit(v);
        log.println('  ' + v + ' 入度归零，入队');
      }
    }
  }
  log.println('拓扑序: ' + order.join(' → '));
}
kahn(t, buildOut(edges, nodes.length), nodes.length);`;

  const R = [];
  const reg = function (name, code, desc) {
    R.push({ cat: '图算法', name: name, desc: desc, code: code });
  };
  reg('Prim 最小生成树', PRIM, '与 Dijkstra 同图的贪心扩展版。绿边构成生长中的 MST，橙色=新加入点。');
  reg('Kruskal 最小生成树', KRUSKAL, '全部边按权升序逐个尝试，并查集判断是否成环；日志给出每一步选/弃原因与累计权值。');
  reg('拓扑排序 Topo', TOPO, '有向无环图 DAG。Kahn 算法：反复移除入度为 0 的顶点并更新后继入度。');
  window.__ALG_GRAPH2 = R;
})();
