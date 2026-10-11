"""Local-only C++ compile/run service with category-specific trace instrumentation."""
from __future__ import annotations
import json
import os
import re
import shutil
import subprocess
import tempfile
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SITE_ROOT = Path(os.environ.get('SITE_ROOT', ROOT)).resolve()
RUNS = ROOT / ".runtime-runs"
COMPAT = ROOT / "compat"
VCVARS = Path(r"C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat")

TRACE_HEADER = r'''
#include <iostream>
#include <sstream>
#include <queue>
#include <vector>
#include <algorithm>
#include <string>
namespace __av {
template<class T> std::string str(const T& v){ std::ostringstream s; s<<v; return s.str(); }
inline std::string esc(std::string s){ std::string o; for(char c:s){ if(c=='"'||c=='\\')o+='\\'; if(c=='\n')o+="\\n"; else o+=c; } return o; }
inline void emit(const std::string& s){ std::cerr<<"__AV_TRACE__"<<s<<"\n"; }
struct FrameGuard { std::string name,args; int line; FrameGuard(std::string n,std::string a,int l):name(n),args(a),line(l){emit("{\"type\":\"enter\",\"name\":\""+esc(name)+"\",\"args\":\""+esc(args)+"\",\"line\":"+str(line)+"}");} ~FrameGuard(){emit("{\"type\":\"exit\",\"name\":\""+esc(name)+"\"}");}};
template<class T> void queue_state(std::queue<T> q,const char* name,int line){ std::string a="["; bool first=true; while(!q.empty()){if(!first)a+=","; first=false; a+="\""+esc(str(q.front()))+"\"";q.pop();} a+="]";emit("{\"type\":\"queue\",\"name\":\""+esc(name)+"\",\"items\":"+a+",\"line\":"+str(line)+"}");}
template<class T> void value_state(const char* name,const std::string& index,const T& value,int line){emit("{\"type\":\"value\",\"name\":\""+esc(name)+"\",\"index\":\""+esc(index)+"\",\"value\":\""+esc(str(value))+"\",\"line\":"+str(line)+"}");}
template<class T, size_t N> void array_state(const T (&a)[N],const char* name,int line){std::string items="[";for(size_t i=0;i<N;i++){if(i)items+=",";items+="\""+esc(str(a[i]))+"\"";}items+="]";emit("{\"type\":\"array\",\"name\":\""+esc(name)+"\",\"items\":"+items+",\"line\":"+str(line)+"}");}
template<class T> void array_state(const std::vector<T>& a,const char* name,int line){std::string items="[";for(size_t i=0;i<a.size();i++){if(i)items+=",";items+="\""+esc(str(a[i]))+"\"";}items+="]";emit("{\"type\":\"array\",\"name\":\""+esc(name)+"\",\"items\":"+items+",\"line\":"+str(line)+"}");}
template<class T> void probe_state(const char* name,const std::string& index,const T& value,int line){emit("{\"type\":\"probe\",\"name\":\""+esc(name)+"\",\"index\":\""+esc(index)+"\",\"value\":\""+esc(str(value))+"\",\"line\":"+str(line)+"}");}
}
'''

def param_trace(params: str) -> str:
    parts = []
    for raw in params.split(','):
        raw = raw.strip().split('=')[0].strip()
        match = re.search(r'([A-Za-z_]\w*)\s*(?:\[\s*\])?$', raw)
        if match and not re.search(r'\b(?:void|const)\s*$', raw):
            name = match.group(1)
            if re.search(r'\b(?:int|long|short|char|bool|float|double|string)\b', raw):
                parts.append(f'"{name}=" + __av::str({name})')
    return ' + ", " + '.join(parts) if parts else '""'

def instrument_dfs(code: str) -> tuple[str, list[str]]:
    pattern = re.compile(r'((?:void|int|bool|long\s+long|double)\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*)\{')
    definitions = list(pattern.finditer(code))
    recursive = []
    for match in definitions:
        name = match.group(2)
        if name != 'main' and len(re.findall(rf'\b{re.escape(name)}\s*\(', code)) > 1:
            recursive.append(name)
    if not recursive:
        return code, []
    pieces, cursor = [], 0
    for match in definitions:
        pieces.append(code[cursor:match.end()])
        name = match.group(2)
        if name in recursive:
            args = param_trace(match.group(3))
            line_no = code.count('\n', 0, match.start()) + 1
            pieces.append(f'\n__av::FrameGuard __av_guard_{match.start()}("{name}", {args}, {line_no});\n')
        cursor = match.end()
    pieces.append(code[cursor:])
    return ''.join(pieces), recursive

def instrument_bfs(code: str) -> tuple[str, list[str]]:
    queues = re.findall(r'(?:std\s*::\s*)?queue\s*<[^;>]+>\s*([A-Za-z_]\w*)', code)
    for name in dict.fromkeys(queues):
        escaped = re.escape(name)
        statement = re.compile(rf'({escaped}\s*\.\s*(?:push|pop|emplace)\s*\([^;]*\)\s*;)')
        original = code
        code = statement.sub(lambda m: m.group(1) + f' __av::queue_state({name}, "{name}", {original.count(chr(10),0,m.start())+1});', original)
    return code, list(dict.fromkeys(queues))

def instrument_dp(code: str) -> tuple[str, list[str]]:
    pattern = re.compile(r'\b([A-Za-z_]\w*)((?:\s*\[[^\[\]]+\])+?)\s*(?:[+\-*/%]?=)\s*[^;]+;')
    pieces, cursor, arrays = [], 0, []
    for match in pattern.finditer(code):
        line_start = code.rfind('\n', 0, match.start()) + 1
        prefix = code[line_start:match.start()]
        if re.search(r'\b(?:int|long|short|char|bool|float|double|auto|vector)\s*$', prefix) or '++' in match.group(2) or '--' in match.group(2):
            continue
        name, access = match.group(1), re.sub(r'\s+', '', match.group(2))
        indices = re.findall(r'\[([^\]]+)\]', access)
        index_expr = ' + "," + '.join(f'__av::str({item})' for item in indices)
        line_no = code.count('\n', 0, match.start()) + 1
        pieces.append(code[cursor:match.end()])
        pieces.append(f' __av::value_state("{name}", {index_expr}, {name}{access}, {line_no});')
        cursor = match.end(); arrays.append(name)
    pieces.append(code[cursor:])
    return ''.join(pieces), list(dict.fromkeys(arrays))

def sequence_names(code: str) -> list[str]:
    vectors = re.findall(r'(?:std\s*::\s*)?vector\s*<[^;>]+>\s*([A-Za-z_]\w*)', code)
    arrays = re.findall(r'\b(?:int|long|short|char|bool|float|double)\s+([A-Za-z_]\w*)\s*\[', code)
    return list(dict.fromkeys(vectors + arrays))

def instrument_sort(code: str) -> tuple[str, list[str]]:
    names = sequence_names(code)
    if not names:
        return code, []
    for name in names:
        escaped = re.escape(name)
        # Capture both std::swap(a[i], a[j]) and direct a[i] = ... updates.
        swap = re.compile(rf'((?:std\s*::\s*)?swap\s*\(\s*{escaped}\s*\[[^\]]+\]\s*,\s*{escaped}\s*\[[^\]]+\]\s*\)\s*;)')
        original = code
        code = swap.sub(lambda m: m.group(1) + f' __av::array_state({name}, "{name}", {original.count(chr(10), 0, m.start()) + 1});', code)
        assign = re.compile(rf'({escaped}\s*\[[^\]]+\]\s*(?:[+\-*/%]?=)\s*[^;]+;)')
        original = code
        code = assign.sub(lambda m: m.group(1) + f' __av::array_state({name}, "{name}", {original.count(chr(10), 0, m.start()) + 1});', code)
    return code, names

def instrument_search(code: str) -> tuple[str, list[str]]:
    names = sequence_names(code)
    if not names:
        return code, []
    for name in names:
        escaped = re.escape(name)
        # Record the actual inspected value immediately before a comparison branch.
        pattern = re.compile(rf'(if\s*\(\s*)({escaped}\s*\[([^\]]+)\])')
        original = code
        code = pattern.sub(lambda m: f'__av::probe_state("{name}", __av::str({m.group(3)}), {m.group(2)}, {original.count(chr(10), 0, m.start()) + 1}); {m.group(1)}{m.group(2)}', code)
    return code, names

def instrument_backtrack(code: str) -> tuple[str, list[str]]:
    traced, functions = instrument_dfs(code)
    traced, arrays = instrument_dp(traced)
    return traced, list(dict.fromkeys(functions + arrays))

def instrument(code: str, mode: str) -> tuple[str, list[str]]:
    if mode in {'dfs', 'tree'}:
        body, found = instrument_dfs(code)
    elif mode == 'bfs':
        body, found = instrument_bfs(code)
    elif mode == 'dp':
        body, found = instrument_dp(code)
    elif mode == 'sort':
        body, found = instrument_sort(code)
    elif mode == 'search':
        body, found = instrument_search(code)
    elif mode == 'backtrack':
        body, found = instrument_backtrack(code)
    else:
        body, found = code, []
    return TRACE_HEADER + '\n' + body, found

def compile_and_run(code: str, stdin: str, mode: str) -> dict:
    source, found = instrument(code, mode)
    if not found:
        label = {'dfs':'递归函数','tree':'递归遍历函数','bfs':'std::queue','dp':'数组状态更新','sort':'数组或 vector 的交换/更新','search':'数组或 vector 中的比较分支','backtrack':'递归函数或状态数组'}.get(mode,'算法结构')
        return {'ok': False, 'stage': 'analyze', 'error': f'该专区没有识别到 {label}，变量名可自由定义，但需使用对应的标准代码结构。'}
    RUNS.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(dir=RUNS) as temp:
        work = Path(temp)
        src = work / 'main.cpp'
        exe = work / ('program.exe' if os.name == 'nt' else 'program')
        src.write_text(source, encoding='utf-8')
        if os.name == 'nt' and VCVARS.exists():
            build_script = work / 'compile.bat'
            build_script.write_text(
                f'@call "{VCVARS}" >nul\n@cl /nologo /utf-8 /std:c++17 /EHsc /Od /I"{COMPAT}" "{src}" /Fe:"{exe}"\n',
                encoding='utf-8',
            )
            command = ['cmd.exe', '/d', '/c', str(build_script)]
        else:
            compiler = shutil.which('g++') or shutil.which('clang++')
            if not compiler:
                return {'ok': False, 'stage': 'server', 'error': '未找到 C++ 编译器。Linux 请安装 g++，Windows 请安装 Visual Studio C++ 工具。'}
            command = [compiler, '-std=c++17', '-O0', '-I', str(COMPAT), str(src), '-o', str(exe)]
        built = subprocess.run(command, cwd=work, text=True, encoding='utf-8', errors='replace', capture_output=True, timeout=25)
        if built.returncode:
            return {'ok': False, 'stage': 'compile', 'error': (built.stdout + built.stderr)[-12000:]}
        try:
            ran = subprocess.run([str(exe)], input=stdin, cwd=work, text=True, encoding='utf-8', errors='replace', capture_output=True, timeout=5)
        except subprocess.TimeoutExpired:
            return {'ok': False, 'stage': 'run', 'error': '程序运行超过 5 秒，已终止。请检查死循环或输入。'}
        events, errors = [], []
        for line in ran.stderr.splitlines():
            if line.startswith('__AV_TRACE__'):
                try: events.append(json.loads(line[len('__AV_TRACE__'):]))
                except json.JSONDecodeError: pass
            else: errors.append(line)
        return {'ok': ran.returncode == 0, 'stage': 'done', 'exitCode': ran.returncode, 'stdout': ran.stdout, 'stderr': '\n'.join(errors), 'events': events[:10000], 'symbols': found}

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs): super().__init__(*args, directory=str(SITE_ROOT), **kwargs)
    def do_POST(self):
        if self.path != '/api/trace': self.send_error(404); return
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if size > 500_000: raise ValueError('代码过大')
            data = json.loads(self.rfile.read(size))
            result = compile_and_run(str(data.get('code','')), str(data.get('input','')), str(data.get('mode','dfs')))
            payload = json.dumps(result, ensure_ascii=False).encode('utf-8')
            self.send_response(200); self.send_header('Content-Type','application/json; charset=utf-8'); self.send_header('Content-Length',str(len(payload))); self.end_headers(); self.wfile.write(payload)
        except Exception as exc:
            payload = json.dumps({'ok':False,'stage':'server','error':str(exc)},ensure_ascii=False).encode('utf-8')
            self.send_response(500); self.send_header('Content-Type','application/json; charset=utf-8'); self.send_header('Content-Length',str(len(payload))); self.end_headers(); self.wfile.write(payload)
    def log_message(self, fmt, *args): print(fmt % args)

if __name__ == '__main__':
    if os.environ.get('ALLOW_UNSAFE_CPP_RUNTIME') != '1':
        raise SystemExit(
            '安全保护：该服务会编译并执行用户提交的 C++。'
            '仅在隔离的本机开发环境中设置 ALLOW_UNSAFE_CPP_RUNTIME=1 后启动。'
        )
    host = os.environ.get('HOST', '127.0.0.1')
    if host not in {'127.0.0.1', 'localhost', '::1'} and os.environ.get('ALLOW_REMOTE_CPP_RUNTIME') != '1':
        raise SystemExit('拒绝绑定公网地址；如已配置容器/资源限制，请额外设置 ALLOW_REMOTE_CPP_RUNTIME=1。')
    port = int(os.environ.get('PORT', '8765'))
    page = 'runtime-lab.html' if SITE_ROOT == ROOT else 'algorithm-visualizer/runtime-lab.html'
    print(f'Website: http://{host}:{port}/{page}', flush=True)
    ThreadingHTTPServer((host, port), Handler).serve_forever()
