import type { RunReport } from '@/domain/types';

export function Summary({ report }: { report: RunReport }) {
  return (
    <div style={{ marginTop: 12 }}>
      <strong>
        {report.passed}/{report.total}
      </strong>
      {typeof report.score === 'number' ? <p>점수: {report.score}</p> : null}
      {report.cancelled ? <p>중지됨</p> : null}
    </div>
  );
}
