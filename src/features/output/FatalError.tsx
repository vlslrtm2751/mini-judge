import type { Fatal } from '@/domain/types';
import styles from './output.module.css';

const reasonLabel: Record<Fatal['reason'], string> = {
  syntax: '문법 오류라 실행하지 못했습니다',
  'no-solution': 'solution 함수를 찾지 못했습니다',
  'top-level-error': '코드를 불러오는 중 오류가 났습니다',
  'top-level-timeout': '코드를 불러오는 데 시간이 너무 오래 걸렸습니다',
};

export function FatalError({ fatal }: { fatal: Fatal }) {
  return (
    <div className={styles.fatal}>
      <h3 className={styles.fatalTitle}>{reasonLabel[fatal.reason]}</h3>
      {fatal.error ? (
        <pre>{[`${fatal.error.name}: ${fatal.error.message}`, ...fatal.error.frames].join('\n')}</pre>
      ) : null}
      <p>어떤 테스트도 채점하지 못했습니다. 코드를 고치고 다시 실행해 주세요.</p>
    </div>
  );
}
