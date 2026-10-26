import { checkSyntax } from '@/runner/syntax';

export function LintStatus({ code }: { code: string }) {
  const err = checkSyntax(code);
  if (!err) return <span>문법 정상</span>;
  return (
    <span>
      {err.line}번째 줄: {err.message}
    </span>
  );
}
