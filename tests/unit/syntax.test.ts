import { describe, expect, it } from 'vitest';
import { checkSyntax } from '@/runner/syntax';

describe('syntax', () => {
  it('returns position of syntax error', () => {
    const err = checkSyntax('const a = ;');
    expect(err?.line).toBe(1);
    expect(err?.column).toBeGreaterThan(1);
  });

  it('returns undefined for valid code', () => {
    expect(checkSyntax('function solution(n){ return n; }')).toBeUndefined();
  });
});
