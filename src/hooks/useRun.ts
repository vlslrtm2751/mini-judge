import { useCallback, useEffect, useRef } from 'react';
import type { Problem, RunKind } from '@/domain/types';
import { useRunStore } from '@/stores/runStore';
import { useUiStore } from '@/stores/uiStore';
import { judge } from '@/app/services';
import { formatCaseTerminal, formatLogs } from '@/runner/formatNode';

export function useRun(problem: Problem) {
  const controllerRef = useRef<AbortController | null>(null);
  const runStore = useRunStore();
  const setOutputTab = useUiStore((s) => s.setOutputTab);
  const setMobileView = useUiStore((s) => s.setMobileView);

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
            setOutputTab('terminal');
          }
        },
      });

      runStore.finish(report);
      controllerRef.current = null;
    },
    [problem, runStore, setMobileView, setOutputTab],
  );

  return {
    runTest: (code: string) => run('test', code),
    submit: (code: string) => run('submit', code),
    stop,
  };
}
