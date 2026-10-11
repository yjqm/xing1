import { X, FileCode2, ArrowRight } from 'lucide-react';
import { useRunnerStore } from '@/store/useRunnerStore';
import { EXAMPLES } from '@/data/examples';
import { cn } from '@/lib/utils';

export default function ExamplesDrawer() {
  const open = useRunnerStore((s) => s.examplesOpen);
  const toggle = useRunnerStore((s) => s.toggleExamples);
  const loadExample = useRunnerStore((s) => s.loadExample);

  return (
    <>
      {/* 遮罩 */}
      <div
        className={cn(
          'fixed inset-0 z-30 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => toggle(false)}
      />

      {/* 抽屉 */}
      <aside
        className={cn(
          'fixed left-0 top-14 bottom-7 z-40 flex w-80 flex-col border-r border-line-soft bg-base-elevated shadow-panel transition-transform duration-300',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-10 shrink-0 items-center justify-between border-b border-line-soft px-4">
          <h2 className="font-display text-xs font-bold uppercase tracking-wider text-amber">
            示例代码库
          </h2>
          <button
            type="button"
            onClick={() => toggle(false)}
            className="flex h-6 w-6 items-center justify-center rounded text-ink-muted transition-colors hover:bg-base-hover hover:text-ink"
            aria-label="关闭"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-auto p-3">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.id}
              type="button"
              onClick={() => loadExample(ex)}
              className="group flex w-full items-start gap-3 rounded border border-line-soft bg-base-soft p-3 text-left transition-all hover:border-amber/50 hover:bg-base-hover"
            >
              <FileCode2 size={16} className="mt-0.5 shrink-0 text-amber/70 transition-colors group-hover:text-amber" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-sm font-semibold text-ink">{ex.title}</span>
                  <ArrowRight
                    size={13}
                    className="shrink-0 -translate-x-1 text-ink-faint opacity-0 transition-all group-hover:translate-x-0 group-hover:text-amber group-hover:opacity-100"
                  />
                </div>
                <p className="mt-0.5 truncate text-[11px] text-ink-faint">{ex.desc}</p>
                <span className="mt-2 inline-block rounded bg-amber/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-amber">
                  {ex.tag}
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="shrink-0 border-t border-line-soft px-4 py-2.5">
          <p className="font-mono text-[10px] text-ink-faint">
            选择示例后将自动载入代码与输入
          </p>
        </div>
      </aside>
    </>
  );
}
