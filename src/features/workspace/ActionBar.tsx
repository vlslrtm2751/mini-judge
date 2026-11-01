import { useRunStore } from '@/stores/runStore';
import { useState } from 'react';
import { Button } from '@/ui/Button';
import styles from './chrome.module.css';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
const MOD = isMac ? '⌘' : 'Ctrl';

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
        // 실수로 눌렀을 때 되돌릴 방법이 없으면 확인 문구가 영영 남고, 다음에
        // 진짜로 누를 때 한 번에 초기화된다.
        onBlur={() => setConfirmReset(false)}
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
      {/* 제출과 중지는 구현돼 있는데 안내가 없어 아무도 모르던 단축키다.
          좁은 화면에서는 이 줄이 숨으므로 버튼의 title로도 노출한다. */}
      <span className={styles.kbdHint}>
        <kbd>{MOD}</kbd>+<kbd>Enter</kbd> 실행 · <kbd>{MOD}</kbd>+<kbd>Shift</kbd>+<kbd>Enter</kbd> 제출 ·{' '}
        <kbd>Esc</kbd> 중지
      </span>
      <span className={styles.grow} />
      {phase === 'running' ? (
        <Button onClick={onStop} title="Esc">
          중지
        </Button>
      ) : (
        <Button onClick={onRunTest} title={`${MOD}+Enter`}>
          테스트 실행
        </Button>
      )}
      <Button variant="primary" onClick={onSubmit} disabled={phase === 'running'} title={`${MOD}+Shift+Enter`}>
        제출
      </Button>
    </footer>
  );
}
