import { Play, Square, Trash2, Eraser, RotateCcw, Library, Minus, Plus, type LucideIcon } from 'lucide-react';
import { useRunnerStore } from '@/store/useRunnerStore';
import { cn } from '@/lib/utils';

function IconButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  tone = 'default',
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'default' | 'danger';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        'group flex h-8 items-center gap-1.5 rounded px-2.5 text-xs font-medium',
        'border border-line-soft text-ink-muted',
        'transition-all duration-150',
        'hover:border-line hover:text-ink hover:bg-base-hover',
        'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
        tone === 'danger' && 'hover:text-err hover:border-err/40',
      )}
    >
      <Icon size={14} className="transition-transform group-hover:scale-110" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

/** 触发 Monaco 重新缩进（由 CodeEditor 注册到 window） */
function formatCode() {
  const trigger = (window as unknown as { __crunFormat?: () => void }).__crunFormat;
  if (trigger) trigger();
}

export default function Toolbar() {
  const status = useRunnerStore((s) => s.status);
  const fontSize = useRunnerStore((s) => s.fontSize);
  const run = useRunnerStore((s) => s.run);
  const stop = useRunnerStore((s) => s.stop);
  const clearOutput = useRunnerStore((s) => s.clearOutput);
  const resetCode = useRunnerStore((s) => s.resetCode);
  const toggleExamples = useRunnerStore((s) => s.toggleExamples);

  const running = status === 'running';

  return (
    <div className="relative flex h-12 shrink-0 items-center justify-between border-b border-line-soft bg-base-elevated px-3">
      {/* 左侧：示例库 */}
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => toggleExamples()}
          className="flex h-8 items-center gap-2 rounded border border-line-soft px-3 text-xs font-medium text-ink-muted transition-all hover:border-amber/50 hover:text-amber"
        >
          <Library size={14} />
          <span className="hidden sm:inline">示例库</span>
        </button>
      </div>

      {/* 中间：运行 / 停止（绝对居中） */}
      <div className="absolute left-1/2 -translate-x-1/2">
        {running ? (
          <button
            type="button"
            onClick={stop}
            className="flex h-9 items-center gap-2 rounded border border-err/60 bg-err/15 px-5 text-sm font-bold text-err shadow-[0_0_20px_rgba(255,107,107,0.3)] transition-all hover:bg-err/25 active:scale-95"
          >
            <Square size={15} className="fill-current" />
            <span>停止</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void run()}
            className="group relative flex h-9 items-center gap-2 overflow-hidden bg-gradient-to-r from-amber-dim to-amber px-6 text-sm font-extrabold text-base shadow-glow transition-all hover:shadow-glow-strong hover:-translate-y-px active:translate-y-0 active:scale-95"
          >
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            <Play size={15} className="fill-base relative" />
            <span className="relative tracking-wide">运行</span>
            <kbd className="relative ml-1 hidden rounded bg-base/30 px-1.5 py-0.5 text-[10px] font-medium text-base/70 md:inline">⌘↵</kbd>
          </button>
        )}
      </div>

      {/* 右侧：工具组 */}
      <div className="flex items-center gap-1.5">
        <IconButton icon={RotateCcw} label="重置代码" onClick={resetCode} />
        <IconButton icon={Eraser} label="格式化缩进" onClick={formatCode} />
        <IconButton icon={Trash2} label="清空输出" onClick={clearOutput} tone="danger" />
        <div className="mx-1 h-5 w-px bg-line-soft" />
        <button
          type="button"
          onClick={() => useRunnerStore.getState().adjustFontSize(-1)}
          title="缩小字号"
          aria-label="缩小字号"
          className="flex h-8 w-7 items-center justify-center rounded border border-line-soft text-ink-muted transition-all hover:border-line hover:text-ink hover:bg-base-hover"
        >
          <Minus size={13} />
        </button>
        <span className="w-8 text-center font-mono text-[11px] text-ink-muted">{fontSize}</span>
        <button
          type="button"
          onClick={() => useRunnerStore.getState().adjustFontSize(1)}
          title="放大字号"
          aria-label="放大字号"
          className="flex h-8 w-7 items-center justify-center rounded border border-line-soft text-ink-muted transition-all hover:border-line hover:text-ink hover:bg-base-hover"
        >
          <Plus size={13} />
        </button>
      </div>
    </div>
  );
}
