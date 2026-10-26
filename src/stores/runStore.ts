import { create } from 'zustand';
import type { CaseResult, CaseStatus, JudgeEvent, ProblemId, RunKind, RunReport } from '@/domain/types';

export interface TerminalLine {
  text: string;
  tone?: 'dim' | 'err' | 'ok' | 'warn' | 'cmd' | 'path';
}

interface RunState {
  phase: 'idle' | 'running';
  kind?: RunKind;
  problemId?: ProblemId;
  cases: { status: CaseStatus; hidden: boolean; result?: CaseResult }[];
  report?: RunReport;
  terminal: TerminalLine[];
  unreadTerminal: boolean;
  begin(kind: RunKind, problemId: ProblemId, hiddenFlags: boolean[]): void;
  apply(event: JudgeEvent): void;
  finish(report: RunReport): void;
  print(lines: TerminalLine[]): void;
  clearTerminal(): void;
  resetFor(problemId: ProblemId): void;
}

const MAX_TERMINAL = 4000;

export const useRunStore = create<RunState>((set) => ({
  phase: 'idle',
  cases: [],
  terminal: [],
  unreadTerminal: false,
  begin(kind, problemId, hiddenFlags) {
    set({
      phase: 'running',
      kind,
      problemId,
      report: undefined,
      terminal: [],
      unreadTerminal: false,
      cases: hiddenFlags.map((hidden) => ({ hidden, status: 'pending' })),
    });
  },
  apply(event) {
    set((state) => {
      if (event.type === 'case-start') {
        const next = [...state.cases];
        next[event.index] = { ...next[event.index], status: 'running', hidden: event.hidden };
        return { cases: next };
      }
      if (event.type === 'case-end') {
        const next = [...state.cases];
        next[event.result.index] = {
          hidden: event.result.hidden,
          status: event.result.status,
          result: event.result,
        };
        return { cases: next };
      }
      return state;
    });
  },
  finish(report) {
    set({ phase: 'idle', report });
  },
  print(lines) {
    set((state) => {
      const merged = [...state.terminal, ...lines].slice(-MAX_TERMINAL);
      return { terminal: merged, unreadTerminal: true };
    });
  },
  clearTerminal() {
    set({ terminal: [], unreadTerminal: false });
  },
  resetFor(problemId) {
    set((state) => (state.problemId === problemId ? state : { problemId, report: undefined, terminal: [], cases: [], phase: 'idle' }));
  },
}));
