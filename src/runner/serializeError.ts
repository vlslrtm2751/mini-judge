import type { ErrorInfo } from '@/domain/types';
import { inspectValue } from './inspect';

export function serializeError(err: unknown): ErrorInfo {
  if (err instanceof Error) {
    const name = err.name || 'Error';
    const message = err.message || '';
    const frames = normalizeFrames(err.stack ?? '', name, message);
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

function normalizeFrames(stack: string, name: string, message: string): string[] {
  // V8은 스택 첫 줄이 "TypeError: message" 헤더지만 Firefox와 Safari는 첫 줄부터
  // 프레임이다. 무조건 한 줄을 버리면 두 브라우저에서 오류가 난 바로 그 자리를
  // 잃고, 다음 프레임의 줄 번호가 보고된다. 헤더가 실제로 있을 때만 떼어낸다.
  const head = message ? `${name}: ${message}` : name;
  const body = stack.startsWith(head) ? stack.slice(head.length) : stack;
  const lines = body.split(/\r?\n/);
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
