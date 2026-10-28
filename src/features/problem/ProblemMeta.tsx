import type { ProblemMeta as Meta, TestSuite } from '@/domain/types';
import styles from './problem.module.css';

const compareLabel = (mode: TestSuite['compare']): string => {
  if (mode === 'unordered') return '순서 무관';
  if (mode === 'float') return '오차 1e-9 허용';
  if (mode.startsWith('float:')) return `오차 ${mode.slice(6)} 허용`;
  return '값이 정확히 같아야 정답';
};

export function ProblemMeta({ meta, suite }: { meta: Meta; suite: TestSuite }) {
  return (
    <header>
      <h1 className={styles.title}>{meta.title}</h1>
      <div className={styles.meta}>
        <span className={styles.lv}>Lv. {meta.level}</span>
        <span>시간 제한 {suite.timeLimitMs.toLocaleString()}ms</span>
        <span>
          공개 {suite.public.length} · 숨김 {suite.hidden.length}
        </span>
        <span>{compareLabel(suite.compare)}</span>
      </div>
    </header>
  );
}
