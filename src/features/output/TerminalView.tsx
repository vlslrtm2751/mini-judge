import { useEffect, useRef } from 'react';
import { useRunStore } from '@/stores/runStore';

export function TerminalView() {
  const lines = useRunStore((s) => s.terminal);
  const ref = useRef<HTMLPreElement>(null);

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, [lines]);

  return (
    <pre ref={ref} style={{ margin: 0, padding: 12, overflow: 'auto', height: '100%' }}>
      {lines.map((line, idx) => (
        <div key={idx}>{line.text}</div>
      ))}
      <div>$</div>
    </pre>
  );
}
