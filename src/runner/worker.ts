import type { RunCaseMessage, WorkerMessage } from './protocol';
import { compare } from './compare';
import { show } from './show';
import { serializeError } from './serializeError';
import { inspectValue } from './inspect';

const MAX_LOGS = 300;

self.onmessage = ({ data }: MessageEvent<RunCaseMessage>) => {
  const logs: number[] = [];
  const send = (message: WorkerMessage) => self.postMessage(message);

  const wrap = (level: 'log' | 'warn' | 'error') =>
    (...args: unknown[]) => {
      if (logs.length > MAX_LOGS) return;
      logs.push(1);
      if (logs.length === MAX_LOGS) {
        send({ type: 'log', entry: { level: 'meta', text: '[log limit exceeded]' } });
        return;
      }
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
    const fn = (0, eval)(
      `(() => { const console = globalThis.__console__; ${data.code}; return (typeof solution === "function" ? solution : undefined); })()
//# sourceURL=solution.js`,
    );

    if (typeof fn !== 'function') {
      send({ type: 'load-failed', reason: 'no-solution' });
      return;
    }

    send({ type: 'start' });
    const startedAt = performance.now();

    Promise.resolve()
      .then(() => {
        (globalThis as unknown as { __console__: Console }).__console__ = fakeConsole;
        return fn(...data.input);
      })
      .then((actual) => {
        const timeMs = performance.now() - startedAt;
        const status = compare(data.compare, actual, data.expected) ? 'pass' : 'fail';
        send({ type: 'done', status, actual: show(actual), timeMs });
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
