import { useMemo } from 'react';
import CodeMirror, { EditorView } from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { yaml } from '@codemirror/lang-yaml';
import { StreamLanguage } from '@codemirror/language';
import { shell } from '@codemirror/legacy-modes/mode/shell';
import { oneDark } from '@codemirror/theme-one-dark';
import { SnippetLanguage } from '@/lib/types';

interface Props {
  value: string;
  onChange: (v: string) => void;
  language: SnippetLanguage;
  height?: string;
  placeholder?: string;
}

export default function CodeEditor({ value, onChange, language, height = '320px', placeholder }: Props) {
  const extensions = useMemo(() => {
    const ext = [
      EditorView.lineWrapping,
      EditorView.theme({
        '&': { fontSize: '13px', backgroundColor: 'transparent' },
        '.cm-gutters': { backgroundColor: 'hsl(var(--secondary))', border: 'none' },
        '.cm-content': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' },
      }),
    ];
    if (language === 'PYTHON') ext.push(python());
    else if (language === 'YAML') ext.push(yaml());
    else ext.push(StreamLanguage.define(shell));
    return ext;
  }, [language]);

  return (
    <div className="overflow-hidden rounded-md border border-border bg-[#282c34]">
      <CodeMirror
        value={value}
        onChange={onChange}
        theme={oneDark}
        extensions={extensions}
        height={height}
        placeholder={placeholder}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLine: true,
          highlightActiveLineGutter: true,
          foldGutter: false,
          indentOnInput: true,
          bracketMatching: true,
          autocompletion: true,
          tabSize: 2,
        }}
      />
    </div>
  );
}
