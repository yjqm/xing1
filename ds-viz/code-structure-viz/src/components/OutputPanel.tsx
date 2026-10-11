import { Terminal as TerminalIcon, AlertTriangle, Wrench, CheckCircle2, XCircle, Clock, type LucideIcon } from 'lucide-react';
import { useRunnerStore, type OutputTab } from '@/store/useRunnerStore';
import { cn } from '@/lib/utils';

const TABS: { key: OutputTab; label: string; icon: LucideIcon }[] = [
  { key: 'output', label: '输出', icon: TerminalIcon },
  { key: 'stderr', label: '错误', icon: AlertTriangle },
  { key: 'compile', label: '编译信息', icon: Wrench },
];

function EmptyState({ status }: { status: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-ink-faint">
      <div className="font-code text-2xl text-amber/40">$</div>
      <p className="text-xs">
        {status === 'running' ? '正在运行…' : '点击「运行」按钮或按下 ⌘/Ctrl + ↵ 执行代码'}
      </p>
    </div>
  );
}

function Content({ text, tone }: { text: string; tone: 'out' | 'err' | 'compile' }) {
  if (!text.trim()) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-ink-faint">
        无内容
      </div>
    );
  }
  return (
    <pre
      className={cn(
        'reveal-line h-full overflow-auto px-4 py-3 font-code text-[13px] leading-relaxed whitespace-pre-wrap break-words border-l-2',
        tone === 'out' && 'text-ink border-l-amber/30',
        tone === 'err' && 'text-err border-l-err/50',
        tone === 'compile' && 'text-amber border-l-amber/50',
      )}
    >
      {text}
    </pre>
  );
}

export default function OutputPanel() {
  const result = useRunnerStore((s) => s.result);
  const status = useRunnerStore((s) => s.status);
  const activeTab = useRunnerStore((s) => s.activeTab);
  const setActiveTab = useRunnerStore((s) => s.setActiveTab);

  const hasResult = !!result;
  const content: Record<OutputTab, string> = {
    output: result?.stdout ?? '',
    stderr: result?.stderr ?? '',
    compile: result?.compileOutput ?? '',
  };
  const counts: Record<OutputTab, number> = {
    output: content.output ? content.output.split('\n').length : 0,
    stderr: content.stderr ? content.stderr.split('\n').length : 0,
    compile: content.compile ? content.compile.split('\n').length : 0,
  };

  return (
    <div className="flex h-full flex-col bg-base">
      {/* 标签栏 */}
      <div className="flex h-9 shrink-0 items-center border-b border-line-soft bg-base-elevated px-2">
        {TABS.map((t) => {
          const active = activeTab === t.key;
          const has = counts[t.key] > 0;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={cn(
                'relative flex h-full items-center gap-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider transition-colors',
                active ? 'text-amber' : 'text-ink-muted hover:text-ink',
              )}
            >
              <Icon size={12} />
              {t.label}
              {has && (
                <span
                  className={cn(
                    'rounded px-1 text-[9px] font-bold',
                    active ? 'bg-amber/20 text-amber' : 'bg-base-hover text-ink-faint',
                  )}
                >
                  {counts[t.key]}
                </span>
              )}
              {active && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-amber shadow-glow" />
              )}
            </button>
          );
        })}

        {/* 右侧状态徽章 */}
        <div className="ml-auto flex items-center gap-3 pr-1 text-[10px] text-ink-faint">
          {hasResult && result?.exitCode !== null && result?.exitCode !== undefined && (
            <span className="flex items-center gap-1">
              {result?.success ? (
                <CheckCircle2 size={11} className="text-ok" />
              ) : (
                <XCircle size={11} className="text-err" />
              )}
              <span className={result?.success ? 'text-ok' : 'text-err'}>
                exit {result?.exitCode}
              </span>
            </span>
          )}
          {hasResult && result?.executionTime !== undefined && result?.executionTime > 0 && (
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {result?.executionTime}ms
            </span>
          )}
          {hasResult && result?.signal && (
            <span className="flex items-center gap-1 text-err">
              <AlertTriangle size={11} />
              {result?.signal === 'TIMEOUT' ? '超时终止' : result?.signal}
            </span>
          )}
        </div>
      </div>

      {/* 内容区 */}
      <div className="relative flex-1 overflow-hidden">
        {!hasResult ? (
          <EmptyState status={status} />
        ) : (
          <Content
            text={content[activeTab]}
            tone={activeTab === 'output' ? 'out' : activeTab === 'stderr' ? 'err' : 'compile'}
          />
        )}
      </div>
    </div>
  );
}
