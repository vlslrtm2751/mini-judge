import { parse } from 'acorn';

export interface SyntaxErrorInfo {
  line: number;
  column: number;
  message: string;
}

export function checkSyntax(code: string): SyntaxErrorInfo | undefined {
  try {
    parse(code, { ecmaVersion: 'latest', locations: true });
    return undefined;
  } catch (error) {
    const err = error as Error & { loc?: { line: number; column: number } };
    return {
      line: err.loc?.line ?? 1,
      column: (err.loc?.column ?? 0) + 1,
      message: err.message,
    };
  }
}
