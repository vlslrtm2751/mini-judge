import { describe, expect, it } from 'vitest';
import type { Json } from '@/domain/types';
import { verifySuite } from '../../scripts/verifySuite';

const tc = (input: Json[], expected: Json) => ({ input, expected });

describe('verifySuite', () => {
  it('fails when the reference output disagrees with a test case', async () => {
    await expect(
      verifySuite('001', { public: [tc([1], 2)], hidden: [] }, async () => (n: number) => n + 99),
    ).rejects.toThrow(/reference mismatch/);
  });

  it('fails when the disagreement is in a hidden case', async () => {
    await expect(
      verifySuite('001', { public: [tc([1], 2)], hidden: [tc([5], 999)] }, async () => (n: number) => n + 1),
    ).rejects.toThrow(/reference mismatch/);
  });

  it('surfaces an error thrown by the reference solution itself', async () => {
    await expect(
      verifySuite('001', { public: [tc([1], 1)], hidden: [] }, async () => () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
  });

  it('tolerates a missing reference.js', async () => {
    await expect(
      verifySuite('001', { public: [tc([1], 2)], hidden: [] }, () => Promise.reject(new Error('ENOENT'))),
    ).resolves.toBeUndefined();
  });

  it('passes when the reference agrees on every case', async () => {
    await expect(
      verifySuite('001', { public: [tc([1], 2)], hidden: [tc([5], 6)] }, async () => (n: number) => n + 1),
    ).resolves.toBeUndefined();
  });
});
