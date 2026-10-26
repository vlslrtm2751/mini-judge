import { describe, expect, it, vi } from 'vitest';
import type { JudgeRequest, Problem, RunKind, TestSuite } from '@/domain/types';

const runCase = vi.hoisted(() => vi.fn());
vi.mock('@/runner/runCase', () => ({ runCase }));

const { LocalJudge } = await import('@/runner/localJudge');

function makeProblem(suite: Partial<TestSuite> = {}): Problem {
  return {
    meta: { id: '001', title: 'sample', level: 1 },
    markdown: '',
    starter: '',
    suite: {
      params: ['n'],
      timeLimitMs: 1000,
      compare: 'exact',
      public: [{ input: [1], expected: 1 }],
      hidden: [{ input: [2], expected: 2 }],
      ...suite,
    },
  };
}

function request(problem: Problem, kind: RunKind = 'submit'): JudgeRequest {
  return {
    kind,
    problem,
    code: '',
    signal: new AbortController().signal,
    onEvent: () => undefined,
  };
}

describe('LocalJudge', () => {
  it('captures startedAt when the run begins, not when it ends', async () => {
    let firstCaseAt = 0;
    runCase.mockImplementation(async (opts: { index: number; hidden: boolean }) => {
      if (!firstCaseAt) firstCaseAt = Date.now();
      await new Promise((resolve) => setTimeout(resolve, 25));
      return { result: { index: opts.index, hidden: opts.hidden, status: 'pass', logs: [] } };
    });

    const report = await new LocalJudge().run(request(makeProblem()));

    expect(report.startedAt).toBeLessThanOrEqual(firstCaseAt);
    expect(Date.now() - report.startedAt).toBeGreaterThanOrEqual(40);
  });

  it('does not report a NaN score for a suite with no test cases', async () => {
    runCase.mockResolvedValue({});

    const report = await new LocalJudge().run(request(makeProblem({ public: [], hidden: [] })));

    expect(report.total).toBe(0);
    expect(report.score).toBe(0);
  });

  it('scores the proportion of passing cases', async () => {
    runCase.mockImplementation(async (opts: { index: number; hidden: boolean }) => ({
      result: {
        index: opts.index,
        hidden: opts.hidden,
        status: opts.index === 0 ? 'pass' : 'fail',
        logs: [],
      },
    }));

    const report = await new LocalJudge().run(request(makeProblem()));

    expect(report.passed).toBe(1);
    expect(report.total).toBe(2);
    expect(report.score).toBe(50);
  });
});
