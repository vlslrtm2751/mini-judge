import type { Problem } from '@/domain/types';
import { ProblemMeta } from './ProblemMeta';
import { MarkdownView } from './MarkdownView';
import { ExamplesTable } from './ExamplesTable';

export function ProblemPanel({ problem }: { problem: Problem }) {
  const marker = '<!-- examples -->';
  const [before, after = ''] = problem.markdown.includes(marker)
    ? problem.markdown.split(marker)
    : [problem.markdown, ''];

  return (
    <section style={{ padding: 12, overflow: 'auto', height: '100%' }}>
      <ProblemMeta meta={problem.meta} suite={problem.suite} />
      <MarkdownView markdown={before} />
      <ExamplesTable suite={problem.suite} />
      <MarkdownView markdown={after} />
    </section>
  );
}
