import { useCallback, useEffect, useRef } from 'react';
import type { Problem, RunKind } from '@/domain/types';
import { useRunStore } from '@/stores/runStore';
import { useUiStore } from '@/stores/uiStore';
import { useSubmitStore } from '@/stores/submitStore';
import { judge } from '@/app/services';
import { formatCaseTerminal, formatLogs } from '@/runner/formatNode';

export function useRun(problem: Problem) {
  const controllerRef = useRef<AbortController | null>(null);
  const runStore = useRunStore();
  const setOutputTab = useUiStore((s) => s.setOutputTab);
  const setMobileView = useUiStore((s) => s.setMobileView);
  const record = useSubmitStore((s) => s.record);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const stop = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
  }, []);

  const run = useCallback(
    async (kind: RunKind, code: string) => {
      if (runStore.phase === 'running') return;
      const hiddenFlags = [
        ...problem.suite.public.map(() => false),
        ...(kind === 'submit' ? problem.suite.hidden.map(() => true) : []),
      ];
      runStore.begin(kind, problem.meta.id, hiddenFlags);
      setMobileView('result');
      const controller = new AbortController();
      controllerRef.current = controller;

      const report = await judge.run({
        kind,
        code,
        problem,
        signal: controller.signal,
        onEvent: (event) => {
          runStore.apply(event);
          if (event.type === 'log') {
            runStore.print(formatLogs([event.entry]).map((text) => ({ text })));
          }
          if (event.type === 'case-end') {
            runStore.print(formatCaseTerminal(event.result).map((text) => ({ text })));
          }
          if (event.type === 'fatal') {
            // 원인을 설명하는 FatalError는 결과 탭에 있다. 터미널로 보내면
            // 케이스가 하나도 안 돌아 아무것도 찍히지 않은 빈 탭을 보여주면서
            // 정작 설명을 숨긴다.
            setOutputTab('results');
          }
        },
      });

      runStore.finish(report);
      // 중지됐거나 치명적 오류로 끝난 실행은 '제출한 적 있음'이 아니다 — 기록하지 않는다.
      if (kind === 'submit' && !report.cancelled && !report.fatal) {
        record(problem.meta.id, report.passed, report.total);
      }
      controllerRef.current = null;
    },
    [problem, runStore, setMobileView, setOutputTab, record],
  );

  return {
    runTest: (code: string) => run('test', code),
    submit: (code: string) => run('submit', code),
    stop,
  };
}
