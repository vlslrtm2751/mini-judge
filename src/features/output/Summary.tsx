import type { RunReport } from '@/domain/types';
import styles from './output.module.css';

export function Summary({ report }: { report: RunReport }) {
  const perfect = report.total > 0 && report.passed === report.total;
  const scoreClass = perfect ? `${styles.score} ${styles.scorePerfect}` : styles.score;

  return (
    <div className={styles.summary}>
      {typeof report.score === 'number' ? <span className={scoreClass}>{report.score}점</span> : null}
      <div className={styles.summaryText}>
        <strong>
          {report.passed}/{report.total} 통과
        </strong>
        {report.cancelled ? <span className={styles.summarySub}>중지됨</span> : null}
      </div>
    </div>
  );
}
