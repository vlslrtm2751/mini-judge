import { beforeEach, describe, expect, it } from 'vitest';
import { loadSolution } from '@/runner/sandbox';

function collectingConsole(sink: string[]): Console {
  const push = (...args: unknown[]) => {
    sink.push(args.join(' '));
  };
  return { log: push, info: push, debug: push, warn: push, error: push } as unknown as Console;
}

describe('loadSolution', () => {
  beforeEach(() => {
    (globalThis as unknown as { __console__?: Console }).__console__ = undefined;
  });

  it('binds the sandbox console before the submitted code is evaluated', () => {
    const sink: string[] = [];
    const fn = loadSolution(
      'function solution(n){ console.log("inside", n); return n * 2; }',
      collectingConsole(sink),
    ) as (n: number) => number;

    expect(fn(21)).toBe(42);
    expect(sink).toEqual(['inside 21']);
  });

  it('captures console output written at the top level of the submission', () => {
    const sink: string[] = [];
    loadSolution('console.log("top-level"); function solution(){ return 1; }', collectingConsole(sink));

    expect(sink).toEqual(['top-level']);
  });

  it('returns undefined when the submission defines no solution function', () => {
    expect(loadSolution('const x = 1;', collectingConsole([]))).toBeUndefined();
  });
});
