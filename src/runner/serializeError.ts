import type { ErrorInfo } from '@/domain/types';
import { inspectValue } from './inspect';

export function serializeError(err: unknown): ErrorInfo {
  if (err instanceof Error) {
    const name = err.name || 'Error';
    const message = err.message || '';
    const frames = normalizeFrames(err.stack ?? '');
    const first = frames.find((f) => f.includes('solution.js:'));
    const lc = first?.match(/solution\.js:(\d+):(\d+)/);
    return {
      name,
      message,
      frames,
      line: lc ? Number(lc[1]) : undefined,
      column: lc ? Number(lc[2]) : undefined,
    };
  }

  return { name: '', message: '', thrown: inspectValue(err), frames: [] };
}

function normalizeFrames(stack: string): string[] {
  const lines = stack.split(/\r?\n/).slice(1);
  const frames: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.includes('blob:') || trimmed.includes('at eval (<anonymous>)')) break;
    frames.push(
      trimmed
        .replace(/^at eval \((solution\.js:\d+:\d+)\)$/, 'at $1')
        .replace(/^(\w+)@(.+):(\d+):(\d+)$/, 'at $1 ($2:$3:$4)'),
    );
  }
  return frames;
}
