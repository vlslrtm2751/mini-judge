import type { RunCaseMessage, WorkerMessage } from './protocol';
import type { Json } from '@/domain/types';
import { compare } from './compare';
import { show } from './show';
import { serializeError } from './serializeError';
import { inspectValue } from './inspect';
import { loadSolution } from './sandbox';

const MAX_LOGS = 300;

self.onmessage = ({ data }: MessageEvent<RunCaseMessage>) => {
  const send = (message: WorkerMessage) => self.postMessage(message);

  let logCount = 0;
  let limitAnnounced = false;

  const wrap =
    (level: 'log' | 'warn' | 'error') =>
    (...args: unknown[]) => {
      if (limitAnnounced) return;
      if (logCount >= MAX_LOGS) {
        limitAnnounced = true;
        send({ type: 'log', entry: { level: 'meta', text: '[log limit exceeded]' } });
        return;
      }
      logCount += 1;
      send({ type: 'log', entry: { level, text: args.map((arg) => inspectValue(arg)).join(' ') } });
    };

  const fakeConsole = {
    log: wrap('log'),
    info: wrap('log'),
    debug: wrap('log'),
    warn: wrap('warn'),
    error: wrap('error'),
    trace: wrap('error'),
    dir: wrap('log'),
    table: wrap('log'),
  } as Console;

  try {
    const fn = loadSolution(data.code, fakeConsole);

    if (typeof fn !== 'function') {
      send({ type: 'load-failed', reason: 'no-solution' });
      return;
    }

    const solution = fn as (...args: Json[]) => unknown;
    send({ type: 'start' });
    const startedAt = performance.now();

    Promise.resolve()
      .then(() => solution(...data.input))
      .then((actual) => {
        const timeMs = performance.now() - startedAt;
        const status = compare(data.compare, actual as Json, data.expected) ? 'pass' : 'fail';
        send({ type: 'done', status, actual: show(actual as Json), timeMs });
      })
      .catch((error) => {
        const timeMs = performance.now() - startedAt;
        send({ type: 'done', status: 'error', error: serializeError(error), timeMs });
      });
  } catch (error) {
    const info = serializeError(error);
    send({ type: 'load-failed', reason: error instanceof SyntaxError ? 'syntax' : 'top-level-error', error: info });
  }
};
