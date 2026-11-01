/**
 * 채점 워커를 만든다. 별도 모듈로 둔 이유는 테스트에서 갈아끼우기 위해서다 —
 * jsdom에는 Worker가 없어, 로드 실패 같은 경로를 이 지점에서만 흉내낼 수 있다.
 */
export function createWorker(): Worker {
  return new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
}
