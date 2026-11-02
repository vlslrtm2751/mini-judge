import type { ReactElement } from 'react';
import styles from './Mark.module.css';

export type MarkKind = 'pass' | 'fail' | 'error' | 'timeout' | 'running' | 'pending' | 'wip' | 'none';

export function Mark({ kind, className }: { kind: MarkKind; className?: string }): ReactElement {
  const classes = [styles.mark, className].filter(Boolean).join(' ');
  return <span className={classes} data-mark={kind} aria-hidden="true" />;
}
