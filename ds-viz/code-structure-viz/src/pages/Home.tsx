import { useEffect } from 'react';
import { useRunnerStore } from '@/store/useRunnerStore';
import { getHealth } from '@/lib/api';
import Header from '@/components/Header';
import Toolbar from '@/components/Toolbar';
import CodeEditor from '@/components/CodeEditor';
import InputPanel from '@/components/InputPanel';
import OutputPanel from '@/components/OutputPanel';
import StatusBar from '@/components/StatusBar';
import ExamplesDrawer from '@/components/ExamplesDrawer';

export default function Home() {
  const setCompiler = useRunnerStore((s) => s.setCompiler);

  // 启动时获取编译器信息
  useEffect(() => {
    let alive = true;
    getHealth()
      .then((h) => {
        if (alive) setCompiler(h.compiler, h.backend);
      })
      .catch(() => {
        if (alive) setCompiler('未连接', 'remote');
      });
    return () => {
      alive = false;
    };
  }, [setCompiler]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-base text-ink">
      <Header />

      <div className="relative flex flex-1 overflow-hidden">
        <ExamplesDrawer />

        <main className="flex flex-1 flex-col overflow-hidden">
          <Toolbar />

          <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
            {/* 编辑器列 */}
            <section className="flex min-h-0 flex-1 flex-col overflow-hidden border-b border-line-soft lg:border-b-0 lg:border-r">
              <div className="min-h-0 flex-1 overflow-hidden">
                <CodeEditor />
              </div>
              <InputPanel />
            </section>

            {/* 输出列 */}
            <section className="flex min-h-[35%] flex-1 flex-col overflow-hidden lg:min-h-0 lg:max-w-[46%]">
              <OutputPanel />
            </section>
          </div>
        </main>
      </div>

      <StatusBar />
    </div>
  );
}
