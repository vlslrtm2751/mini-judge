import type { CompareMode, ErrorInfo, Json, LogEntry } from '@/domain/types';

export interface RunCaseMessage {
  code: string;
  input: Json[];
  expected: Json;
  compare: CompareMode;
}

export type WorkerMessage =
  | { type: 'log'; entry: LogEntry }
  | { type: 'start' }
  | { type: 'done'; status: 'pass' | 'fail'; timeMs: number; actual: string }
  | { type: 'done'; status: 'error'; timeMs: number; error: ErrorInfo }
  | { type: 'load-failed'; reason: 'syntax' | 'top-level-error' | 'no-solution'; error?: ErrorInfo };
