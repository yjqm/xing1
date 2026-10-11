/**
 * Wandbox 在线代码执行服务（远程后端）
 * 当本地无编译器时作为回退方案，调用公共 Wandbox API 以 gcc-13.2.0-c 编译执行 C 代码。
 * 文档：https://github.com/melpon/wandbox/blob/master/kisaragi-docs/API.md
 */
import type { RunRequest, RunResponse } from '@shared/types';

const WANDBOX_ENDPOINT = 'https://wandbox.org/api/compile.json';
const COMPILER = 'gcc-13.2.0-c';
const COMPILER_LABEL = 'Wandbox · gcc-13.2.0-c (远程)';
const REQUEST_TIMEOUT_MS = 30000;

interface WandboxResponse {
  status?: string;        // 程序退出码（编译失败时为编译器退出码）
  signal?: string;
  compiler_output?: string;
  compiler_error?: string;
  compiler_message?: string;
  program_output?: string;
  program_error?: string;
  program_message?: string;
}

function parseIntOrNull(v: string | undefined): number | null {
  if (v === undefined || v === '') return null;
  const n = Number.parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

export async function runWandbox(req: RunRequest): Promise<RunResponse> {
  const body = {
    code: req.code,
    compiler: COMPILER,
    stdin: req.stdin ?? '',
    save: false,
    'auto-compile': true,
  };

  const start = Date.now();
  const res = await fetch(WANDBOX_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`Wandbox API 请求失败：HTTP ${res.status}`);
  }

  const data = (await res.json()) as WandboxResponse;
  const executionTime = Date.now() - start;

  const compilerErrorText = `${data.compiler_output ?? ''}\n${data.compiler_error ?? ''}`.trim();
  const programOutput = data.program_output ?? '';
  const programError = data.program_error ?? '';
  const hasProgramOutput =
    programOutput.trim() !== '' || programError.trim() !== '' || (data.program_message ?? '').trim() !== '';

  // 判定编译错误：gcc 错误行包含 ": error:"；或程序未产出但编译器报错
  const compileError =
    /:\s*error:/i.test(compilerErrorText) ||
    (!hasProgramOutput && (data.status ?? '0') !== '0' && compilerErrorText !== '');

  const compileOutput = compilerErrorText;

  if (compileError) {
    return {
      success: false,
      compileOutput: compileOutput || '编译失败',
      compileError: true,
      stdout: '',
      stderr: '',
      exitCode: null,
      executionTime,
      signal: null,
      backend: 'remote',
      compiler: COMPILER_LABEL,
    };
  }

  const exitCode = parseIntOrNull(data.status);
  const signal = data.signal && data.signal !== '' ? data.signal : null;

  return {
    success: exitCode === 0,
    compileOutput,
    compileError: false,
    stdout: programOutput,
    stderr: programError,
    exitCode,
    executionTime,
    signal,
    backend: 'remote',
    compiler: COMPILER_LABEL,
  };
}
