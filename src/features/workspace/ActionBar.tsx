import { useRunStore } from '@/stores/runStore';
import { useState } from 'react';
import { Button } from '@/ui/Button';
import styles from './chrome.module.css';

export function ActionBar({
  onRunTest,
  onSubmit,
  onStop,
  onReset,
}: {
  onRunTest(): void;
  onSubmit(): void;
  onStop(): void;
  onReset(): void;
}) {
  const phase = useRunStore((s) => s.phase);
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <footer className={styles.actions}>
      <Button
        variant="ghost"
        onClick={() => {
          if (!confirmReset) {
            setConfirmReset(true);
            return;
          }
          onReset();
          setConfirmReset(false);
        }}
      >
        {confirmReset ? '정말 초기화?' : '초기화'}
      </Button>
      <span className={styles.kbdHint}>
        <kbd>Ctrl</kbd> + <kbd>Enter</kbd> 테스트 실행
      </span>
      <span className={styles.grow} />
      {phase === 'running' ? (
        <Button onClick={onStop}>중지</Button>
      ) : (
        <Button onClick={onRunTest}>테스트 실행</Button>
      )}
      <Button variant="primary" onClick={onSubmit} disabled={phase === 'running'}>
        제출
      </Button>
    </footer>
  );
}
