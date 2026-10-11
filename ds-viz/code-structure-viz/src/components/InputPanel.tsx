import { useState } from 'react';
import { ChevronDown, Terminal, CornerDownLeft } from 'lucide-react';
import { useRunnerStore } from '@/store/useRunnerStore';
import { cn } from '@/lib/utils';

export default function InputPanel() {
  const inputOpen = useRunnerStore((s) => s.inputOpen);
  const toggleInput = useRunnerStore((s) => s.toggleInput);
  const stdin = useRunnerStore((s) => s.stdin);
  const setStdin = useRunnerStore((s) => s.setStdin);
  const status = useRunnerStore((s) => s.status);
  const [focused, setFocused] = useState(false);

  return (
    <div
      className={cn(
        'flex shrink-0 flex-col border-t border-line-soft bg-base-elevated transition-all duration-300',
        inputOpen ? 'h-40' : 'h-9',
      )}
    >
      <button
        type="button"
        onClick={() => toggleInput()}
        className="flex h-9 w-full items-center justify-between px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted transition-colors hover:text-ink"
      >
        <span className="flex items-center gap-2">
          <Terminal size={13} className="text-amber" />
          标准输入 <span className="text-ink-faint normal-case tracking-normal">stdin</span>
          {status === 'running' && (
            <span className="ml-1 flex h-1.5 w-1.5 rounded-full bg-amber animate-pulse-dot" />
          )}
        </span>
        <ChevronDown
          size={14}
          className={cn('transition-transform duration-300', inputOpen ? '' : '-rotate-90')}
        />
      </button>

      {inputOpen && (
        <div className="relative flex-1 overflow-hidden">
          <textarea
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            spellCheck={false}
            placeholder={'在此输入 stdin，每行回车结束…\n例如：\n42\nAlice\n'}
            className={cn(
              'h-full w-full resize-none bg-transparent px-3 pb-3 font-code text-[13px] leading-relaxed text-ink',
              'placeholder:text-ink-faint/70 focus:outline-none',
              'border-l-2 transition-colors',
              focused ? 'border-l-amber' : 'border-l-transparent',
            )}
          />
          <div className="pointer-events-none absolute bottom-1.5 right-3 flex items-center gap-1 text-[10px] text-ink-faint">
            <CornerDownLeft size={10} /> 换行即输入
          </div>
        </div>
      )}
    </div>
  );
}
