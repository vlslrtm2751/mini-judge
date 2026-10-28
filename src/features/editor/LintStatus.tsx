import { checkSyntax } from '@/runner/syntax';
import styles from '@/features/workspace/chrome.module.css';

export function LintStatus({ code }: { code: string }) {
  const err = checkSyntax(code);
  return (
    <span className={styles.lint} data-state={err ? 'error' : 'ok'}>
      <span>{err ? `${err.line}번째 줄: ${err.message}` : '문법 오류 없음'}</span>
    </span>
  );
}
