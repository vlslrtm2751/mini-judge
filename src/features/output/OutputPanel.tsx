import { useRunStore } from '@/stores/runStore';
import { useUiStore } from '@/stores/uiStore';
import { Button } from '@/ui/Button';
import { ResultsView } from './ResultsView';
import { TerminalView } from './TerminalView';
import styles from './output.module.css';

export function OutputPanel() {
  const tab = useUiStore((s) => s.outputTab);
  const setTab = useUiStore((s) => s.setOutputTab);
  const clear = useRunStore((s) => s.clearTerminal);
  const report = useRunStore((s) => s.report);

  return (
    <section className={styles.panel}>
      {/* role="tab"을 쓰지 않는다. 제대로 하려면 tabpanel 연결과 화살표 키
          내비게이션까지 있어야 하는데, 그것 없이 role만 붙이면 스크린리더에
          잘못된 기대를 심는다. 토글 버튼에 맞는 aria-pressed를 쓴다. */}
      <div className={styles.bar}>
        <button
          type="button"
          className={styles.tab}
          aria-pressed={tab === 'results'}
          onClick={() => setTab('results')}
        >
          결과
        </button>
        <button
          type="button"
          className={styles.tab}
          aria-pressed={tab === 'terminal'}
          onClick={() => setTab('terminal')}
        >
          터미널
        </button>
        <span className={styles.summaryCount}>{report ? `${report.passed}/${report.total}` : ''}</span>
        <Button variant="ghost" className={styles.clear} onClick={clear}>
          지우기
        </Button>
      </div>
      {/* 채점이 끝나도 비시각 사용자에게는 아무 일도 일어나지 않은 것과 같았다.
          항상 떠 있는 live region이라야 내용이 바뀔 때 읽힌다. */}
      <p className="sr-only" role="status" aria-live="polite">
        {report ? `채점 완료, ${report.passed}/${report.total} 통과${report.score != null ? `, ${report.score}점` : ''}` : ''}
      </p>
      <div className={styles.body}>{tab === 'results' ? <ResultsView /> : <TerminalView />}</div>
    </section>
  );
}
