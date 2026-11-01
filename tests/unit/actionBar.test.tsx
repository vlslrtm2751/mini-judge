import { describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { ActionBar } from '@/features/workspace/ActionBar';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const noop = () => undefined;

function render(node: ReactElement): HTMLElement {
  const host = document.createElement('div');
  document.body.appendChild(host);
  act(() => {
    createRoot(host).render(node);
  });
  return host;
}

const bar = (onReset = noop) =>
  render(<ActionBar onRunTest={noop} onSubmit={noop} onStop={noop} onReset={onReset} />);

const buttonByText = (host: HTMLElement, text: string) =>
  [...host.querySelectorAll('button')].find((b) => (b.textContent ?? '').trim() === text);

describe('ActionBar', () => {
  it('초기화 확인 상태는 포커스를 잃으면 풀린다', () => {
    const host = bar();
    const btn = buttonByText(host, '초기화')!;

    act(() => btn.click());
    expect(buttonByText(host, '정말 초기화?'), '확인 단계로 바뀌지 않음').toBeTruthy();

    // 실수로 눌렀을 때 되돌릴 방법이 없으면, 다음에 진짜로 누를 때 한 번에
    // 초기화된다. 포커스를 잃으면 원래대로 돌아와야 한다.
    act(() => {
      btn.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    });
    expect(buttonByText(host, '초기화'), '포커스를 잃어도 확인 상태가 유지됨').toBeTruthy();
  });

  it('두 번 눌러야 실제로 초기화된다', () => {
    const onReset = vi.fn();
    const host = bar(onReset);
    const btn = buttonByText(host, '초기화')!;

    act(() => btn.click());
    expect(onReset).not.toHaveBeenCalled();
    act(() => btn.click());
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('실행·제출·중지 단축키를 모두 안내한다', () => {
    const text = bar().textContent ?? '';
    // 제출(Shift+Enter)과 중지(Esc)는 구현돼 있는데 어디에도 노출되지 않았다.
    expect(text, `안내에 제출이 없음: ${text}`).toMatch(/제출/);
    expect(text, `안내에 중지가 없음: ${text}`).toMatch(/Esc|중지/);
    expect(text).toMatch(/Enter/);
  });
});
