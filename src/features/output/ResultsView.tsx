import { useRunStore } from '@/stores/runStore';
import { CaseItem } from './CaseItem';
import { Summary } from './Summary';
import { FatalError } from './FatalError';

export function ResultsView() {
  const phase = useRunStore((s) => s.phase);
  const cases = useRunStore((s) => s.cases);
  const report = useRunStore((s) => s.report);

  if (cases.length === 0 && !report) return <p style={{ padding: 12 }}>테스트 실행 또는 제출을 눌러 주세요.</p>;

  if (report?.fatal) return <FatalError fatal={report.fatal} />;

  return (
    <div style={{ padding: 12 }}>
      {cases.map((item, i) => (
        <CaseItem key={i} index={i} item={item} />
      ))}
      {phase === 'idle' && report ? <Summary report={report} /> : null}
    </div>
  );
}
