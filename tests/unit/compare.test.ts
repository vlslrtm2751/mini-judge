import { describe, expect, it } from 'vitest';
import { compare } from '@/runner/compare';

describe('compare', () => {
  it('exact compares nested values', () => {
    expect(compare('exact', { a: [1, 2] }, { a: [1, 2] })).toBe(true);
    expect(compare('exact', { a: [1, 2] }, { a: [1, 3] })).toBe(false);
  });

  it('unordered compares array values by element', () => {
    expect(compare('unordered', [3, 1, 2], [1, 2, 3])).toBe(true);
    expect(compare('unordered', [1, 2], [1, 2, 3])).toBe(false);
  });

  it('float compares with epsilon', () => {
    expect(compare('float', 0.3000000001, 0.3)).toBe(true);
    expect(compare('float:0.01', 10.001, 10)).toBe(true);
    expect(compare('float:0.0001', 10.01, 10)).toBe(false);
  });
});
