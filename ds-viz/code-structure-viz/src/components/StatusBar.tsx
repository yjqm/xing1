import { useRunnerStore } from '@/store/useRunnerStore';
import { cn } from '@/lib/utils';

function StatusDot({ status, success }: { status: string; success: boolean | null }) {
  let color = 'bg-ink-faint';
  let pulse = false;
  if (status === 'running') {
    color = 'bg-amber';
    pulse = true;
  } else if (status === 'done') {
    color = success ? 'bg-ok' : 'bg-err';
  } else if (status === 'error') {
    color = 'bg-err';
  } else {
    color = 'bg-amber/60';
  }
  return (
    <span className="relative flex h-2 w-2">
      {pulse && <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', color)} />}
      <span className={cn('relative inline-flex h-2 w-2 rounded-full', color, pulse && 'animate-pulse-dot')} />
    </span>
  );
}

const STATUS_LABEL: Record<string, string> = {
  idle: '就绪',
  running: '运行中',
  done: '完成',
  error: '出错',
};

export default function StatusBar() {
  const status = useRunnerStore((s) => s.status);
  const result = useRunnerStore((s) => s.result);
  const cursor = useRunnerStore((s) => s.cursor);
  const code = useRunnerStore((s) => s.code);
  const compiler = useRunnerStore((s) => s.compiler);
  const backend = useRunnerStore((s) => s.backend);

  const success = result ? result.success : null;
  const lineCount = code.split('\n').length;
  const charCount = code.length;

  return (
    <footer className="flex h-7 shrink-0 items-center justify-between border-t border-line-soft bg-base-elevated px-3 font-code text-[10px] text-ink-faint">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-2">
          <StatusDot status={status} success={success} />
          <span className="text-ink-muted">{STATUS_LABEL[status]}</span>
        </span>
        <span className="hidden items-center gap-1 sm:flex">
          <span className="text-amber/70">Ln</span> {cursor.line}
          <span className="ml-1 text-amber/70">Col</span> {cursor.col}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <span className="hidden md:inline">
          {charCount} 字符 · {lineCount} 行
        </span>
        <span className="flex items-center gap-1">
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              backend === 'local' ? 'bg-ok' : backend === 'remote' ? 'bg-info' : 'bg-ink-faint',
            )}
          />
          {backend === 'local' ? '本地编译' : backend === 'remote' ? '远程执行' : '检测中'}
        </span>
        <span className="hidden max-w-[280px] truncate text-ink-faint lg:inline" title={compiler}>
          {compiler}
        </span>
      </div>
    </footer>
  );
}
