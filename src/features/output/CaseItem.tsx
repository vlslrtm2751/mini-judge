import type { CaseResult, CaseStatus } from '@/domain/types';
import styles from './output.module.css';

function label(status: CaseStatus): string {
  if (status === 'pass') return '통과';
  if (status === 'fail') return '실패';
  if (status === 'error') return '오류';
  if (status === 'timeout') return '시간 초과';
  if (status === 'running') return '채점 중';
  return '대기';
}

function formatMs(ms: number): string {
  if (ms < 1) return `${ms.toFixed(2)}ms`;
  if (ms < 100) return `${ms.toFixed(1)}ms`;
  return `${Math.round(ms).toLocaleString()}ms`;
}

export function CaseItem({
  index,
  item,
}: {
  index: number;
  item: { status: CaseStatus; hidden: boolean; result?: CaseResult };
}) {
  const { result } = item;
  const hasDetail = Boolean(result?.actual || result?.error);

  return (
    <li className={styles.case} data-status={item.status}>
      <div className={styles.caseHead}>
        <span className={styles.mark} aria-hidden="true" />
        <span className={styles.caseName}>#{index + 1}</span>
        <span className={styles.chip}>{label(item.status)}</span>
        {item.hidden ? <span className={styles.hiddenTag}>숨김</span> : null}
        {result?.timeMs != null ? <span className={styles.time}>{formatMs(result.timeMs)}</span> : null}
      </div>
      {hasDetail ? (
        <dl className={styles.detail}>
          {result?.actual ? (
            <div>
              <dt>결과</dt>
              <dd>
                <pre>{result.actual}</pre>
              </dd>
            </div>
          ) : null}
          {result?.error ? (
            <div>
              <dt>오류</dt>
              <dd>
                <pre className={styles.err}>
                  {result.error.name}: {result.error.message}
                </pre>
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </li>
  );
}
