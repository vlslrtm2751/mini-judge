import { toggleComment } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { linter } from '@codemirror/lint';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { useMemo, useRef } from 'react';
import { checkSyntax } from '@/runner/syntax';

export function CodeEditor({
  code,
  onChange,
  onToggleComment,
}: {
  code: string;
  onChange(code: string): void;
  onToggleComment(fn: () => void): void;
}) {
  const ref = useRef<ReactCodeMirrorRef>(null);
  const syntaxLinter = useMemo(
    () =>
      linter((view) => {
        const err = checkSyntax(view.state.doc.toString());
        if (!err) return [];
        const line = view.state.doc.line(err.line);
        return [
          {
            from: line.from + err.column - 1,
            to: line.from + err.column,
            severity: 'error',
            message: err.message,
          },
        ];
      }),
    [],
  );

  return (
    <CodeMirror
      ref={ref}
      value={code}
      height="100%"
      onChange={onChange}
      extensions={[javascript(), syntaxLinter]}
      onCreateEditor={(editor) => {
        onToggleComment(() => {
          toggleComment(editor);
          editor.focus();
        });
      }}
    />
  );
}
