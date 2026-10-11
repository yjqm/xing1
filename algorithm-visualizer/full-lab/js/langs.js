/* =========================================================
 * langs.js —— 自定义代码多语言支持
 * C / C++ / Python（刷题常用语法子集）→ JS tracer 引擎转译器
 * 机制：逐行结构转换（缩进/类型/控制流/输入输出），
 * 转译结果交给 AV.compile 的既有插桩执行管线。
 * 支持子集见各语言模板头部注释；不支持的结构会给出
 * 带行号的明确报错。
 * ========================================================= */
"use strict";
(function (root) {

  var TRACERS = ['Array1DTracer', 'Array2DTracer', 'ChartTracer', 'GraphTracer',
    'DirectedGraphTracer', 'UndirectedGraphTracer', 'TreeTracer',
    'RecursionTracer', 'LogTracer'];

  function err(lineNo, msg) { return new Error('第' + lineNo + '行: ' + msg); }

  /* ---------- 通用：把一行拆成 代码 / 字符串 / 注释 片段 ---------- */
  // commentStart: '#'(Python) 或 '//'(C)
  function splitParts(line, commentStart) {
    var parts = [];                 // {t:'code'|'str'|'cm', s:text}
    var i = 0, n = line.length, cur = '', quote = null;
    var slash = commentStart === '//';
    while (i < n) {
      var ch = line[i];
      if (quote) {
        cur += ch;
        if (ch === '\\' && i + 1 < n) { cur += line[i + 1]; i += 2; continue; }
        if (ch === quote) { parts.push({ t: 'str', s: cur }); cur = ''; quote = null; }
        i++; continue;
      }
      if (!slash && ch === '#') {
        if (cur) parts.push({ t: 'code', s: cur });
        parts.push({ t: 'cm', s: line.slice(i) });
        return parts;
      }
      if (slash && ch === '/' && line[i + 1] === '/') {
        if (cur) parts.push({ t: 'code', s: cur });
        parts.push({ t: 'cm', s: line.slice(i) });
        return parts;
      }
      if (ch === "'" || ch === '"') {
        if (cur) { parts.push({ t: 'code', s: cur }); cur = ''; }
        quote = ch; cur = ch; i++; continue;
      }
      cur += ch; i++;
    }
    if (cur) parts.push({ t: 'code', s: cur });
    return parts;
  }
  // 对一行应用 fn（仅作用于代码片段，字符串/注释不动）；py 注释 # → //
  function mapCode(line, fn, pyComment) {
    var parts = splitParts(line, pyComment ? '#' : '//');
    return parts.map(function (p) {
      if (p.t === 'code') return fn(p.s);
      if (p.t === 'str') return p.s;
      return pyComment ? '//' + p.s.slice(1) : p.s;
    }).join('');
  }
  // 取一行的代码部分与注释部分
  function takeParts(line, pyComment) {
    var parts = splitParts(line, pyComment ? '#' : '//');
    var code = '', cm = '';
    parts.forEach(function (p) {
      if (p.t === 'code' || p.t === 'str') code += p.s;
      else cm = p.s;
    });
    return { code: code, cm: cm };
  }
  // 顶层逗号切分（跳过括号/字符串内部）
  function splitTop(str) {
    var out = [], depth = 0, cur = '', quote = null;
    for (var i = 0; i < str.length; i++) {
      var ch = str[i];
      if (quote) {
        cur += ch;
        if (ch === '\\') { cur += str[i + 1] || ''; i++; continue; }
        if (ch === quote) quote = null;
        continue;
      }
      if (ch === "'" || ch === '"') { quote = ch; cur += ch; continue; }
      if (ch === '(' || ch === '[' || ch === '{') { depth++; cur += ch; continue; }
      if (ch === ')' || ch === ']' || ch === '}') { depth--; cur += ch; continue; }
      if (ch === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
      cur += ch;
    }
    if (cur.trim()) out.push(cur);
    return out;
  }

  /* =========================================================
   * Python 子集 → JS
   * 支持：变量/列表、赋值(含 a,b=b,a)、if/elif/else、
   *   for-in-range / for-in-list、while、def(含默认参数)、
   *   print、len/str/int/float/abs、and/or/not、True/False/None、
   *   列表切片(读)、append/pop/sort/reverse、整除//、乘方**、
   *   各类 Tracer（自动加 new）
   * 不支持：try/class/lambda/f字符串/input/字典推导等
   * ========================================================= */
  function pyExpr(e) {
    return mapCode(e, function (c) {
      c = c.replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false')
        .replace(/\bNone\b/g, 'null');
      c = c.replace(/\band\b/g, '&&').replace(/\bor\b/g, '||')
        .replace(/\bnot\s+/g, '!');
      c = c.replace(/\blen\(([^()]*)\)/g, function (_, x) { return '(' + x + ').length'; });
      c = c.replace(/\bstr\(/g, 'String(').replace(/\bint\(/g, 'parseInt(')
        .replace(/\bfloat\(/g, 'parseFloat(').replace(/\babs\(/g, 'Math.abs(');
      c = c.replace(/([\w\)\]])\s*\/\/\s*([\w\(])/g, 'Math.floor($1 / $2)');
      c = c.replace(/([\w\)\]])\s*\*\*\s*([\w\(])/g, 'Math.pow($1, $2)');
      c = c.replace(/\.append\(/g, '.push(');
      // 切片（读）：a[1:] / a[:3] / a[i:j] → slice
      c = c.replace(/([\w\)\]])\s*\[\s*([\w]*)\s*:\s*([\w]*)\s*\]/g,
        function (_, o, a, b) {
          return o + '.slice(' + (a || '0') + (b ? ', ' + b : '') + ')';
        });
      return c;
    }, true);
  }

  function transpilePython(src) {
    var lines = src.split('\n');
    var out = [];
    var stack = [];               // 各块头部的缩进
    var bad = null;

    lines.forEach(function (raw, idx) {
      if (bad) return;
      var lineNo = idx + 1;
      var trimmed = raw.trim();
      if (!trimmed) { out.push(''); return; }
      if (trimmed[0] === '#') { out.push('//' + trimmed.slice(1)); return; }
      if (/^(import\s|from\s+\S+\s+import\s)/.test(trimmed) || /^global\s/.test(trimmed)) {
        out.push('// ' + trimmed); return;
      }
      if (/f['"]/.test(trimmed)) { bad = err(lineNo, '暂不支持 f-string，请用 + 拼接字符串'); return; }
      if (/\binput\s*\(/.test(trimmed)) { bad = err(lineNo, '暂不支持 input()，请直接用变量给数据'); return; }

      var ind = raw.match(/^[\t ]*/)[0].replace(/\t/g, '    ').length;
      while (stack.length && ind <= stack[stack.length - 1]) { out.push('}'); stack.pop(); }

      var pp = takeParts(raw, true);
      var code = pp.code.trim();
      var cm = pp.cm ? ' ' + '//' + pp.cm.slice(1) : '';
      if (!code) { out.push(cm.trim()); return; }

      var isOpener = /:$/.test(code);
      if (isOpener) {
        var head = code.slice(0, -1).trim();
        var m;
        if ((m = head.match(/^def\s+([A-Za-z_]\w*)\s*\((.*)\)\s*$/))) {
          out.push('function ' + m[1] + '(' + m[2] + ') {' + cm);
        } else if ((m = head.match(/^if\s+(.*)$/))) {
          out.push('if (' + pyExpr(m[1]) + ') {' + cm);
        } else if ((m = head.match(/^elif\s+(.*)$/))) {
          out.push('else if (' + pyExpr(m[1]) + ') {' + cm);
        } else if (/^else\s*$/.test(head)) {
          out.push('else {' + cm);
        } else if ((m = head.match(/^while\s+(.*)$/))) {
          out.push('while (' + pyExpr(m[1]) + ') {' + cm);
        } else if ((m = head.match(/^for\s+([A-Za-z_]\w*)\s+in\s+range\s*\((.*)\)\s*$/))) {
          out.push(forRange(m[1], m[2], lineNo) + cm);
        } else if ((m = head.match(/^for\s+([A-Za-z_]\w*)\s+in\s+(.*)$/))) {
          out.push('for (var ' + m[1] + ' of ' + pyExpr(m[2]) + ') {' + cm);
        } else if (/^(try\s*$|except|class\s|with\s)/.test(head)) {
          bad = err(lineNo, '暂不支持 ' + head.split(/\s/)[0] + ' 语句'); return;
        } else {
          bad = err(lineNo, '无法识别的块语句: ' + head.slice(0, 30)); return;
        }
        stack.push(ind);
      } else {
        out.push(pyStmt(code, lineNo) + cm);
      }
    });
    if (bad) throw bad;
    while (stack.length) { out.push('}'); stack.pop(); }
    return out.join('\n');

    function forRange(v, args, lineNo) {
      var a = splitTop(args).map(function (s) { return pyExpr(s.trim()); });
      if (a.length < 1 || a.length > 3) throw err(lineNo, 'range() 参数个数不对');
      var start = a.length === 1 ? '0' : a[0];
      var end = a.length === 1 ? a[0] : a[1];
      var step = a.length === 3 ? a[2] : null;
      if (step) {
        var gt = /^\s*-/.test(step);
        return 'for (var ' + v + ' = ' + start + '; ' + v + ' ' + (gt ? '>' : '<') + ' ' + end + '; ' + v + ' += ' + step + ') {';
      }
      return 'for (var ' + v + ' = ' + start + '; ' + v + ' < ' + end + '; ' + v + '++) {';
    }
  }

  function pyStmt(code, lineNo) {
    var m;
    // print(...)
    if (/^print\s*\(/.test(code)) return pyExpr(code.replace(/^print\s*\(/, 'console.log('));
    // Tracer 声明：t = Array1DTracer(...)
    for (var i = 0; i < TRACERS.length; i++) {
      var re = new RegExp('^([A-Za-z_]\\w*)\\s*=\\s*(' + TRACERS[i] + ')\\s*\\(');
      if ((m = code.match(re))) {
        return pyExpr(code.replace(re, 'var $1 = new $2('));
      }
    }
    // 元组赋值：a, b = b, a
    if ((m = code.match(/^([A-Za-z_][\w\s,]*?)\s*=\s*(.+)$/)) && m[1].indexOf(',') >= 0) {
      var names = m[1].split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      var rhs = m[2].trim().replace(/^\[|\]$/g, '');
      var vals = splitTop(rhs).map(function (s) { return s.trim(); });
      if (names.length !== vals.length) throw err(lineNo, '元组赋值两边数量不一致');
      return 'var ' + names.join(', ') + '; [' + names.join(', ') + '] = [' + vals.map(pyExpr).join(', ') + '];';
    }
    // 普通赋值：x = ...
    if ((m = code.match(/^([A-Za-z_]\w*)\s*=(?!=)/))) {
      return pyExpr(code.replace(/^([A-Za-z_]\w*)\s*=/, 'var $1 ='));
    }
    if (code === 'pass') return ';';
    return pyExpr(code);
  }

  /* =========================================================
   * C / C++ 子集 → JS
   * 支持：int/float/double/char/bool/long 等标量与一维数组、
   *   for/while/if-else、函数(含 main 自动调用)、
   *   指针仅限 Tracer 声明(Type* t = new Type(...)，调用 ->)、
   *   C++: cout<<、vector<T>、push_back、size()
   * 不支持：指针运算/结构体/类/STL容器(除vector)/scanf/cin
   * ========================================================= */
  var C_TYPES = 'int|long|short|float|double|char|bool|void|size_t|auto|unsigned';

  var C_TYPE_RE = new RegExp('^(const\\s+)?(unsigned\\s+)?(' + C_TYPES + ')\\s*&?\\s*');

  function cleanParams(p) {
    if (!p.trim()) return '';
    return splitTop(p).map(function (s) {
      var t = s.trim()
        .replace(C_TYPE_RE, '')
        .replace(/\[\s*\d*\s*\]/g, '')
        .replace(/&/g, '')
        .trim();
      return t;
    }).filter(Boolean).join(', ');
  }

  function transpileC(src, isCpp) {
    var lines = src.split('\n');
    var out = [];
    var hasMain = false;
    var bad = null;
    var pendingBrace = false;      // 函数头不带 { 时，吞掉下一行的 {

    lines.forEach(function (raw, idx) {
      if (bad) return;
      var lineNo = idx + 1;
      var t = raw.trim();
      if (!t) { out.push(''); return; }
      if (t[0] === '#' || /^using\s+namespace/.test(t)) { out.push('// ' + t); return; }
      if (pendingBrace && t === '{') { pendingBrace = false; return; }

      var pp = takeParts(raw, false);
      var code = pp.code.trim();
      var cm = pp.cm || '';
      if (!code) { out.push(t); return; }
      code = code.replace(/std::/g, '');

      var r = cLine(code, isCpp);
      if (r.error) { bad = err(lineNo, r.error); return; }
      if (r.main) hasMain = true;
      if (r.pendingBrace) pendingBrace = true;
      out.push(r.code + (cm ? ' ' + cm : ''));
    });
    if (bad) throw bad;
    if (hasMain) out.push('\nmain();');
    return out.join('\n');
  }

  function cLine(code, isCpp) {
    var m, res = { code: code };

    // 函数定义：TYPE name(params) { ?（{ 可在下一行）
    var fnRe = new RegExp('^(' + C_TYPES + ')\\s+([A-Za-z_]\\w*)\\s*\\(([^)]*)\\)\\s*(\\{)?\\s*$');
    if ((m = code.match(fnRe))) {
      res.code = 'function ' + m[2] + '(' + cleanParams(m[3]) + ') {';
      if (m[2] === 'main') res.main = true;
      if (!m[4]) res.pendingBrace = true;
      return res;
    }
    // delete
    if (/^delete\s/.test(code)) { res.code = '// ' + code; return res; }
    // cin / scanf 不支持
    if (/\b(cin|scanf|getline)\s*[>>(]/.test(code)) { res.error = '暂不支持输入(cin/scanf)，请直接用变量给数据'; return res; }

    // vector<T> name = {...};  /  vector<T> name(n);
    if ((m = code.match(/^vector<[^>]+>\s*([A-Za-z_]\w*)\s*=\s*\{(.*)\}\s*;?$/))) {
      code = 'var ' + m[1] + ' = [' + m[2] + '];';
    } else if ((m = code.match(/^vector<[^>]+>\s*([A-Za-z_]\w*)\s*\(\s*(\d+)\s*\)\s*;?$/))) {
      code = 'var ' + m[1] + ' = new Array(' + m[2] + ').fill(0);';
    } else {
      // Tracer 指针声明：Type* t = ...
      var trHit = false;
      for (var i = 0; i < TRACERS.length; i++) {
        var trRe = new RegExp('^(' + TRACERS[i] + ')\\s*\\*\\s*([A-Za-z_]\\w*)\\s*=');
        if ((m = code.match(trRe))) { code = code.replace(trRe, 'var $2 ='); trHit = true; break; }
      }
      if (!trHit) {
        // 数组初始化：TYPE name[N] = {...};
        if ((m = code.match(new RegExp('^(' + C_TYPES + ')\\s+([A-Za-z_]\\w*)\\s*\\[\\s*\\d*\\s*\\]\\s*=\\s*\\{(.*)\\}\\s*;?$')))) {
          code = 'var ' + m[2] + ' = [' + m[3] + '];';
        } else if ((m = code.match(new RegExp('^(' + C_TYPES + ')\\s+([A-Za-z_]\\w*)\\s*\\[\\s*(\\d+)\\s*\\]\\s*;?$')))) {
          // 数组声明：TYPE name[N];
          code = 'var ' + m[2] + ' = new Array(' + m[3] + ').fill(0);';
        } else if ((m = code.match(new RegExp('^(' + C_TYPES + ')\\s+([A-Za-z_][\\w,\\s]*)\\s*;$')))) {
          // 多变量声明：TYPE a, b;
          code = 'var ' + m[2].split(',').map(function (s) { return s.trim(); }).filter(Boolean).join(', ') + ';';
        } else if ((m = code.match(new RegExp('^(' + C_TYPES + ')\\s+([A-Za-z_]\\w*)\\s*(=.*|;)$')))) {
          // 单变量声明：TYPE name = ...; / TYPE name;
          code = m[3] === ';' ? 'var ' + m[2] + ' = 0;' : 'var ' + m[2] + ' ' + m[3];
        }
      }
    }

    // for (int i = ...
    code = code.replace(new RegExp('\\bfor\\s*\\(\\s*(' + C_TYPES + ')\\s+'), 'for (var ');

    // cout << a << b << endl;
    if ((m = code.match(/^cout\s*(<<.*)$/))) {
      var toks = m[1].split('<<').map(function (s) { return s.trim(); }).filter(Boolean);
      if (toks.length) toks[toks.length - 1] = toks[toks.length - 1].replace(/;$/, '');
      toks = toks.filter(function (s) { return s && s !== 'endl' && s !== '"\\n"' && s !== '""'; });
      // 含运算符的 token 加括号，保证 "a" << j+1 不变成字符串顺序拼接
      toks = toks.map(function (s) {
        return /^[\w.]+$/.test(s) || /^"[^"]*"$/.test(s) ? s : '(' + s + ')';
      });
      res.code = 'console.log(' + toks.join(' + ') + ');';
      return res;
    }
    // printf(...) → console.log(...)（格式符 %d 等不支持，请直接用 LogTracer）
    code = code.replace(/\bprintf\s*\(/, 'console.log(');

    // 通用替换（仅代码片段）
    code = mapCode(code, function (c) {
      c = c.replace(/->/g, '.');
      c = c.replace(/\bNULL\b|\bnullptr\b/g, 'null');
      c = c.replace(/\.push_back\(/g, '.push(');
      c = c.replace(/\.size\(\)/g, '.length');
      return c;
    }, false);
    res.code = code;

    // 兜底：行首仍是类型关键字 → 未支持的声明
    var t2 = res.code.trim();
    if (new RegExp('^(int|long|short|float|double|char|bool|void|struct|class|template|enum|union|typedef|unsigned)\\b').test(t2)) {
      res.error = '不支持的声明（指针/结构体/类等超出子集）: ' + t2.slice(0, 30);
    }
    return res;
  }

  /* =========================================================
   * 各语言默认模板（同一个冒泡排序，四种写法）
   * ========================================================= */
  var SAMPLE_JS = [
    "// 在这里用 JS 写算法，右侧自动可视化。",
    "// 可用的可视化对象（直接 new 即可）：",
    "//   Array1DTracer(name)   一维数组/柱状",
    "//   Array2DTracer(name)   二维数组",
    "//   ChartTracer(name)     折线图",
    "//   GraphTracer / DirectedGraphTracer / UndirectedGraphTracer(name)",
    "//   TreeTracer(name)      树",
    "//   RecursionTracer(name) 递归调用栈",
    "//   LogTracer(name)       日志文本",
    "// 调用它们的方法(set/patch/select/highlight/...)，每步都会被记录可视化。",
    "",
    "var t = new Array1DTracer('冒泡排序');",
    "var log = new LogTracer('过程日志');",
    "",
    "var a = [5, 2, 9, 1, 7, 3, 8, 4, 6, 0];",
    "t.set(a);",
    "log.println('初始: ' + a);",
    "",
    "for (var i = 0; i < a.length - 1; i++) {",
    "  for (var j = 0; j < a.length - 1 - i; j++) {",
    "    t.select(j, j + 1);",
    "    if (a[j] > a[j + 1]) {",
    "      var tmp = a[j];",
    "      a[j] = a[j + 1];",
    "      a[j + 1] = tmp;",
    "      t.patch(j, a[j]);",
    "      t.patch(j + 1, a[j + 1]);",
    "      log.println('交换 ' + j + ' 与 ' + (j + 1));",
    "    }",
    "    t.depatch();",
    "    t.deselect();",
    "  }",
    "}",
    "t.done();",
    "log.println('完成: ' + a);",
    ""
  ].join('\n');

  var SAMPLE_C = [
    '// 在这里用 C 写算法，右侧自动可视化。',
    '// 支持子集：int/float 等变量与一维数组、for/while/if、函数、',
    '//           Tracer 对象（声明用 类型* 名字 = new 类型(...)，调用用 ->）。',
    '// 方法与 JS 版一致：set/patch/depatch/select/deselect/done/println ...',
    '',
    'Array1DTracer* t = new Array1DTracer("冒泡排序");',
    'LogTracer* log = new LogTracer("过程日志");',
    '',
    'int a[10] = {5, 2, 9, 1, 7, 3, 8, 4, 6, 0};',
    'int n = 10;',
    't->set(a);',
    'log->println("开始冒泡排序");',
    '',
    'for (int i = 0; i < n - 1; i++) {',
    '    for (int j = 0; j < n - 1 - i; j++) {',
    '        t->select(j, j + 1);',
    '        if (a[j] > a[j + 1]) {',
    '            int tmp = a[j];',
    '            a[j] = a[j + 1];',
    '            a[j + 1] = tmp;',
    '            t->patch(j, a[j]);',
    '            t->patch(j + 1, a[j + 1]);',
    '            log->println("交换一对相邻元素");',
    '        }',
    '        t->depatch();',
    '        t->deselect();',
    '    }',
    '}',
    't->done();',
    'log->println("排序完成");',
    ''
  ].join('\n');

  var SAMPLE_CPP = [
    '#include <iostream>',
    'using namespace std;',
    '// 在这里用 C++ 写算法，右侧自动可视化。',
    '// 支持子集：C 的全部子集 + cout 输出 + vector<T> + push_back/size。',
    '',
    'Array1DTracer* t = new Array1DTracer("冒泡排序");',
    'LogTracer* log = new LogTracer("过程日志");',
    '',
    'vector<int> a = {5, 2, 9, 1, 7, 3, 8, 4, 6, 0};',
    'int n = a.size();',
    't->set(a);',
    'log->println("开始冒泡排序");',
    '',
    'for (int i = 0; i < n - 1; i++) {',
    '    for (int j = 0; j < n - 1 - i; j++) {',
    '        t->select(j, j + 1);',
    '        if (a[j] > a[j + 1]) {',
    '            int tmp = a[j];',
    '            a[j] = a[j + 1];',
    '            a[j + 1] = tmp;',
    '            t->patch(j, a[j]);',
    '            t->patch(j + 1, a[j + 1]);',
    '            cout << "交换: " << j << " 和 " << j + 1 << endl;',
    '        }',
    '        t->depatch();',
    '        t->deselect();',
    '    }',
    '}',
    't->done();',
    'log->println("排序完成");',
    ''
  ].join('\n');

  var SAMPLE_PY = [
    '# 在这里用 Python 写算法，右侧自动可视化。',
    '# 支持子集：变量/列表、赋值(含 a, b = b, a)、if/elif/else、',
    '#           for-range / for-in 列表、while、def、print、len/str、',
    '#           and/or/not、切片(读)、append/pop/sort、整除//、乘方**。',
    '# Tracer 用法与 JS 版一致，直接调用即可（自动转 new）。',
    '',
    "t = Array1DTracer('冒泡排序')",
    "log = LogTracer('过程日志')",
    '',
    'a = [5, 2, 9, 1, 7, 3, 8, 4, 6, 0]',
    't.set(a)',
    "log.println('初始: ' + str(a))",
    '',
    'n = len(a)',
    'for i in range(0, n - 1):',
    '    for j in range(0, n - 1 - i):',
    '        t.select(j, j + 1)',
    '        if a[j] > a[j + 1]:',
    '            tmp = a[j]',
    '            a[j] = a[j + 1]',
    '            a[j + 1] = tmp',
    '            t.patch(j, a[j])',
    '            t.patch(j + 1, a[j + 1])',
    "            log.println('交换 ' + str(j) + ' 与 ' + str(j + 1))",
    '        t.depatch()',
    '        t.deselect()',
    't.done()',
    "log.println('完成: ' + str(a))",
    ''
  ].join('\n');

  /* ---------------- 对外接口 ---------------- */
  var AVLang = {
    LANGS: {
      js: { label: 'JavaScript', sample: SAMPLE_JS },
      c: { label: 'C', sample: SAMPLE_C },
      cpp: { label: 'C++', sample: SAMPLE_CPP },
      py: { label: 'Python', sample: SAMPLE_PY }
    },
    transpile: function (lang, src) {
      if (lang === 'js' || !lang) return src;
      if (lang === 'py') return transpilePython(src);
      if (lang === 'c') return transpileC(src, false);
      if (lang === 'cpp') return transpileC(src, true);
      throw new Error('未知语言: ' + lang);
    }
  };

  root.AVLang = AVLang;
})(typeof window !== 'undefined' ? window : globalThis);
