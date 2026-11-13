import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProblemId, ProblemMeta } from '@/domain/types';
import { countSolved, deriveStatus } from '@/domain/progress';
import { useSubmitStore, type SubmitRecord } from '@/stores/submitStore';

function resetStore(): void {
  localStorage.clear();
  useSubmitStore.setState({ records: {} });
}

describe('deriveStatus', () => {
  it('기록도 draft도 없으면 untried', () => {
    expect(deriveStatus(undefined, false)).toBe('untried');
  });

  it('기록은 없지만 draft가 있으면 wip', () => {
    expect(deriveStatus(undefined, true)).toBe('wip');
  });

  it('제출했지만 통과 못한 기록은 failed', () => {
    const record: SubmitRecord = { passed: 1, total: 3, at: 1 };
    expect(deriveStatus(record, false)).toBe('failed');
  });

  it('통과 기록(solvedAt 있음)은 solved', () => {
    const record: SubmitRecord = { passed: 3, total: 3, at: 1, solvedAt: 1 };
    expect(deriveStatus(record, false)).toBe('solved');
  });

  it('통과한 적이 있으면 이후 제출이 실패해도 solved로 남는다', () => {
    const record: SubmitRecord = { passed: 0, total: 3, at: 2, solvedAt: 1 };
    expect(deriveStatus(record, false)).toBe('solved');
  });

  it('기록이 draft보다 우선한다', () => {
    const record: SubmitRecord = { passed: 1, total: 3, at: 1 };
    expect(deriveStatus(record, true)).toBe('failed');
  });
});

describe('countSolved', () => {
  const metas: ProblemMeta[] = [
    { id: 'a', title: 'A', level: 0 },
    { id: 'b', title: 'B', level: 0 },
  ];

  it('metas에 속한 문제 중 solved만 센다', () => {
    const records: Record<ProblemId, SubmitRecord> = {
      a: { passed: 1, total: 1, at: 1, solvedAt: 1 },
      b: { passed: 0, total: 1, at: 1 },
    };
    expect(countSolved(metas, records)).toBe(1);
  });

  it('metas에 없는 id의 기록은 세지 않는다', () => {
    const records: Record<ProblemId, SubmitRecord> = {
      a: { passed: 1, total: 1, at: 1, solvedAt: 1 },
      ghost: { passed: 1, total: 1, at: 1, solvedAt: 1 },
    };
    expect(countSolved(metas, records)).toBe(1);
  });
});

describe('useSubmitStore.record', () => {
  beforeEach(() => {
    resetStore();
  });

  it('처음 통과하면 solvedAt이 생긴다', () => {
    useSubmitStore.getState().record('a', 3, 3);
    const record = useSubmitStore.getState().records.a;
    expect(record.solvedAt).toBeTypeOf('number');
    expect(record.passed).toBe(3);
    expect(record.total).toBe(3);
  });

  it('통과 뒤 실패를 기록해도 solvedAt은 남고 passed/at은 갱신된다', () => {
    useSubmitStore.getState().record('a', 3, 3);
    const solvedAt = useSubmitStore.getState().records.a.solvedAt;
    const solvedAtTime = useSubmitStore.getState().records.a.at;

    useSubmitStore.getState().record('a', 1, 3);
    const record = useSubmitStore.getState().records.a;

    expect(record.solvedAt).toBe(solvedAt);
    expect(record.passed).toBe(1);
    expect(record.total).toBe(3);
    expect(record.at).toBeGreaterThanOrEqual(solvedAtTime);
  });

  it('total이 0인 기록은 통과로 치지 않는다', () => {
    useSubmitStore.getState().record('a', 0, 0);
    const record = useSubmitStore.getState().records.a;
    expect(record.solvedAt).toBeUndefined();
  });
});

describe('손상된 저장값에 대한 방어', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('레코드가 객체가 아니어도 deriveStatus는 던지지 않고 untried로 떨어진다', async () => {
    // 과거 버전이 남긴 값이거나 수동으로 손상된 localStorage를 흉내낸다.
    localStorage.setItem(
      'js-ide:submits',
      '{"state":{"records":{"a":"nope"}}}',
    );

    // 모듈을 다시 읽어야 persist 미들웨어가 방금 넣은 값으로 새로 수화(hydrate)한다.
    vi.resetModules();
    const { useSubmitStore: freshStore } = await import('@/stores/submitStore');
    const record = freshStore.getState().records.a;

    expect(() => deriveStatus(record, false)).not.toThrow();
    expect(deriveStatus(record, false)).toBe('untried');
  });
});
