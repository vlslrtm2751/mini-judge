import type { CaseResult, CaseStatus } from '@/domain/types';

function label(status: CaseStatus): string {
  if (status === 'pass') return '통과';
  if (status === 'fail') return '실패';
  if (status === 'error') return '오류';
  if (status === 'timeout') return '시간 초과';
  if (status === 'running') return '실행 중';
  return '대기';
}

export function CaseItem({ index, item }: { index: number; item: { status: CaseStatus; hidden: boolean; result?: CaseResult } }) {
  return (
    <article style={{ border: '1px solid var(--border)', padding: 8, marginBottom: 8 }}>
      <strong>
        #{index + 1} {item.hidden ? '(숨김)' : '(공개)'} - {label(item.status)}
      </strong>
      {item.result?.actual ? <p>결과값: {item.result.actual}</p> : null}
      {item.result?.error ? <p>{item.result.error.name}: {item.result.error.message}</p> : null}
    </article>
  );
}
