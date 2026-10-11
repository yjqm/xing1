/**
 * 本地 C 编译器探测
 * 在 PATH 中查找 gcc / tcc / clang / cc，返回首个可用的编译器信息。
 */
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const CANDIDATES = ['gcc', 'tcc', 'clang', 'cc'];

export interface CompilerInfo {
  name: string;
  version: string;
}

export async function detectCompiler(): Promise<CompilerInfo | null> {
  for (const name of CANDIDATES) {
    try {
      const { stdout } = await execFileAsync(name, ['--version'], {
        timeout: 5000,
        windowsHide: true,
      });
      const version = stdout.split('\n').find((l) => l.trim())?.trim() ?? `${name} (unknown version)`;
      return { name, version };
    } catch {
      // 当前候选不可用，尝试下一个
    }
  }
  return null;
}
