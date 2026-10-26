import type { CaseResult, CompareMode, ErrorInfo, Json, LogEntry } from '@/domain/types';
import type { RunCaseMessage, WorkerMessage } from './protocol';

interface RunCaseOptions {
  index: number;
  hidden: boolean;
  code: string;
  input: Json[];
  expected: Json;
  compare: CompareMode;
  timeLimitMs: number;
  signal: AbortSignal;
  onLog: (entry: LogEntry) => void;
}

export async function runCase(options: RunCaseOptions): Promise<{ result?: CaseResult; fatal?: { reason: 'syntax' | 'top-level-error' | 'no-solution' | 'top-level-timeout'; error?: ErrorInfo } }> {
  return new Promise((resolve) => {
    const worker = new Worker(new URL('./worker.ts', import.meta.url));
    let started = false;
    let timeoutId: number | undefined;
    let guardId: number | undefined;
    const logs: LogEntry[] = [];

    const done = (payload: { result?: CaseResult; fatal?: { reason: 'syntax' | 'top-level-error' | 'no-solution' | 'top-level-timeout'; error?: ErrorInfo } }) => {
      worker.terminate();
      if (timeoutId) clearTimeout(timeoutId);
      if (guardId) clearTimeout(guardId);
      resolve(payload);
    };

    options.signal.addEventListener('abort', () => done({}), { once: true });

    worker.onmessage = ({ data }: MessageEvent<WorkerMessage>) => {
      if (data.type === 'log') {
        logs.push(data.entry);
        options.onLog(data.entry);
        return;
      }
      if (data.type === 'start') {
        started = true;
        timeoutId = window.setTimeout(() => {
          done({ result: { index: options.index, hidden: options.hidden, status: 'timeout', logs, timeMs: options.timeLimitMs } });
        }, options.timeLimitMs);
        return;
      }
      if (data.type === 'load-failed') {
        done({ fatal: { reason: data.reason, error: data.error } });
        return;
      }
      if (data.type === 'done') {
        if (data.status === 'error') {
          done({ result: { index: options.index, hidden: options.hidden, status: 'error', logs, timeMs: data.timeMs, error: data.error } });
          return;
        }
        done({
          result: {
            index: options.index,
            hidden: options.hidden,
            status: data.status,
            logs,
            timeMs: data.timeMs,
            actual: data.actual,
          },
        });
      }
    };

    guardId = window.setTimeout(() => {
      if (!started) done({ fatal: { reason: 'top-level-timeout' } });
    }, options.timeLimitMs + 4000);

    const message: RunCaseMessage = {
      code: options.code,
      input: options.input,
      expected: options.expected,
      compare: options.compare,
    };

    worker.postMessage(message);
  });
}
