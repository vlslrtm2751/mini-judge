import { describe, expect, it } from 'vitest';
import type { ReactElement } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { FatalError } from '@/features/output/FatalError';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function render(node: ReactElement): HTMLElement {
  const host = document.createElement('div');
  document.body.appendChild(host);
  act(() => {
    createRoot(host).render(node);
  });
  return host;
}

describe('FatalError', () => {
  it('문법 오류에는 코드를 고치라고 안내한다', () => {
    const text = render(<FatalError fatal={{ reason: 'syntax' }} />).textContent ?? '';
    expect(text).toContain('문법');
    expect(text).toContain('코드를 고치');
  });

  it('채점기 로드 실패에는 코드를 고치라고 하지 않는다', () => {
    // 워커를 못 불러온 것은 사용자 코드 문제가 아니다. 코드를 고치라고 하면
    // 멀쩡한 풀이를 붙들고 헤매게 된다.
    const text = render(<FatalError fatal={{ reason: 'worker-failed' }} />).textContent ?? '';
    expect(text).toContain('채점기');
    expect(text, `워커 실패인데 코드를 고치라고 안내함: ${text}`).not.toContain('코드를 고치');
  });
});
