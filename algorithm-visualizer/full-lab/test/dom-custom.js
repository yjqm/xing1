/* 用 jsdom 验证自定义代码编辑器的 DOM 接线与运行可视化 */
"use strict";
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const ROOT = path.join(__dirname, '..');

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true });
const { window } = dom;
const doc = window.document;
window.HTMLElement.prototype.scrollIntoView = function () {};

const files = ['js/core.js', 'js/player.js', 'js/render-graph.js',
  'js/algorithms/alg-sort.js', 'js/algorithms/alg-search.js', 'js/algorithms/alg-graph.js',
  'js/algorithms/alg-graph2.js', 'js/algorithms/alg-tree.js', 'js/algorithms/alg-dp.js', 'js/app.js'];
// 浏览器中多个 <script> 共享同一全局作用域；jsdom 的 window.eval 每次独立作用域，
// 因此把所有脚本拼成一个整体在单次 eval 内执行，保证 Tracer 等顶层声明互相可见。
const combined = files.map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n');
window.eval(combined);

const AV = window.AV;
const CUSTOM = [
  "var t = new Array1DTracer('冒泡排序');",
  "var log = new LogTracer('过程日志');",
  "var a = [5, 2, 9, 1, 7, 3, 8, 4, 6, 0];",
  "t.set(a);",
  "log.println('初始: ' + a);",
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
  "    } else {",
  "      log.println('ok');",
  "    }",
  "    t.depatch();",
  "    t.deselect();",
  "  }",
  "}",
  "t.done();",
  "log.println('完成: ' + a);",
  ""
].join('\n');

const codeEditor = doc.getElementById('codeEditor');
const codeWrap = doc.getElementById('codeWrap');
const btnCustom = doc.getElementById('btnCustom');
const btnRun = doc.getElementById('btnRun');
const canvasStack = doc.getElementById('canvasStack');
const title = doc.getElementById('algTitle');

let problems = [];
function check(cond, msg) { if (!cond) problems.push(msg); else console.log('OK   ' + msg); }
const wait = ms => new Promise(r => setTimeout(r, ms));

// 0) 等初始自动运行的微任务 settles，避免与自定义运行竞态（贴近真实交互时序）
(async function main() {
  for (let i = 0; i < 40; i++) {
    if (AV.commands.length > 0) break;
    await wait(50);
  }

  // 1) 初始：编辑器隐藏
  check(codeEditor.style.display === 'none', '初始自定义编辑器隐藏');
  check(codeWrap.style.display !== 'none', '初始代码面板可见');

  // 2) 点“自定义代码”进入编辑
  btnCustom.click();
  check(codeEditor.style.display !== 'none', '点击后编辑器显示');
  check(codeWrap.style.display === 'none', '点击后代码面板隐藏');
  check(title.textContent === '自定义代码', '标题变为“自定义代码”');
  check(codeEditor.value.indexOf('Array1DTracer') > 0, '编辑器预填示例代码');

  // 3) 填入自定义代码并运行
  codeEditor.value = CUSTOM;
  btnRun.click();
  for (let i = 0; i < 40; i++) {
    if (AV.commands.length > 0 && canvasStack.children.length > 0) break;
    await wait(50);
  }
  check(AV.commands.length > 0, '自定义代码产生命令流 (' + AV.commands.length + ' 条)');
  check(canvasStack.children.length >= 1, '右侧生成可视化画布 (' + canvasStack.children.length + ' 个)');
  const heads = Array.prototype.map.call(canvasStack.querySelectorAll('.tracer-head b'), e => e.textContent);
  check(heads.indexOf('冒泡排序') >= 0, '画布含“冒泡排序”Array1DTracer');
  check(heads.indexOf('过程日志') >= 0, '画布含“过程日志”LogTracer');

  // 4) 退出编辑
  btnCustom.click();
  check(codeEditor.style.display === 'none', '再点击后编辑器隐藏');
  check(codeWrap.style.display !== 'none', '再点击后代码面板恢复');

  AV.stop();
  console.log(problems.length ? ('\nDOM 测试 FAIL: ' + problems.join(' | ')) : '\nDOM 测试 PASS：自定义编辑器接线与可视化全部正常');
  process.exit(problems.length ? 1 : 0);
})();

