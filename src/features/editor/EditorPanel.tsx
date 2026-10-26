import type { Problem } from '@/domain/types';
import { CodeEditor } from './CodeEditor';
import { LintStatus } from './LintStatus';

export function EditorPanel({
  problem,
  code,
  onCode,
  onToggleComment,
}: {
  problem: Problem;
  code: string;
  onCode(code: string): void;
  onToggleComment(fn: () => void): void;
}) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
        <span>solution.js</span>
        <LintStatus code={code} />
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <CodeEditor code={code} onChange={onCode} onToggleComment={onToggleComment} />
      </div>
      <div style={{ padding: 8, borderTop: '1px solid var(--border)', fontSize: 12 }}>
        {problem.meta.id}
      </div>
    </section>
  );
}
