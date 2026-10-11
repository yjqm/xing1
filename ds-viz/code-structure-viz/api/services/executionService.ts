/**
 * 执行服务编排器
 *
 * 三级降级策略（参照智慧课堂「实验室模块」的代码运行环境）：
 *   1. 本地编译器（gcc/clang）—— 最快，支持完整交互
 *   2. Judge0 CE 公开实例  —— 免费、无需 Key，实验室模块同款
 *   3. Wandbox 公开 API    —— 最后兜底，Judge0 限流/故障时使用
 */
import { detectCompiler, type CompilerInfo } from './compilerDetector';
import { runLocal } from './localRunner';
import { runJudge0, JUDGE0_COMPILER_LABEL } from './judge0Runner';
import { runWandbox } from './wandboxRunner';
import type { RunRequest, RunResponse, HealthResponse } from '@shared/types';

type Backend = 'local' | 'remote';

interface ResolvedBackend {
  backend: Backend;
  compiler: CompilerInfo | null;
  label: string;
}

let cached: ResolvedBackend | null = null;

async function resolveBackend(): Promise<ResolvedBackend> {
  if (cached) return cached;
  const compiler = await detectCompiler();
  if (compiler) {
    cached = { backend: 'local', compiler, label: compiler.version };
  } else {
    cached = {
      backend: 'remote',
      compiler: null,
      label: JUDGE0_COMPILER_LABEL,
    };
  }
  return cached;
}

export async function getHealth(): Promise<HealthResponse> {
  const { backend, label } = await resolveBackend();
  return { status: 'ok', compiler: label, backend };
}

/**
 * 远程执行：Judge0 优先，失败后退到 Wandbox
 */
async function runRemote(req: RunRequest): Promise<RunResponse> {
  try {
    return await runJudge0(req);
  } catch (err: unknown) {
    const e = err as Error;
    try {
      const wandboxResult = await runWandbox(req);
      return {
        ...wandboxResult,
        stderr: (
          wandboxResult.stderr + `\n[Judge0 不可用，已回退至 Wandbox：${e.message}]`
        ).trim(),
      };
    } catch (fallbackErr: unknown) {
      const fe = fallbackErr as Error;
      throw new Error(
        `在线编译服务全部不可用。Judge0：${e.message}；Wandbox：${fe.message}`,
      );
    }
  }
}

export async function executeCode(req: RunRequest): Promise<RunResponse> {
  const resolved = await resolveBackend();

  if (resolved.backend === 'local' && resolved.compiler) {
    try {
      return await runLocal(req, resolved.compiler);
    } catch (err: unknown) {
      // 本地执行异常时，回退到远程以保证可用性
      const e = err as Error;
      const remoteResult = await runRemote(req);
      return {
        ...remoteResult,
        stderr: (
          remoteResult.stderr + `\n[本地执行失败，已回退至远程：${e.message}]`
        ).trim(),
      };
    }
  }

  return runRemote(req);
}
