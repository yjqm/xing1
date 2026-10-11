const $=id=>document.getElementById(id);
let events=[],cursor=0,timer=null,stack=[],view='live',paintFrame=0;
const keywords=new Set(['if','for','while','switch','catch','return','sizeof','main','cout','cin','min','max']);
const escapeHtml=value=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const templates={
  dfs:`#include <bits/stdc++.h>\nusing namespace std;\n\nvoid explore(int u, vector<vector<int>>& graph, vector<int>& seen) {\n    seen[u] = 1;\n    for (int v : graph[u]) {\n        if (!seen[v]) explore(v, graph, seen);\n    }\n}\n\nint main() {\n    vector<vector<int>> graph = {{1,2},{3},{3},{}};\n    vector<int> seen(4);\n    explore(0, graph, seen);\n}`,
  bfs:`#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    vector<vector<int>> graph = {{1,2},{3},{3},{}};\n    vector<int> dist(4, -1);\n    queue<int> frontier;\n    frontier.push(0);\n    dist[0] = 0;\n    while (!frontier.empty()) {\n        int u = frontier.front(); frontier.pop();\n        for (int v : graph[u]) if (dist[v] == -1) {\n            dist[v] = dist[u] + 1;\n            frontier.push(v);\n        }\n    }\n}`,
  sort:`#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    int data[] = {7, 3, 5, 1, 4};\n    int n = 5;\n    for (int i = 0; i < n; ++i) {\n        for (int j = 0; j + 1 < n - i; ++j) {\n            if (data[j] > data[j + 1]) std::swap(data[j], data[j + 1]);\n        }\n    }\n}`,
  search:`#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    int data[] = {2, 5, 9, 13, 21, 34, 55};\n    int target = 21, left = 0, right = 6;\n    while (left <= right) {\n        int mid = (left + right) / 2;\n        if (data[mid] == target) break;\n        if (data[mid] < target) left = mid + 1;\n        else right = mid - 1;\n    }\n}`,
  tree:`#include <bits/stdc++.h>\nusing namespace std;\n\nvoid inorder(int node, vector<int>& left, vector<int>& right) {\n    if (node == -1) return;\n    inorder(left[node], left, right);\n    cout << node << ' ';\n    inorder(right[node], left, right);\n}\n\nint main() {\n    vector<int> left = {1, 3, -1, -1};\n    vector<int> right = {2, -1, -1, -1};\n    inorder(0, left, right);\n}`,
  backtrack:`#include <bits/stdc++.h>\nusing namespace std;\n\nvoid choose(int depth, int path[]) {\n    if (depth == 3) return;\n    for (int value = 0; value < 2; ++value) {\n        path[depth] = value;\n        choose(depth + 1, path);\n        path[depth] = -1;\n    }\n}\n\nint main() {\n    int path[] = {-1, -1, -1};\n    choose(0, path);\n}`,
  dp:`#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    int dp[7] = {};\n    dp[0] = 0; dp[1] = 1;\n    for (int i = 2; i <= 6; ++i) {\n        dp[i] = dp[i - 1] + dp[i - 2];\n    }\n    cout << dp[6];\n}`
};

function lines(){
  $('lineNumbers').textContent=Array.from({length:Math.max(1,$('code').value.split('\n').length)},(_,i)=>i+1).join('\n');
}

function sourceLines(){
  let block=false;
  return $('code').value.split('\n').map((raw,index)=>{
    let code=raw;
    if(block){const end=code.indexOf('*/');if(end<0)code='';else{code=code.slice(end+2);block=false}}
    const start=code.indexOf('/*');if(start>=0){const end=code.indexOf('*/',start+2);if(end<0){code=code.slice(0,start);block=true}else code=code.slice(0,start)+code.slice(end+2)}
    code=code.replace(/\/\/.*$/,'').trim();
    return {number:index+1,text:code,raw:raw.trim()};
  }).filter(line=>line.text);
}

function functionInfo(rows){
  const result=[];
  const declaration=/^(?:(?:inline|static|const|virtual|constexpr)\s+)*(?:[\w:<>*&]+\s+)+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*(?:const\s*)?\{?/;
  rows.forEach(row=>{const m=row.text.match(declaration);if(m&&!keywords.has(m[1]))result.push({name:m[1],args:m[2].trim(),line:row.number})});
  return result;
}

function node(kind,label,detail='',className=''){
  return `<div class="live-node ${className}" data-kind="${escapeHtml(kind)}"><strong>${escapeHtml(label)}</strong>${detail?`<small>${escapeHtml(detail)}</small>`:''}</div>`;
}

function liveShell(nodes,summary,message){
  const body=nodes.length?`<div class="live-flow">${nodes.join('')}</div>`:`<div class="live-empty">${message}</div>`;
  const chips=summary.length?`<div class="live-summary">${summary.map(x=>`<span>${escapeHtml(x)}</span>`).join('')}</div>`:'';
  return `<div class="live-head"><span>代码结构随输入实时更新</span><span class="live-badge">● LIVE</span></div>${body}${chips}`;
}

function renderDfsLive(rows){
  const functions=functionInfo(rows),names=new Set(functions.map(f=>f.name)),nodes=[];
  functions.forEach(f=>nodes.push(node('函数',`${f.name}(${f.args})`,`第 ${f.line} 行：发现函数定义`,'function')));
  let branches=0,loops=0,returns=0,calls=0;
  rows.forEach(row=>{
    if(/\bif\s*\(/.test(row.text)){branches++;nodes.push(node('判断',row.raw,`第 ${row.number} 行：搜索分支或递归边界`,'branch'))}
    if(/\b(?:for|while)\s*\(/.test(row.text)){loops++;nodes.push(node('循环',row.raw,`第 ${row.number} 行：候选状态枚举`,'branch'))}
    if(/\breturn\b/.test(row.text)){returns++;nodes.push(node('返回',row.raw,`第 ${row.number} 行：结束当前搜索层`))}
    const regex=/\b([A-Za-z_]\w*)\s*\(([^;{}]*)\)/g;let match;
    while((match=regex.exec(row.text))){
      const name=match[1];if(keywords.has(name)||!names.has(name)||functions.some(f=>f.line===row.number&&f.name===name))continue;
      calls++;nodes.push(node('递归',`${name}(${match[2].trim()})`,`第 ${row.number} 行：进入新的搜索层`,'recursion'));
    }
  });
  return liveShell(nodes,[`函数 ${functions.length}`,`分支 ${branches}`,`循环 ${loops}`,`递归调用 ${calls}`,`返回 ${returns}`],'开始写一个递归函数；写到函数、if、循环或递归调用时，这里会立即生长出搜索结构。');
}

function renderBfsLive(rows){
  const nodes=[],queues=new Set();let pushes=0,pops=0,reads=0,loops=0;
  rows.forEach(row=>{
    const declaration=row.text.match(/(?:std::)?queue\s*<[^;]+?>\s*([A-Za-z_]\w*)/);
    if(declaration){queues.add(declaration[1]);nodes.push(node('队列',`创建队列 ${declaration[1]}`,`第 ${row.number} 行：BFS 边界容器`,'queue'))}
    if(/\bwhile\s*\(/.test(row.text)){loops++;nodes.push(node('循环',row.raw,`第 ${row.number} 行：逐层扩展队列`,'branch'))}
    const operation=/\b([A-Za-z_]\w*)\s*\.\s*(push|emplace|pop|front|empty)\s*\(([^)]*)\)/g;let match;
    while((match=operation.exec(row.text))){
      const [,name,op,args]=match;queues.add(name);
      if(op==='push'||op==='emplace')pushes++;else if(op==='pop')pops++;else reads++;
      const labels={push:'加入队尾',emplace:'构造入队',pop:'移出队首',front:'读取队首',empty:'检查队列'};
      nodes.push(node(op,`${name}.${op}(${args.trim()})`,`第 ${row.number} 行：${labels[op]}`,'queue'));
    }
  });
  return liveShell(nodes,[`队列 ${queues.size}`,`入队 ${pushes}`,`出队 ${pops}`,`读取/判断 ${reads}`,`扩展循环 ${loops}`],'写下 queue、push、front、pop 或 while 后，右侧会实时组成 BFS 队列流程。');
}

function renderDpLive(rows){
  const nodes=[],states=new Set();let updates=0,loops=0,conditions=0;
  rows.forEach(row=>{
    const array=row.text.match(/\b(?:vector\s*<[^>]+>\s*|(?:int|long\s+long|double|float|bool)\s+)([A-Za-z_]\w*)\s*(?:\[|\()/);
    if(array){states.add(array[1]);nodes.push(node('状态',`状态表 ${array[1]}`,`第 ${row.number} 行：发现 DP 存储结构`,'state'))}
    if(/\b(?:for|while)\s*\(/.test(row.text)){loops++;nodes.push(node('遍历',row.raw,`第 ${row.number} 行：计算状态顺序`,'branch'))}
    if(/\bif\s*\(/.test(row.text)){conditions++;nodes.push(node('条件',row.raw,`第 ${row.number} 行：状态转移限制`,'branch'))}
    const assign=/\b([A-Za-z_]\w*)\s*\[([^\]]+)\]\s*=\s*([^;]+)/g;let match;
    while((match=assign.exec(row.text))){updates++;states.add(match[1]);nodes.push(node('转移',`${match[1]}[${match[2].trim()}] ← ${match[3].trim()}`,`第 ${row.number} 行：状态值更新`,'state'))}
  });
  return liveShell(nodes,[`状态表 ${states.size}`,`状态转移 ${updates}`,`遍历 ${loops}`,`条件 ${conditions}`],'写下数组或 vector、循环和状态赋值后，右侧会实时形成 DP 状态转移过程。');
}

function renderSortLive(rows){
  const nodes=[],arrays=new Set();let swaps=0,updates=0,loops=0;
  rows.forEach(row=>{
    const declaration=row.text.match(/(?:vector\s*<[^>]+>\s*|(?:int|long\s+long|double|float)\s+)([A-Za-z_]\w*)\s*(?:\[|\()/);
    if(declaration){arrays.add(declaration[1]);nodes.push(node('序列',`待排序 ${declaration[1]}`,`第 ${row.number} 行：发现数组或 vector`,'state'))}
    if(/\b(?:for|while)\s*\(/.test(row.text)){loops++;nodes.push(node('遍历',row.raw,`第 ${row.number} 行：排序轮次或扫描`,'branch'))}
    if(/\b(?:std::)?swap\s*\(/.test(row.text)){swaps++;nodes.push(node('交换',row.raw,`第 ${row.number} 行：交换两个真实位置`,'recursion'))}
    if(/\b\w+\s*\[[^\]]+\]\s*(?:[+\-*/%]?=)/.test(row.text)){updates++;nodes.push(node('更新',row.raw,`第 ${row.number} 行：写回序列值`,'state'))}
  });
  return liveShell(nodes,[`序列 ${arrays.size}`,`交换 ${swaps}`,`写入 ${updates}`,`循环 ${loops}`],'声明数组/vector，再写 swap 或下标赋值；右侧会实时标出排序步骤。');
}

function renderSearchLive(rows){
  const nodes=[],arrays=new Set();let probes=0,loops=0,branches=0;
  rows.forEach(row=>{
    const declaration=row.text.match(/(?:vector\s*<[^>]+>\s*|(?:int|long\s+long|double|float)\s+)([A-Za-z_]\w*)\s*(?:\[|\()/);
    if(declaration){arrays.add(declaration[1]);nodes.push(node('序列',`搜索范围 ${declaration[1]}`,`第 ${row.number} 行：发现有序/待查序列`,'state'))}
    if(/\b(?:for|while)\s*\(/.test(row.text)){loops++;nodes.push(node('循环',row.raw,`第 ${row.number} 行：持续缩小或扫描范围`,'branch'))}
    if(/\bif\s*\(/.test(row.text)){branches++;nodes.push(node('比较',row.raw,`第 ${row.number} 行：探测当前元素`,'queue'))}
    if(/\b\w+\s*\[[^\]]+\]/.test(row.text))probes++;
  });
  return liveShell(nodes,[`序列 ${arrays.size}`,`比较分支 ${branches}`,`下标访问 ${probes}`,`循环 ${loops}`],'写下数组/vector、循环和 if 比较；运行后显示每一次真实探测的下标和值。');
}

function renderTreeLive(rows){
  const shell=renderDfsLive(rows);
  return shell.replace('搜索分支或递归边界','树的空节点或方向判断').replace('候选状态枚举','向左/右子树继续遍历');
}

function renderBacktrackLive(rows){
  const shell=renderDfsLive(rows);
  return shell.replace('搜索分支或递归边界','选择是否合法').replace('候选状态枚举','枚举下一步候选').replace('结束当前搜索层','撤销选择并返回上一层');
}

function renderLive(){
  view='live';const rows=sourceLines(),mode=$('mode').value;
  $('eventCount').textContent='实时解析';$('eventCount').className='live-badge';$('exitCode').textContent='';
  const renderers={dfs:renderDfsLive,bfs:renderBfsLive,sort:renderSortLive,search:renderSearchLive,tree:renderTreeLive,backtrack:renderBacktrackLive,dp:renderDpLive};
  $('trace').innerHTML=(renderers[mode]||renderDfsLive)(rows);
}

function scheduleLive(){
  lines();stop();events=[];cursor=0;
  cancelAnimationFrame(paintFrame);paintFrame=requestAnimationFrame(renderLive);
}

function setMode(){
  const mode=$('mode').value;
  const info={dfs:['DFS / 递归搜索运行轨迹','写代码时实时识别函数、分支、循环和递归；运行后补充真实参数与调用深度。','DFS 实时代码结构'],bfs:['BFS / 队列搜索运行轨迹','写代码时实时识别任意名称的队列及其操作；运行后补充真实队列内容。','BFS 实时队列流程'],sort:['排序 / 数组交换运行轨迹','写代码时实时识别数组、循环、交换和写入；运行后逐步回放真实数组值。','排序实时交换'],search:['查找 / 比较探针运行轨迹','写代码时实时识别搜索范围、循环和比较；运行后显示实际检查的下标和值。','查找实时探针'],tree:['树 / 递归遍历运行轨迹','写代码时实时识别递归函数和树分支；运行后按真实调用顺序展开遍历树。','树遍历调用树'],backtrack:['回溯 / 选择与撤销轨迹','写代码时实时识别递归层、候选循环和状态写入；运行后回放真实选择过程。','回溯调用与状态'],dp:['动态规划 / 状态表更新轨迹','写代码时实时识别状态表、遍历顺序与转移式；运行后补充真实下标和值。','DP 实时状态转移']}[mode];
  $('title').textContent=info[0];$('desc').textContent=info[1];$('traceTitle').textContent=info[2];renderLive();
}

async function run(){
  stop();$('compile').disabled=true;$('compile').textContent='正在编译…';$('statusText').textContent='编译运行中';$('output').textContent='';
  try{
    const response=await fetch('/api/trace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:$('mode').value,code:$('code').value,input:$('stdin').value})});
    const data=await response.json();
    if(!data.ok&&data.stage!=='done'){
      $('output').textContent=data.error||'运行失败';$('output').className='output compile-error';$('statusText').textContent=data.stage==='compile'?'代码还未完整，继续编写':'分析失败';renderLive();return;
    }
    view='runtime';events=data.events||[];cursor=0;stack=[];$('eventCount').textContent=`${events.length} 个运行事件`;$('eventCount').className='';
    $('output').textContent=(data.stdout||'（无标准输出）')+(data.stderr?'\n[stderr]\n'+data.stderr:'');$('output').className='output';$('exitCode').textContent=`退出码 ${data.exitCode}`;$('statusText').textContent='运行完成';renderRuntime();
  }catch(e){$('output').textContent='无法连接本地编译服务：'+e.message;$('output').className='output compile-error';$('statusText').textContent='服务未连接';renderLive()}
  finally{$('compile').disabled=false;$('compile').textContent='▶ 编译并运行'}
}

function clearTrace(){stop();events=[];cursor=0;stack=[];renderLive()}

function renderRuntime(){
  if(view!=='runtime'||!events.length){renderLive();return}
  const mode=$('mode').value;
  if(mode==='dfs'||mode==='tree'||mode==='backtrack'){
    stack=[];const history=[];
    for(let i=0;i<cursor;i++){const e=events[i];if(e.type==='enter'){const item={...e,depth:stack.length,index:i,closed:false};history.push(item);stack.push(history.length-1)}else if(e.type==='exit'&&stack.length)history[stack.pop()].closed=true}
    const active=new Set(stack),values=events.slice(0,cursor).filter(e=>e.type==='value');const state=mode==='backtrack'&&values.length?`<div class="queue-items" style="flex-wrap:wrap;margin-bottom:12px">${values.slice(-10).map(e=>`<span>${escapeHtml(e.name)}[${escapeHtml(e.index)}] = ${escapeHtml(e.value)}</span>`).join('')}</div>`:'';$('trace').innerHTML=state+history.map((e,i)=>`<div class="tree-node ${active.has(i)?'active':''}" style="margin-left:${Math.min(e.depth*22,220)}px;opacity:${e.closed?'.58':'1'}"><span class="depth">深度 ${e.depth}</span>${escapeHtml(e.name)}(${escapeHtml(e.args||'')}) <small>line ${e.line}</small></div>`).join('')||'<div class="live-empty">点击下一步或回放，查看真实调用过程</div>';
  }else if(mode==='bfs'){
    const history=events.slice(0,cursor).filter(e=>e.type==='queue');$('trace').innerHTML=history.map((e,i)=>`<div class="queue-event"><b>#${i+1} ${escapeHtml(e.name)}</b> · line ${e.line}<div class="queue-items">${e.items.length?e.items.map(x=>`<span>${escapeHtml(x)}</span>`).join(''):'<em>队列为空</em>'}</div></div>`).join('')||'<div class="live-empty">点击下一步或回放，查看真实队列变化</div>';
  }else if(mode==='sort'){
    const history=events.slice(0,cursor).filter(e=>e.type==='array');const latest=history.at(-1);$('trace').innerHTML=history.length?`<div class="queue-items" style="flex-wrap:wrap;margin-bottom:16px">${latest.items.map((v,i)=>`<span>${i}: ${escapeHtml(v)}</span>`).join('')}</div>`+history.map((e,i)=>`<div class="queue-event"><b>#${i+1} ${escapeHtml(e.name)}</b> · line ${e.line}<div class="queue-items">${e.items.map(v=>`<span>${escapeHtml(v)}</span>`).join('')}</div></div>`).join(''):'<div class="live-empty">点击下一步或回放，查看真实数组交换</div>';
  }else if(mode==='search'){
    const history=events.slice(0,cursor).filter(e=>e.type==='probe');$('trace').innerHTML=history.map((e,i)=>`<div class="queue-event"><b>#${i+1} 比较 ${escapeHtml(e.name)}[${escapeHtml(e.index)}]</b> = <span class="live-badge">${escapeHtml(e.value)}</span> · line ${e.line}</div>`).join('')||'<div class="live-empty">点击下一步或回放，查看真实比较下标和值</div>';
  }else{
    const history=events.slice(0,cursor).filter(e=>e.type==='value'),latest={};history.forEach(e=>latest[`${e.name}[${e.index}]`]=e);
    $('trace').innerHTML=history.length?`<div class="queue-items" style="flex-wrap:wrap;margin-bottom:16px">${Object.values(latest).map(e=>`<span>${escapeHtml(e.name)}[${escapeHtml(e.index)}] = ${escapeHtml(e.value)}</span>`).join('')}</div>`+history.map((e,i)=>`<div class="queue-event"><b>#${i+1}</b> ${escapeHtml(e.name)}[${escapeHtml(e.index)}] ← ${escapeHtml(e.value)} · line ${e.line}</div>`).join(''):'<div class="live-empty">点击下一步或回放，查看真实状态值</div>';
  }
  $('trace').scrollTop=$('trace').scrollHeight;
}

function step(delta=1){if(view!=='runtime'||!events.length)return;cursor=Math.max(0,Math.min(events.length,cursor+delta));renderRuntime();if(cursor>=events.length)stop()}
function play(){if(view!=='runtime'||!events.length)return;if(timer){stop();return}if(cursor>=events.length)cursor=0;$('play').textContent='Ⅱ 暂停';timer=setInterval(()=>step(1),950-$('speed').value*80)}
function stop(){clearInterval(timer);timer=null;$('play').textContent='▶ 回放'}

$('code').oninput=scheduleLive;
$('code').onkeydown=e=>{if(e.key==='Tab'){e.preventDefault();const s=e.target.selectionStart;e.target.setRangeText('    ',s,e.target.selectionEnd,'end');scheduleLive()}};
$('code').onscroll=e=>$('lineNumbers').scrollTop=e.target.scrollTop;
$('mode').onchange=setMode;$('loadTemplate').onclick=()=>{$('code').value=templates[$('mode').value]||'';$('stdin').value='';scheduleLive();$('statusText').textContent='已载入可运行模板'};$('compile').onclick=run;$('reset').onclick=clearTrace;$('next').onclick=()=>{stop();step(1)};$('prev').onclick=()=>{stop();step(-1)};$('play').onclick=play;$('speed').oninput=()=>{if(timer){stop();play()}};
const initialMode=new URLSearchParams(location.search).get('mode');
if(['dfs','bfs','sort','search','tree','backtrack','dp'].includes(initialMode))$('mode').value=initialMode;
lines();setMode();
