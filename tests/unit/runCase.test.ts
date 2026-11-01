import { describe, expect, it, vi } from 'vitest';

const createWorker = vi.hoisted(() => vi.fn());
vi.mock('@/runner/createWorker', () => ({ createWorker }));

const { runCase } = await import('@/runner/runCase');

/** 메시지를 하나도 보내지 않는 워커. 스크립트 로드 자체가 실패한 상황을 흉내낸다. */
class SilentWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
}

const options = (signal: AbortSignal) => ({
  index: 0,
  hidden: false,
  code: 'function solution(){ return 1; }',
  input: [] as never[],
  expected: 1 as never,
  compare: 'exact' as const,
  timeLimitMs: 50,
  signal,
  onLog: () => undefined,
});

describe('runCase', () => {
  it('워커 로드 실패를 가드 타임아웃이 아니라 즉시 보고한다', async () => {
    const worker = new SilentWorker();
    createWorker.mockReturnValue(worker);

    const pending = runCase(options(new AbortController().signal));

    // 브라우저가 워커 스크립트를 못 불러오면 error 이벤트만 온다.
    worker.onerror?.(new Error('Failed to load worker script'));

    // 지금은 아무도 onerror를 듣지 않아 timeLimitMs + 4000 뒤에야 끝난다.
    // 그 사이 사용자는 "시간 초과"를 보고 자기 코드가 느리다고 오해한다.
    const settled = await Promise.race([
      pending,
      new Promise((resolve) => setTimeout(() => resolve({ neverReported: true }), 500)),
    ]);

    expect(settled).toMatchObject({ fatal: { reason: 'worker-failed' } });
  });

  it('로드 실패를 보고한 뒤 워커를 정리한다', async () => {
    const worker = new SilentWorker();
    createWorker.mockReturnValue(worker);

    const pending = runCase(options(new AbortController().signal));
    worker.onerror?.(new Error('boom'));
    await Promise.race([pending, new Promise((r) => setTimeout(r, 500))]);

    expect(worker.terminate).toHaveBeenCalled();
  });
});
