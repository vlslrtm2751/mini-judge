interface SandboxGlobal {
  __console__?: Console;
}

/**
 * Evaluates submitted code in a fresh scope and returns its `solution` export.
 *
 * The sandbox console is published on `globalThis.__console__` so the wrapper
 * can bind it to a local `console` that shadows the worker's real one.
 */
export function loadSolution(code: string, sandboxConsole: Console): unknown {
  // Must be published before eval: the wrapper binds `console` with `const`,
  // which captures the value at evaluation time and never re-reads it.
  (globalThis as unknown as SandboxGlobal).__console__ = sandboxConsole;

  return (0, eval)(
    `(() => { const console = globalThis.__console__; ${code}; return (typeof solution === "function" ? solution : undefined); })()
//# sourceURL=solution.js`,
  );
}
