import { useRunStore } from '@/stores/runStore';
import { CaseItem } from './CaseItem';
import { Summary } from './Summary';
import { FatalError } from './FatalError';
import styles from './output.module.css';

export function ResultsView() {
  const phase = useRunStore((s) => s.phase);
  const cases = useRunStore((s) => s.cases);
  const report = useRunStore((s) => s.report);

  if (cases.length === 0 && !report) {
    return (
      <div className={styles.empty}>
        <strong>아직 채점하지 않았어요</strong>
        <p>
          <b>테스트 실행</b>은 공개 테스트로 입력값·기댓값·출력을 보여줍니다.
        </p>
        <p>
          <b>제출</b>은 숨김 테스트까지 모두 채점해 점수를 냅니다.
        </p>
      </div>
    );
  }

  if (report?.fatal) return <FatalError fatal={report.fatal} />;

  return (
    <div className={styles.results}>
      <ul className={styles.cases}>
        {cases.map((item, i) => (
          <CaseItem key={i} index={i} item={item} />
        ))}
      </ul>
      {phase === 'idle' && report ? <Summary report={report} /> : null}
    </div>
  );
}
