import type { CaseResult, ErrorInfo, LogEntry } from '@/domain/types';

export function formatLogs(logs: LogEntry[]): string[] {
  return logs.map((log) => log.text);
}

export function formatErrorBlock(error: ErrorInfo): string[] {
  const out: string[] = [];
  if (error.line && error.column) {
    out.push(`solution.js:${error.line}`);
    out.push('');
  }
  if (error.name || error.message) {
    out.push(`${error.name}: ${error.message}`.trim());
  }
  out.push(...error.frames.slice(0, 4).map((f) => `    ${f}`));
  return out;
}

export function formatCaseTerminal(result: CaseResult): string[] {
  if (result.status === 'pass') return [`✓ 통과  ${result.timeMs?.toFixed(1)}ms`];
  if (result.status === 'fail') return [`✗ 실패  기댓값 · 결과값 불일치`];
  if (result.status === 'timeout') return [`⌛ 시간 초과 > ${result.timeMs ?? 0}ms`];
  if (result.error) return formatErrorBlock(result.error);
  return [];
}
