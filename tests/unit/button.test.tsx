import { describe, expect, it } from 'vitest';
import type { ReactElement } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '@/ui/Button';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function render(node: ReactElement): HTMLElement {
  const host = document.createElement('div');
  document.body.appendChild(host);
  act(() => {
    createRoot(host).render(node);
  });
  return host;
}

describe('Button', () => {
  it('기본 variant로 렌더되고 라벨을 보여준다', () => {
    const host = render(<Button>제출</Button>);
    const btn = host.querySelector('button');
    expect(btn?.textContent).toBe('제출');
    expect(btn?.className).toMatch(/default/);
  });

  it('variant에 따라 다른 클래스를 붙인다', () => {
    expect(render(<Button variant="primary">a</Button>).querySelector('button')?.className).toMatch(/primary/);
    expect(render(<Button variant="ghost">a</Button>).querySelector('button')?.className).toMatch(/ghost/);
  });

  it('disabled와 onClick 같은 button 속성을 그대로 전달한다', () => {
    const btn = render(<Button disabled>a</Button>).querySelector('button');
    expect(btn?.disabled).toBe(true);
  });
});
