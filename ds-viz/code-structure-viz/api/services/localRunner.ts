/**
 * 本地编译执行服务
 * 使用检测到的编译器编译 main.c，沙箱化执行二进制，捕获输出。
 */
import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'node:os';
import type { CompilerInfo } from './compilerDetector';
import type { RunRequest, RunResponse } from '@shared/types';

const execFileAsync = promisify(execFile);

const MAX_OUTPUT = 1024 * 1024; // 1MB
const RUN_TIMEOUT_MS = 5000;
const COMPILE_TIMEOUT_MS = 10000;

interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: string | null;
  timedOut: boolean;
}

/** 使用 spawn 执行二进制，通过 stdin 管道传入输入 */
function runExecutable(
  command: string,
  args: string[],
  stdin: string,
  timeoutMs: number,
  maxOutput: number,
): Promise<ExecResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let settled = false;

    const finish = (result: ExecResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const truncate = (s: string): string =>
      s.length > maxOutput ? `${s.slice(0, maxOutput)}\n[输出已截断]` : s;

    child.stdout.on('data', (d: Buffer) => {
      stdout += d.toString();
    });
    child.stderr.on('data', (d: Buffer) => {
      stderr += d.toString();
    });

    if (stdin) {
      child.stdin.on('error', () => {});
      child.stdin.write(stdin);
    }
    child.stdin.end();

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill('SIGKILL');
      } catch {
        /* ignore */
      }
    }, timeoutMs);

    child.on('error', (err: Error) => {
      clearTimeout(timer);
      finish({
        stdout: truncate(stdout),
        stderr: truncate(`${stderr}\n${err.message}`),
        exitCode: null,
        signal: null,
        timedOut: false,
      });
    });

    child.on('close', (code: number | null, signal: string | null) => {
      clearTimeout(timer);
      finish({
        stdout: truncate(stdout),
        stderr: truncate(stderr),
        exitCode: code,
        signal,
        timedOut,
      });
    });
  });
}

export async function runLocal(
  req: RunRequest,
  compiler: CompilerInfo,
): Promise<RunResponse> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'crun-'));
  const srcFile = path.join(tmpDir, 'main.c');
  const isWin = process.platform === 'win32';
  const outFile = path.join(tmpDir, isWin ? 'main.exe' : 'main');

  try {
    await fs.promises.writeFile(srcFile, req.code, 'utf8');

    // 编译
    let compileOutput = '';
    try {
      const result = await execFileAsync(
        compiler.name,
        [srcFile, '-o', outFile, '-Wall', '-std=c11', '-O0'],
        { timeout: COMPILE_TIMEOUT_MS, maxBuffer: MAX_OUTPUT, windowsHide: true },
      );
      compileOutput = `${result.stdout || ''}${result.stderr || ''}`.trim();
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string; message?: string };
      const output = `${e.stdout || ''}${e.stderr || ''}${e.message || ''}`.trim();
      return {
        success: false,
        compileOutput: output || '编译失败（未知错误）',
        compileError: true,
        stdout: '',
        stderr: '',
        exitCode: null,
        executionTime: 0,
        signal: null,
        backend: 'local',
        compiler: compiler.version,
      };
    }

    // 执行
    const start = Date.now();
    const exec = await runExecutable(
      outFile,
      [],
      req.stdin ?? '',
      RUN_TIMEOUT_MS,
      MAX_OUTPUT,
    );
    const executionTime = Date.now() - start;

    return {
      success: exec.exitCode === 0 && !exec.timedOut,
      compileOutput,
      compileError: false,
      stdout: exec.stdout,
      stderr: exec.stderr,
      exitCode: exec.exitCode,
      executionTime,
      signal: exec.timedOut ? 'TIMEOUT' : exec.signal,
      backend: 'local',
      compiler: compiler.version,
    };
  } finally {
    // 清理临时目录（异步，忽略错误）
    fs.rm(tmpDir, { recursive: true, force: true }, () => {});
  }
}
