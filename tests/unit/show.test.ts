import { describe, expect, it } from 'vitest';
import type { Json } from '@/domain/types';
import { show } from '@/runner/show';

describe('show', () => {
  it('renders a repeated non-circular reference in full', () => {
    const shared = { v: 1 };
    expect(show([shared, shared])).toBe('[ { v: 1 }, { v: 1 } ]');
  });

  it('marks a genuine cycle as circular', () => {
    const node: { v: number; self?: unknown } = { v: 1 };
    node.self = node;
    expect(show(node as unknown as Json)).toContain('[Circular]');
  });

  it('renders plain values unchanged', () => {
    expect(show([1, 'a', null, true])).toBe('[ 1, "a", null, true ]');
  });
});
