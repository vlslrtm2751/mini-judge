import type { ProblemMeta as Meta, TestSuite } from '@/domain/types';

export function ProblemMeta({ meta, suite }: { meta: Meta; suite: TestSuite }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <h1>{meta.title}</h1>
      <p>
        레벨 {meta.level} · 제한 {suite.timeLimitMs}ms · 공개 {suite.public.length} / 숨김 {suite.hidden.length} · 비교 {suite.compare}
      </p>
    </div>
  );
}
