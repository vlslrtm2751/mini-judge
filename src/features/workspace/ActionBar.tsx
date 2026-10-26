import { useRunStore } from '@/stores/runStore';
import { useState } from 'react';

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
    <footer style={{ display: 'flex', gap: 8, padding: 8, borderTop: '1px solid var(--border)' }}>
      <button
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
      </button>
      {phase === 'running' ? <button onClick={onStop}>중지</button> : <button onClick={onRunTest}>테스트 실행</button>}
      <button onClick={onSubmit} disabled={phase === 'running'}>
        제출
      </button>
      <span style={{ marginLeft: 'auto', opacity: 0.7 }}>⌘/Ctrl+Enter 실행 · ⌘/Ctrl+Shift+Enter 제출 · Esc 중지</span>
    </footer>
  );
}
