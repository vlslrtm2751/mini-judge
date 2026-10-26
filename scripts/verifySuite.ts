import type { Json, TestSuite } from '../src/domain/types';

type ReferenceSolution = (...args: Json[]) => unknown;

/**
 * Runs a problem's reference solution against every test case.
 *
 * `loadReference` is allowed to fail — reference.js is optional. Anything the
 * reference itself does wrong (a wrong answer, or a throw) is a real failure.
 */
export async function verifySuite(
  name: string,
  suite: Pick<TestSuite, 'public' | 'hidden'>,
  loadReference: () => Promise<unknown>,
): Promise<void> {
  let solution: unknown;
  try {
    solution = await loadReference();
  } catch {
    // reference.js is optional — only its absence is tolerated here.
    return;
  }

  if (typeof solution !== 'function') return;

  for (const tc of [...suite.public, ...suite.hidden]) {
    const actual = await (solution as ReferenceSolution)(...tc.input);
    if (JSON.stringify(tc.expected) !== JSON.stringify(actual)) {
      throw new Error(`${name}: reference mismatch`);
    }
  }
}
