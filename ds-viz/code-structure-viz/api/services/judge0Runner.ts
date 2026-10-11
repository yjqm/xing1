/**
 * Judge0 CE 在线代码执行服务（远程后端）
 *
 * 参照智慧课堂项目「实验室模块」的代码运行环境实现：
 * 使用 Judge0 CE 社区公开实例，免费、无需 API Key、CORS 开放。
 *
 * 与实验室模块的差异：
 * - 统一使用 base64_encoded=true 传输，避免源码/输出含中文时
 *   Judge0 返回 "cannot be converted to UTF-8" 错误。
 * - 采用「提交 + 轮询」而非 wait=true，公开实例在高负载下更稳定。
 *
 * 文档：https://ce.judge0.com/docs
 */
import type { RunRequest, RunResponse } from '@shared/types';

/** Judge0 CE 社区公开实例（无需 key，直接调用） */
export const JUDGE0_URL = 'https://ce.judge0.com';

/** C (GCC 9.4.0) —— 与实验室模块 JUDGE0_LANG_ID.c 保持一致 */
const LANGUAGE_ID_C = 50;

const COMPILER_LABEL = 'Judge0 CE · GCC 9.4.0 (远程)';

/** 单次 HTTP 请求超时 */
const REQUEST_TIMEOUT_MS = 20000;
/** 轮询间隔与最大次数（最长约 24 秒） */
const POLL_INTERVAL_MS = 800;
const POLL_MAX_TIMES = 30;

/** CPU 时间上限（秒）与内存上限（KB） */
const CPU_TIME_LIMIT = 5;
const MEMORY_LIMIT = 128000;

interface Judge0Status {
  id: number;
  description: string;
}

interface Judge0Result {
  stdout?: string | null;
  stderr?: string | null;
  compile_output?: string | null;
  message?: string | null;
  exit_code?: number | null;
  time?: string | null;
  memory?: number | null;
  status?: Judge0Status;
}

/**
 * Judge0 状态码语义：
 * 1 In Queue / 2 Processing / 3 Accepted / 4 Wrong Answer / 5 Time Limit Exceeded
 * 6 Compilation Error / 7~12 Runtime Error (SIGSEGV/SIGXFSZ/SIGFPE/SIGABRT/NZEC/Other)
 * 13 Internal Error / 14 Exec Format Error
 */
const STATUS_ACCEPTED = 3;
const STATUS_TIME_LIMIT_EXCEEDED = 5;
const STATUS_COMPILATION_ERROR = 6;

function encode(text: string): string {
  return Buffer.from(text, 'utf8').toString('base64');
}

function decode(text: string | null | undefined): string {
  if (!text) return '';
  return Buffer.from(text, 'base64').toString('utf8');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 提交代码到 Judge0 并轮询取回结果
 */
async function submitAndPoll(req: RunRequest): Promise<Judge0Result> {
  const submitRes = await fetch(
    `${JUDGE0_URL}/submissions?base64_encoded=true&wait=false`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_code: encode(req.code),
        language_id: LANGUAGE_ID_C,
        stdin: encode(req.stdin ?? ''),
        cpu_time_limit: CPU_TIME_LIMIT,
        memory_limit: MEMORY_LIMIT,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  );

  if (!submitRes.ok) {
    throw new Error(
      `提交失败，Judge0 服务暂时不可用 (HTTP ${submitRes.status})`,
    );
  }

  const { token } = (await submitRes.json()) as { token?: string };
  if (!token) throw new Error('Judge0 未返回提交 token');

  for (let i = 0; i < POLL_MAX_TIMES; i++) {
    await sleep(POLL_INTERVAL_MS);

    const getRes = await fetch(
      `${JUDGE0_URL}/submissions/${token}?base64_encoded=true`,
      { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) },
    );
    if (!getRes.ok) continue;

    const result = (await getRes.json()) as Judge0Result;
    // status.id >= 3 表示已完成（无论成功与否）
    if (result.status && result.status.id >= STATUS_ACCEPTED) {
      return result;
    }
  }

  throw new Error('获取结果超时，Judge0 排队时间过长');
}

/**
 * 编译并执行 C 代码，返回项目统一的 RunResponse 结构
 */
export async function runJudge0(req: RunRequest): Promise<RunResponse> {
  const start = Date.now();
  const result = await submitAndPoll(req);
  const wallTime = Date.now() - start;

  const statusId = result.status?.id ?? 0;
  const statusDesc = result.status?.description ?? '未知状态';

  const stdout = decode(result.stdout);
  const stderr = decode(result.stderr);
  const compileOutput = decode(result.compile_output);
  const message = decode(result.message);

  // Judge0 的 time 是「程序运行秒数」，比端到端墙钟时间更贴近真实耗时
  const cpuMs = result.time ? Math.round(Number.parseFloat(result.time) * 1000) : null;
  const executionTime = cpuMs !== null && !Number.isNaN(cpuMs) ? cpuMs : wallTime;

  // ── 编译错误 ──
  if (statusId === STATUS_COMPILATION_ERROR) {
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

  // ── 超时 ──
  if (statusId === STATUS_TIME_LIMIT_EXCEEDED) {
    return {
      success: false,
      compileOutput,
      compileError: false,
      stdout,
      stderr: stderr || `执行超时（超过 ${CPU_TIME_LIMIT} 秒）`,
      exitCode: null,
      executionTime,
      signal: 'TIMEOUT',
      backend: 'remote',
      compiler: COMPILER_LABEL,
    };
  }

  // ── 正常结束 / 运行时错误 ──
  const exitCode = result.exit_code ?? (statusId === STATUS_ACCEPTED ? 0 : null);
  const runtimeError = statusId > STATUS_COMPILATION_ERROR;

  return {
    success: statusId === STATUS_ACCEPTED,
    compileOutput,
    compileError: false,
    stdout,
    stderr: stderr || (runtimeError ? [statusDesc, message].filter(Boolean).join('\n') : ''),
    exitCode,
    executionTime,
    signal: runtimeError && !exitCode ? statusDesc : null,
    backend: 'remote',
    compiler: COMPILER_LABEL,
  };
}

export const JUDGE0_COMPILER_LABEL = COMPILER_LABEL;
