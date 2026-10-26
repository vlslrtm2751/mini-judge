import type { CaseResult, Judge, JudgeRequest, RunReport, TestCase } from '@/domain/types';
import { runCase } from './runCase';

export class LocalJudge implements Judge {
  async run(req: JudgeRequest): Promise<RunReport> {
    const cases: Array<TestCase & { hidden: boolean }> = [
      ...req.problem.suite.public.map((test) => ({ ...test, hidden: false })),
      ...(req.kind === 'submit' ? req.problem.suite.hidden.map((test) => ({ ...test, hidden: true })) : []),
    ];

    const results: CaseResult[] = [];
    let fatal: RunReport['fatal'];

    for (const [index, test] of cases.entries()) {
      if (req.signal.aborted) {
        return {
          kind: req.kind,
          problemId: req.problem.meta.id,
          results,
          passed: results.filter((r) => r.status === 'pass').length,
          total: cases.length,
          startedAt: Date.now(),
          cancelled: true,
        };
      }

      req.onEvent({ type: 'case-start', index, hidden: test.hidden });
      const payload = await runCase({
        index,
        hidden: test.hidden,
        code: req.code,
        input: test.input,
        expected: test.expected,
        compare: req.problem.suite.compare,
        timeLimitMs: req.problem.suite.timeLimitMs,
        signal: req.signal,
        onLog: (entry) => req.onEvent({ type: 'log', index, entry }),
      });

      if (payload.fatal) {
        fatal = payload.fatal;
        req.onEvent({ type: 'fatal', fatal });
        break;
      }
      if (payload.result) {
        results.push(payload.result);
        req.onEvent({ type: 'case-end', result: payload.result });
      }
    }

    const passed = results.filter((r) => r.status === 'pass').length;
    const total = cases.length;

    return {
      kind: req.kind,
      problemId: req.problem.meta.id,
      results,
      fatal,
      passed,
      total,
      startedAt: Date.now(),
      score: req.kind === 'submit' && !fatal ? Math.round((passed / total) * 1000) / 10 : undefined,
      cancelled: req.signal.aborted,
    };
  }
}
