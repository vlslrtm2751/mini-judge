import { CodeEditor } from './CodeEditor';
import { LintStatus } from './LintStatus';
import styles from '@/features/workspace/chrome.module.css';

export function EditorPanel({
  code,
  onCode,
  onToggleComment,
}: {
  code: string;
  onCode(code: string): void;
  onToggleComment(fn: () => void): void;
}) {
  return (
    <section className={styles.editorPanel}>
      <div className={styles.editorBar}>
        <span className={styles.fileTab}>
          solution.js <span className={styles.fileTag}>JS</span>
        </span>
        <LintStatus code={code} />
      </div>
      <div className={styles.editorHost}>
        <CodeEditor code={code} onChange={onCode} onToggleComment={onToggleComment} />
      </div>
    </section>
  );
}
