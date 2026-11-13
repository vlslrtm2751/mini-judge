import { describe, expect, it } from 'vitest';
import type { ReactElement } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Mark } from '@/ui/Mark';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function render(node: ReactElement): HTMLElement {
  const host = document.createElement('div');
  document.body.appendChild(host);
  act(() => {
    createRoot(host).render(node);
  });
  return host;
}

describe('Mark', () => {
  it('pending이면 data-mark="pending"을 단다', () => {
    const el = render(<Mark kind="pending" />).firstElementChild as HTMLElement;
    expect(el.getAttribute('data-mark')).toBe('pending');
  });

  it('running이면 data-mark="running"을 단다', () => {
    const el = render(<Mark kind="running" />).firstElementChild as HTMLElement;
    expect(el.getAttribute('data-mark')).toBe('running');
  });

  it('pass이면 data-mark="pass"를 단다', () => {
    const el = render(<Mark kind="pass" />).firstElementChild as HTMLElement;
    expect(el.getAttribute('data-mark')).toBe('pass');
  });

  it('fail이면 data-mark="fail"을 단다', () => {
    const el = render(<Mark kind="fail" />).firstElementChild as HTMLElement;
    expect(el.getAttribute('data-mark')).toBe('fail');
  });

  it('error이면 data-mark="error"를 단다', () => {
    const el = render(<Mark kind="error" />).firstElementChild as HTMLElement;
    expect(el.getAttribute('data-mark')).toBe('error');
  });

  it('timeout이면 data-mark="timeout"을 단다', () => {
    const el = render(<Mark kind="timeout" />).firstElementChild as HTMLElement;
    expect(el.getAttribute('data-mark')).toBe('timeout');
  });

  it("wip이면 data-mark='wip'을 단다", () => {
    const el = render(<Mark kind="wip" />).firstElementChild as HTMLElement;
    expect(el.getAttribute('data-mark')).toBe('wip');
  });

  it("kind가 'none'이어도 요소를 렌더해 칸 너비를 유지한다", () => {
    const host = render(<Mark kind="none" />);
    const el = host.firstElementChild as HTMLElement;
    expect(el).toBeTruthy();
    expect(el.getAttribute('data-mark')).toBe('none');
    expect(el.className).toMatch(/mark/);
  });

  it('className을 전달하면 기본 클래스와 합쳐진다', () => {
    const el = render(<Mark kind="pass" className="extra" />).firstElementChild as HTMLElement;
    expect(el.className).toMatch(/extra/);
    expect(el.className).toMatch(/mark/);
  });

  it('장식 요소이므로 스크린리더에서 숨긴다', () => {
    const el = render(<Mark kind="pass" />).firstElementChild as HTMLElement;
    expect(el.getAttribute('aria-hidden')).toBe('true');
  });
});
