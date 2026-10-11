/* 验证 langs.js：四种语言模板转译 → 执行 → 结果正确 */
"use strict";
const path = require('path');
const fs = require('fs');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');

const sandbox = { console, Math, JSON, Date, Promise, Set, Map, RegExp, Object, Array, Number, String, Boolean, Error, Infinity, NaN, undefined };
sandbox.window = sandbox; sandbox.globalThis = sandbox;
const ctx = vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/langs.js'), 'utf8'), ctx, { filename: 'js/langs.js' });
const AVLang = ctx.AVLang;

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name); }
}

/* ---- tracer 桩 ---- */
function makeStubs() {
  const st = { a1: [], logs: [], setCount: 0, arrRef: null, finalArr: null };
  function A1(name) { this.name = name; st.a1.push(this); }
  ['set', 'patch', 'depatch', 'select', 'deselect', 'highlight', 'dehighlight', 'mark', 'unmark', 'reorder'].forEach(m => {
    A1.prototype[m] = function () { if (m === 'set') { st.setCount++; st.arrRef = arguments[0]; } };
  });
  A1.prototype.done = function () { if (st.arrRef) st.finalArr = st.arrRef.slice(); };
  function Log(name) { this.name = name; }
  Log.prototype.println = function (s) { st.logs.push(String(s)); };
  Log.prototype.print = Log.prototype.println;
  return { st, A1, Log };
}

function runJs(code) {
  const { st, A1, Log } = makeStubs();
  const fn = new Function('__m', '__AV', 'Array1DTracer', 'Array2DTracer', 'ChartTracer',
    'GraphTracer', 'DirectedGraphTracer', 'UndirectedGraphTracer', 'TreeTracer',
    'RecursionTracer', 'LogTracer', 'Randomize', '"use strict";\n' + code);
  fn(function () {}, {}, A1, function () {}, function () {}, function () {}, function () {},
    function () {}, function () {}, function () {}, Log, function () {});
  return st;
}

const SORTED = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/* ---- 1. 四种语言模板：转译 + 执行 + 排序正确 ---- */
['js', 'c', 'cpp', 'py'].forEach(lang => {
  try {
    const src = AVLang.LANGS[lang].sample;
    const js = AVLang.transpile(lang, src);
    if (lang === 'js') ok(js === src, lang + ' 原样透传');
    const st = runJs(js);
    ok(st.a1.length === 1, lang + ' 创建 1 个 Array1DTracer');
    ok(st.setCount >= 1, lang + ' 调用 set');
    ok(JSON.stringify(st.finalArr) === JSON.stringify(SORTED), lang + ' 排序结果正确');
    ok(st.logs.length > 0, lang + ' 有日志输出');
  } catch (e) {
    fail++; console.log('FAIL', lang, '模板执行异常:', e.message);
  }
});

/* ---- 2. Python：函数 + 递归 ---- */
try {
  const py = [
    'def fib(n):',
    '    if n <= 1:',
    '        return n',
    '    return fib(n - 1) + fib(n - 2)',
    '',
    "log = LogTracer('fib')",
    "log.println('fib(10)=' + str(fib(10)))"
  ].join('\n');
  const st = runJs(AVLang.transpile('py', py));
  ok(st.logs[0] === 'fib(10)=55', 'py 递归 fib(10)=55');
} catch (e) { fail++; console.log('FAIL py 递归:', e.message); }

/* ---- 3. Python：元组交换 / for-in 列表 / while / elif ---- */
try {
  const py = [
    'a = 1',
    'b = 2',
    'a, b = b, a',
    "log = LogTracer('t')",
    'log.println(str(a) + \',\' + str(b))',
    'total = 0',
    'for x in [1, 2, 3]:',
    '    total = total + x',
    'log.println(str(total))',
    'k = 0',
    'while k < 3:',
    '    k = k + 1',
    'log.println(str(k))',
    'if total > 10:',
    '    log.println(\'big\')',
    'elif total > 5:',
    '    log.println(\'mid\')',
    'else:',
    '    log.println(\'small\')'
  ].join('\n');
  const st = runJs(AVLang.transpile('py', py));
  ok(st.logs[0] === '2,1', 'py 元组交换');
  ok(st.logs[1] === '6', 'py for-in 列表求和');
  ok(st.logs[2] === '3', 'py while 循环');
  ok(st.logs[3] === 'mid', 'py if/elif/else');
} catch (e) { fail++; console.log('FAIL py 语法特性:', e.message); }

/* ---- 4. Python：切片 / and or not / 负步长 range ---- */
try {
  const py = [
    'a = [1, 2, 3, 4, 5]',
    "log = LogTracer('t')",
    "log.println(str(a[1:3]))",
    'b = a[2:]',
    'log.println(str(b))',
    'x = True and not False',
    'log.println(str(x))',
    's = 0',
    'for i in range(4, 0, -1):',
    '    s = s + i',
    'log.println(str(s))',
    'q = 7 // 2',
    'log.println(str(q))'
  ].join('\n');
  const st = runJs(AVLang.transpile('py', py));
  ok(st.logs[0] === '2,3', 'py 切片 a[1:3]');
  ok(st.logs[1] === '3,4,5', 'py 切片 a[2:]');
  ok(st.logs[2] === 'true', 'py and/not');
  ok(st.logs[3] === '10', 'py 负步长 range');
  ok(st.logs[4] === '3', 'py 整除 //');
} catch (e) { fail++; console.log('FAIL py 表达式特性:', e.message); }

/* ---- 5. C：函数 + main 自动调用 ---- */
try {
  const c = [
    'LogTracer* log = new LogTracer("t");',
    '',
    'int sum(int a, int b) {',
    '    return a + b;',
    '}',
    '',
    'int main() {',
    '    int s = sum(3, 4);',
    '    log->println("called");',
    '    return 0;',
    '}',
    ''
  ].join('\n');
  const st = runJs(AVLang.transpile('c', c));
  ok(st.logs.length === 1 && st.logs[0] === 'called', 'c 函数+main 自动调用');
} catch (e) { fail++; console.log('FAIL c 函数:', e.message); }

/* ---- 6. C++：cout 拼接 / vector(n) / push_back ---- */
try {
  const cpp = [
    '#include <iostream>',
    'using namespace std;',
    'LogTracer* log = new LogTracer("t");',
    'vector<int> v(3);',
    'v.push_back(7);',
    'int n = v.size();',
    'cout << "n=" << n << endl;',
    'for (int i = 0; i < n; i++) {',
    '    log->println("v[" + i + "]=" + v[i]);',
    '}',
    ''
  ].join('\n');
  const st = runJs(AVLang.transpile('cpp', cpp));
  ok(st.logs[0] === 'v[0]=0' && st.logs.length === 4, 'cpp vector+push_back');
} catch (e) { fail++; console.log('FAIL cpp vector:', e.message); }

/* ---- 6b. C++：cout 运算符优先级（括号） ---- */
try {
  const cpp2 = [
    '#include <iostream>',
    'int j = 2;',
    'cout << "和 = " << j + 1 << endl;',
    ''
  ].join('\n');
  const realLog = console.log;
  const captured = [];
  console.log = function (s) { captured.push(String(s)); };
  runJs(AVLang.transpile('cpp', cpp2));
  console.log = realLog;
  ok(captured[0] === '和 = 3', 'cpp cout 运算符加括号');
} catch (e) { console.log = console.log.bind(console); fail++; console.log('FAIL cpp cout 优先级:', e.message); }

/* ---- 7. 负样本：应报带行号的错 ---- */
function expectThrow(lang, src, name) {
  try { AVLang.transpile(lang, src); fail++; console.log('FAIL', name, '(未抛错)'); }
  catch (e) { ok(/第\d+行/.test(e.message), name); }
}
expectThrow('py', "x = f'{a}'", 'py f-string 报错');
expectThrow('py', 'try:\n    x = 1', 'py try 报错');
expectThrow('c', 'struct Node {\n    int v;\n};', 'c struct 报错');
expectThrow('py', 'y = input()', 'py input 报错');

console.log('\n结果: ' + pass + ' PASS / ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
