import { create } from 'zustand';
import type { RunResponse } from '@shared/types';
import { runCode } from '@/lib/api';
import { EXAMPLES, type CodeExample } from '@/data/examples';

export type RunStatus = 'idle' | 'running' | 'done' | 'error';
export type OutputTab = 'output' | 'stderr' | 'compile';

interface RunnerState {
  // 代码与输入
  code: string;
  stdin: string;
  // 执行结果
  result: RunResponse | null;
  status: RunStatus;
  // UI 状态
  activeTab: OutputTab;
  fontSize: number;
  examplesOpen: boolean;
  inputOpen: boolean;
  cursor: { line: number; col: number };
  // 编译器信息
  compiler: string;
  backend: 'local' | 'remote' | 'unknown';
  // 当前运行请求的 AbortController
  abortCtrl: AbortController | null;

  // actions
  setCode: (code: string) => void;
  setStdin: (stdin: string) => void;
  setActiveTab: (tab: OutputTab) => void;
  setFontSize: (size: number) => void;
  adjustFontSize: (delta: number) => void;
  toggleExamples: (open?: boolean) => void;
  toggleInput: (open?: boolean) => void;
  setCursor: (line: number, col: number) => void;
  setCompiler: (compiler: string, backend: 'local' | 'remote') => void;
  loadExample: (ex: CodeExample) => void;
  run: () => Promise<void>;
  stop: () => void;
  clearOutput: () => void;
  resetCode: () => void;
}

const DEFAULT_CODE = EXAMPLES[0].code;

export const useRunnerStore = create<RunnerState>((set, get) => ({
  code: DEFAULT_CODE,
  stdin: '',
  result: null,
  status: 'idle',
  activeTab: 'output',
  fontSize: 14,
  examplesOpen: false,
  inputOpen: true,
  cursor: { line: 1, col: 1 },
  compiler: '检测中…',
  backend: 'unknown',
  abortCtrl: null,

  setCode: (code) => set({ code }),
  setStdin: (stdin) => set({ stdin }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setFontSize: (fontSize) => set({ fontSize: Math.min(28, Math.max(11, fontSize)) }),
  adjustFontSize: (delta) =>
    set((s) => ({ fontSize: Math.min(28, Math.max(11, s.fontSize + delta)) })),
  toggleExamples: (open) =>
    set((s) => ({ examplesOpen: open ?? !s.examplesOpen })),
  toggleInput: (open) =>
    set((s) => ({ inputOpen: open ?? !s.inputOpen })),
  setCursor: (line, col) => set({ cursor: { line, col } }),
  setCompiler: (compiler, backend) => set({ compiler, backend }),

  loadExample: (ex) =>
    set({
      code: ex.code,
      stdin: ex.stdin ?? '',
      examplesOpen: false,
      result: null,
      status: 'idle',
      activeTab: 'output',
    }),

  run: async () => {
    const { code, stdin, abortCtrl } = get();
    if (abortCtrl) abortCtrl.abort();

    const controller = new AbortController();
    set({ status: 'running', abortCtrl: controller, activeTab: 'output' });

    try {
      const result = await runCode({ code, stdin }, controller.signal);
      set({
        result,
        status: 'done',
        abortCtrl: null,
        activeTab: result.compileError ? 'compile' : result.stderr ? 'stderr' : 'output',
      });
    } catch (err: unknown) {
      if (controller.signal.aborted) {
        set({ status: 'idle', abortCtrl: null });
        return;
      }
      const e = err as Error;
      set({
        status: 'error',
        abortCtrl: null,
        result: {
          success: false,
          compileOutput: '',
          compileError: false,
          stdout: '',
          stderr: `运行请求失败：${e.message || '未知错误'}`,
          exitCode: null,
          executionTime: 0,
          signal: null,
          backend: 'remote',
          compiler: get().compiler,
        } as RunResponse,
        activeTab: 'stderr',
      });
    }
  },

  stop: () => {
    const { abortCtrl } = get();
    if (abortCtrl) {
      abortCtrl.abort();
      set({ status: 'idle', abortCtrl: null });
    }
  },

  clearOutput: () =>
    set({ result: null, status: 'idle', activeTab: 'output' }),

  resetCode: () =>
    set({ code: DEFAULT_CODE, stdin: '', result: null, status: 'idle' }),
}));
