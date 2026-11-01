import { describe, expect, it } from 'vitest';
import type { ReactElement } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { ProblemMeta as Meta, TestSuite } from '@/domain/types';
import { ProblemMeta } from '@/features/problem/ProblemMeta';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function render(node: ReactElement): HTMLElement {
  const host = document.createElement('div');
  document.body.appendChild(host);
  act(() => {
    createRoot(host).render(node);
  });
  return host;
}

const meta: Meta = { id: '001-even-sum', title: '짝수만 더하기', level: 0 };
const suite: TestSuite = {
  params: ['numbers'],
  timeLimitMs: 1000,
  compare: 'exact',
  public: [{ input: [[1, 2]], expected: 2 }],
  hidden: [{ input: [[3, 4]], expected: 4 }],
};

describe('ProblemMeta', () => {
  it('문제 id를 보여준다', () => {
    // 버그 신고나 공유에서 문제를 특정하려면 id가 필요하다. 지금은 URL에만
    // 남아 있어 화면만 보고는 어떤 문제인지 말할 수 없다.
    const text = render(<ProblemMeta meta={meta} suite={suite} />).textContent ?? '';
    expect(text, `id가 화면에 없음: ${text}`).toContain('001-even-sum');
  });

  it('레벨·시간 제한·케이스 수·비교 방식을 보여준다', () => {
    const text = render(<ProblemMeta meta={meta} suite={suite} />).textContent ?? '';
    expect(text).toContain('Lv. 0');
    expect(text).toContain('1,000ms');
    expect(text).toContain('공개 1');
    expect(text).toContain('숨김 1');
    expect(text).toContain('정확히');
  });
});
