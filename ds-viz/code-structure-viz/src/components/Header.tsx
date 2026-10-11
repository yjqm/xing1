import { Cpu, Globe, Zap } from 'lucide-react';
import { useRunnerStore } from '@/store/useRunnerStore';
import { cn } from '@/lib/utils';

export default function Header() {
  const compiler = useRunnerStore((s) => s.compiler);
  const backend = useRunnerStore((s) => s.backend);

  return (
    <header className="relative flex h-14 shrink-0 items-center justify-between border-b border-line-soft bg-base-elevated px-4">
      {/* 背景网格装饰 */}
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" />

      {/* 左：Logo */}
      <div className="relative flex items-center gap-3">
        <div className="relative flex h-8 w-8 items-center justify-center rounded border border-amber/40 bg-amber/10 shadow-glow">
          <span className="font-display text-sm font-extrabold text-amber text-glow">C</span>
          <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 animate-pulse-dot rounded-full bg-amber" />
        </div>
        <div className="leading-none">
          <h1 className="font-display text-base font-extrabold tracking-tight text-ink">
            C<span className="text-amber">//</span>RUN
          </h1>
          <p className="mt-0.5 font-mono text-[10px] text-ink-faint">在线 C 语言运行平台</p>
        </div>
      </div>

      {/* 右：编译器徽章 + 链接 */}
      <div className="relative flex items-center gap-2">
        <span
          className={cn(
            'hidden items-center gap-1.5 rounded border px-2.5 py-1 font-mono text-[10px] font-medium sm:flex',
            backend === 'local'
              ? 'border-ok/40 bg-ok/10 text-ok'
              : backend === 'remote'
                ? 'border-info/40 bg-info/10 text-info'
                : 'border-line-soft bg-base-soft text-ink-muted',
          )}
          title={compiler}
        >
          {backend === 'local' ? <Zap size={11} /> : <Cpu size={11} />}
          {backend === 'local' ? '本地' : backend === 'remote' ? '远程' : '…'} · {compiler}
        </span>
        <a
          href="https://wandbox.org"
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-8 w-8 items-center justify-center rounded border border-line-soft text-ink-muted transition-all hover:border-amber/50 hover:text-amber"
          title="Wandbox 执行引擎"
          aria-label="Wandbox 执行引擎"
        >
          <Globe size={15} />
        </a>
      </div>
    </header>
  );
}
