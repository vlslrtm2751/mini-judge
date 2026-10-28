import { useEffect, useRef } from 'react';
import { useRunStore } from '@/stores/runStore';
import styles from './output.module.css';

export function TerminalView() {
  const lines = useRunStore((s) => s.terminal);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, [lines]);

  // 스크롤러와 pre를 분리한다. pre 자신이 스크롤러면 white-space:pre인 긴 한 줄이
  // 컨테이너 폭을 밀어내 패널 바깥까지 넘친다.
  return (
    <div ref={ref} className={styles.terminal}>
      <pre className={styles.terminalText}>
        {lines.map((line, idx) => (
          <div key={idx}>{line.text}</div>
        ))}
        <div className={styles.cursor}>$</div>
      </pre>
    </div>
  );
}
