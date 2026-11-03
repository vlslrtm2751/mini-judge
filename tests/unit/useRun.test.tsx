import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { Problem, RunKind, RunReport } from '@/domain/types';
import { useSubmitStore } from '@/stores/submitStore';
import { useRunStore } from '@/stores/runStore';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// judge.run을 통제해 RunReport를 마음대로 흉내낸다. useRun.ts는 '@/app/services'에서
// judge만 가져오므로 그것만 교체한다.
const runMock = vi.hoisted(() => vi.fn());
vi.mock('@/app/services', () => ({ judge: { run: runMock } }));

const { useRun } = await import('@/hooks/useRun');

type RunActions = ReturnType<typeof useRun>;

function makeProblem(): Problem {
  return {
    meta: { id: '001-even-sum', title: 'sample', level: 1 },
    markdown: '',
    starter: '',
    suite: {
      params: ['n'],
      timeLimitMs: 1000,
      compare: 'exact',
      public: [{ input: [1], expected: 1 }],
      hidden: [{ input: [2], expected: 2 }],
    },
  };
}

function makeReport(overrides: Partial<RunReport> & { kind: RunKind }): RunReport {
  return {
    problemId: '001-even-sum',
    results: [],
    passed: 0,
    total: 0,
    startedAt: Date.now(),
    ...overrides,
  };
}

function Harness({
  problem,
  actionsRef,
}: {
  problem: Problem;
  actionsRef: { current: RunActions | null };
}) {
  actionsRef.current = useRun(problem);
  return null;
}

function mount(problem: Problem): { actionsRef: { current: RunActions | null }; root: Root } {
  const actionsRef: { current: RunActions | null } = { current: null };
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => {
    root.render(<Harness problem={problem} actionsRef={actionsRef} />);
  });
  return { actionsRef, root };
}

describe('useRun - 제출 결과 기록', () => {
  const recordSpy = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    recordSpy.mockClear();
    // Task 1의 실제 record 구현 대신 스파이로 바꿔치기해, 호출 여부와 인자만 본다.
    useSubmitStore.setState({ records: {}, record: recordSpy });
    // 이전 테스트가 비정상 종료해 'running'에 멈춰 있으면 run()이 그냥 반환돼
    // 버려서 이후 모든 케이스가 거짓으로 "호출 안 됨"이 된다. 테스트 간 결합을
    // 끊기 위해 매번 명시적으로 idle로 되돌린다.
    useRunStore.setState({ phase: 'idle' });
    runMock.mockReset();
  });

  async function runWith(kind: RunKind, overrides: Partial<RunReport> = {}) {
    const problem = makeProblem();
    runMock.mockResolvedValue(makeReport({ kind, problemId: problem.meta.id, ...overrides }));
    const { actionsRef, root } = mount(problem);
    await act(async () => {
      if (kind === 'test') {
        await actionsRef.current!.runTest('code');
      } else {
        await actionsRef.current!.submit('code');
      }
    });
    // 다음 케이스에서 이 루트의 구독이 남아 상태 갱신을 흘려보내지 않도록 정리한다.
    act(() => {
      root.unmount();
    });
    return problem;
  }

  it('제출이 전부 통과하면 record(id, passed, total)이 불린다', async () => {
    const problem = await runWith('submit', { passed: 3, total: 3 });
    expect(recordSpy).toHaveBeenCalledWith(problem.meta.id, 3, 3);
  });

  it('제출이 일부만 통과해도 record가 (id, passed, total)로 불린다 — 실패 상태가 보이려면 실패도 기록해야 한다', async () => {
    const problem = await runWith('submit', { passed: 1, total: 3 });
    expect(recordSpy).toHaveBeenCalledWith(problem.meta.id, 1, 3);
  });

  it('전부 실패한 제출도(중지·치명적 오류 없이) record(id, 0, total)로 불린다 — passed>0 같은 숨은 조건이 있으면 이 케이스가 잡는다', async () => {
    const problem = await runWith('submit', { passed: 0, total: 3 });
    expect(recordSpy).toHaveBeenCalledWith(problem.meta.id, 0, 3);
  });

  it("'test' 실행은 기록하지 않는다", async () => {
    await runWith('test', { passed: 3, total: 3 });
    expect(recordSpy).not.toHaveBeenCalled();
  });

  it('중지(cancelled)된 제출은 기록하지 않는다', async () => {
    await runWith('submit', { passed: 3, total: 3, cancelled: true });
    expect(recordSpy).not.toHaveBeenCalled();
  });

  it('치명적 오류(fatal)로 끝난 제출은 기록하지 않는다', async () => {
    await runWith('submit', { passed: 0, total: 3, fatal: { reason: 'syntax' } });
    expect(recordSpy).not.toHaveBeenCalled();
  });
});
