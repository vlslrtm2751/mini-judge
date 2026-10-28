import type { Problem } from '@/domain/types';
import { ProblemMeta } from './ProblemMeta';
import { MarkdownView } from './MarkdownView';
import { ExamplesTable } from './ExamplesTable';
import styles from './problem.module.css';

// 제목은 meta.json이 출처이고 ProblemMeta가 그린다. problem.md도 같은 제목을
// 선두 h1으로 갖고 있어 그대로 두면 화면에 두 번 나온다.
const stripLeadingTitle = (markdown: string): string => markdown.replace(/^\s*#\s+.*(\r?\n)?/, '');

export function ProblemPanel({ problem }: { problem: Problem }) {
  const marker = '<!-- examples -->';
  const [rawBefore, after = ''] = problem.markdown.includes(marker)
    ? problem.markdown.split(marker)
    : [problem.markdown, ''];
  const before = stripLeadingTitle(rawBefore);

  return (
    <section className={styles.panel}>
      <div className={styles.body}>
        <ProblemMeta meta={problem.meta} suite={problem.suite} />
        <div className={styles.md}>
          <MarkdownView markdown={before} />
        </div>
        <ExamplesTable suite={problem.suite} />
        <div className={styles.md}>
          <MarkdownView markdown={after} />
        </div>
      </div>
    </section>
  );
}
