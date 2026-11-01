import type { Fatal } from '@/domain/types';
import styles from './output.module.css';

const reasonLabel: Record<Fatal['reason'], string> = {
  syntax: '문법 오류라 실행하지 못했습니다',
  'no-solution': 'solution 함수를 찾지 못했습니다',
  'top-level-error': '코드를 불러오는 중 오류가 났습니다',
  'top-level-timeout': '코드를 불러오는 데 시간이 너무 오래 걸렸습니다',
  'worker-failed': '채점기를 불러오지 못했습니다',
};

// 조언은 원인에 따라 갈라야 한다. 채점기를 못 불러온 것은 사용자 코드 문제가
// 아닌데 "코드를 고치라"고 하면 멀쩡한 풀이를 붙들고 헤매게 된다.
const reasonAdvice: Record<Fatal['reason'], string> = {
  syntax: '어떤 테스트도 채점하지 못했습니다. 코드를 고치고 다시 실행해 주세요.',
  'no-solution': 'solution이라는 이름의 함수를 선언했는지 확인해 주세요.',
  'top-level-error': '어떤 테스트도 채점하지 못했습니다. 코드를 고치고 다시 실행해 주세요.',
  'top-level-timeout': '함수 바깥에서 오래 걸리는 작업을 하고 있지 않은지 확인해 주세요.',
  'worker-failed': '풀이가 아니라 채점기 쪽 문제입니다. 새로고침한 뒤 다시 시도해 주세요.',
};

export function FatalError({ fatal }: { fatal: Fatal }) {
  return (
    <div className={styles.fatal}>
      <h3 className={styles.fatalTitle}>{reasonLabel[fatal.reason]}</h3>
      {fatal.error ? (
        <pre>{[`${fatal.error.name}: ${fatal.error.message}`, ...fatal.error.frames].join('\n')}</pre>
      ) : null}
      <p>{reasonAdvice[fatal.reason]}</p>
    </div>
  );
}
