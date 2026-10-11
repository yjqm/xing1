import { useRef } from 'react';
import Editor, { type BeforeMount, type OnMount } from '@monaco-editor/react';
import { useRunnerStore } from '@/store/useRunnerStore';

/**
 * 自定义 Monaco 主题：深色终端美学
 */
const THEME_NAME = 'crun-dark';

const beforeMount: BeforeMount = (monaco) => {
  monaco.editor.defineTheme(THEME_NAME, {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: '', foreground: 'd7dae0' },
      { token: 'keyword', foreground: 'ffb454', fontStyle: 'bold' },
      { token: 'keyword.cpp', foreground: 'ffb454' },
      { token: 'control', foreground: 'ffb454' },
      { token: 'string', foreground: '7fd962' },
      { token: 'string.cpp', foreground: '7fd962' },
      { token: 'number', foreground: 'c792ea' },
      { token: 'number.cpp', foreground: 'c792ea' },
      { token: 'comment', foreground: '5c6470', fontStyle: 'italic' },
      { token: 'comment.cpp', foreground: '5c6470', fontStyle: 'italic' },
      { token: 'identifier', foreground: 'd7dae0' },
      { token: 'type', foreground: '5fb3ff' },
      { token: 'type.cpp', foreground: '5fb3ff' },
      { token: 'delimiter', foreground: '8b94a3' },
      { token: 'delimiter.cpp', foreground: '8b94a3' },
      { token: 'namespace', foreground: 'c792ea' },
    ],
    colors: {
      'editor.background': '#0a0e14',
      'editor.foreground': '#d7dae0',
      'editorLineNumber.foreground': '#3a4150',
      'editorLineNumber.activeForeground': '#ffb454',
      'editor.selectionBackground': 'rgba(255,180,84,0.22)',
      'editor.inactiveSelectionBackground': 'rgba(255,180,84,0.10)',
      'editor.lineHighlightBackground': '#11151c',
      'editor.lineHighlightBorder': '#00000000',
      'editorCursor.foreground': '#ffb454',
      'editorWhitespace.foreground': '#1e232b',
      'editorIndentGuide.background': '#1a1f27',
      'editorIndentGuide.activeBackground': '#2a2f37',
      'editorBracketMatch.background': 'rgba(255,180,84,0.15)',
      'editorBracketMatch.border': '#ffb454',
      'editor.findMatchBackground': 'rgba(255,180,84,0.25)',
      'editor.findMatchHighlightBackground': 'rgba(255,180,84,0.12)',
      'editorGutter.background': '#0a0e14',
      'editorWidget.background': '#11151c',
      'editorWidget.border': '#2a2f37',
      'editorSuggestWidget.background': '#11151c',
      'editorSuggestWidget.border': '#2a2f37',
      'editorSuggestWidget.selectedBackground': 'rgba(255,180,84,0.15)',
      'editorHoverWidget.background': '#11151c',
      'editorHoverWidget.border': '#2a2f37',
      'scrollbarSlider.background': '#2a2f3788',
      'scrollbarSlider.hoverBackground': '#3a4150',
      'scrollbarSlider.activeBackground': '#ffb45455',
    },
  });
};

export default function CodeEditor() {
  const code = useRunnerStore((s) => s.code);
  const setCode = useRunnerStore((s) => s.setCode);
  const fontSize = useRunnerStore((s) => s.fontSize);
  const setCursor = useRunnerStore((s) => s.setCursor);
  const run = useRunnerStore((s) => s.run);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  const onMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    editor.onDidChangeCursorPosition((e) => {
      setCursor(e.position.lineNumber, e.position.column);
    });
    // Ctrl/Cmd + Enter 运行
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      void run();
    });
    // 注册格式化句柄供工具栏调用（重新缩进）
    (window as unknown as { __crunFormat?: () => void }).__crunFormat = () => {
      const action = editor.getAction('editor.action.reindentlines');
      void action?.run();
    };
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-base">
      <Editor
        theme={THEME_NAME}
        language="c"
        value={code}
        onChange={(v) => setCode(v ?? '')}
        beforeMount={beforeMount}
        onMount={onMount}
        loading={<div className="flex h-full items-center justify-center text-ink-muted text-sm">加载编辑器…</div>}
        options={{
          fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
          fontLigatures: true,
          fontSize,
          lineHeight: 1.7,
          minimap: { enabled: false },
          lineNumbers: 'on',
          lineNumbersMinChars: 3,
          renderWhitespace: 'selection',
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: 'phase',
          cursorSmoothCaretAnimation: 'on',
          cursorWidth: 2,
          tabSize: 4,
          automaticLayout: true,
          padding: { top: 16, bottom: 16 },
          bracketPairColorization: { enabled: true },
          guides: { bracketPairs: true, indentation: true },
          scrollbar: {
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
            useShadows: false,
          },
          roundedSelection: false,
          overviewRulerBorder: false,
          renderLineHighlight: 'all',
          fixedOverflowWidgets: true,
          wordWrap: 'off',
          suggestFontSize: 12,
          tabCompletion: 'on',
          formatOnPaste: true,
        }}
      />
    </div>
  );
}
