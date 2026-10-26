import type { Fatal } from '@/domain/types';

export function FatalError({ fatal }: { fatal: Fatal }) {
  return (
    <div style={{ padding: 12, border: '1px solid var(--border)' }}>
      <h3>치명적 오류</h3>
      <p>{fatal.reason}</p>
      {fatal.error ? <pre>{[`${fatal.error.name}: ${fatal.error.message}`, ...fatal.error.frames].join('\n')}</pre> : null}
    </div>
  );
}
