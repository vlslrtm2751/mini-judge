import { describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useShortcuts } from '@/hooks/useShortcuts';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const noop = () => undefined;

function Harness({ onRun }: { onRun: () => void }) {
  // 호출부와 똑같이 매 렌더마다 새 객체를 만든다. IdePage도 이렇게 쓴다.
  useShortcuts({ runTest: onRun, submit: noop, stop: noop, toggleComment: noop });
  return null;
}

function mount(): { root: Root; render: (onRun: () => void) => void } {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  return { root, render: (onRun) => act(() => root.render(<Harness onRun={onRun} />)) };
}

const ctrlEnter = () =>
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
  });

describe('useShortcuts', () => {
  it('리렌더를 반복해도 keydown 리스너를 다시 달지 않는다', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const { render } = mount();

    render(noop);
    render(noop);
    render(noop);

    const keydownSubscriptions = add.mock.calls.filter(([type]) => type === 'keydown').length;
    add.mockRestore();

    expect(keydownSubscriptions, `리렌더마다 재구독: ${keydownSubscriptions}회`).toBe(1);
  });

  it('리렌더 뒤에는 최신 핸들러가 불린다', () => {
    const first = vi.fn();
    const latest = vi.fn();
    const { render } = mount();

    render(first);
    render(latest);
    ctrlEnter();

    expect(latest, '최신 핸들러가 불리지 않음 — ref가 갱신되지 않았다').toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });
});
