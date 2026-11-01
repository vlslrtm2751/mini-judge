import type { CaseResult, CompareMode, Fatal, Json, LogEntry } from '@/domain/types';
import type { RunCaseMessage, WorkerMessage } from './protocol';
import { createWorker } from './createWorker';

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

export async function runCase(options: RunCaseOptions): Promise<{ result?: CaseResult; fatal?: Fatal }> {
  return new Promise((resolve) => {
    const worker = createWorker();
    let started = false;
    let timeoutId: number | undefined;
    let guardId: number | undefined;
    const logs: LogEntry[] = [];

    const done = (payload: { result?: CaseResult; fatal?: Fatal }) => {
      worker.terminate();
      if (timeoutId) clearTimeout(timeoutId);
      if (guardId) clearTimeout(guardId);
      resolve(payload);
    };

    options.signal.addEventListener('abort', () => done({}), { once: true });

    // 워커 스크립트 자체를 못 불러오면 어떤 메시지도 오지 않는다. 이걸 듣지
    // 않으면 아래 가드 타이머가 timeLimitMs + 4000 뒤에 돌아 "시간 초과"로
    // 보고되고, 사용자는 자기 코드가 느리다고 오해한다.
    worker.onerror = (event: unknown) => {
      const message = (event as { message?: string } | null)?.message;
      done({
        fatal: {
          reason: 'worker-failed',
          error: { name: 'WorkerError', message: message || '채점기를 불러오지 못했습니다', frames: [] },
        },
      });
    };

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
