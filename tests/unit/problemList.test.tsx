import { describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import type { ProblemMeta } from '@/domain/types';
import { ProblemListPage, sortByLevel } from '@/features/problems/ProblemListPage';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** 라우트 element로서의 목록을 그린다 — 로더가 돌려주는 메타를 테스트가 정한다. */
async function renderList(metas: ProblemMeta[]): Promise<HTMLElement> {
  const router = createMemoryRouter([{ path: '/', element: <ProblemListPage />, loader: () => metas }], {
    initialEntries: ['/'],
  });
  const host = document.createElement('div');
  document.body.appendChild(host);
  await act(async () => {
    createRoot(host).render(<RouterProvider router={router} />);
  });
  return host;
}

const renderedTitles = (host: HTMLElement): string[] =>
  Array.from(host.querySelectorAll('a[data-status] [class*="cellTitle"]')).map((el) => el.textContent ?? '');

const meta = (over: Partial<ProblemMeta> & { id: string }): ProblemMeta => ({
  title: over.id,
  level: 0,
  ...over,
});

describe('sortByLevel', () => {
  // 저장소가 돌려주는 순서(order 순)와 난이도 순서가 어긋나는 픽스처여야
  // 정렬 규칙이 실제로 검증된다. 현재 세 문제는 두 순서가 같아 어떤 정렬이든
  // — 정렬을 아예 안 해도 — 같은 결과가 나온다.
  it('난이도 오름차순으로 정렬한다', () => {
    const input = [meta({ id: 'c', level: 0, order: 3 }), meta({ id: 'a', level: 2, order: 1 }), meta({ id: 'b', level: 0, order: 2 })];
    expect(sortByLevel(input).map((m) => m.id)).toEqual(['b', 'c', 'a']);
  });

  it('난이도가 같으면 order 순이다', () => {
    const input = [meta({ id: 'late', level: 1, order: 9 }), meta({ id: 'early', level: 1, order: 2 })];
    expect(sortByLevel(input).map((m) => m.id)).toEqual(['early', 'late']);
  });

  it('order가 없는 메타는 order가 있는 메타 뒤로 간다', () => {
    const input = [meta({ id: 'none', level: 0 }), meta({ id: 'first', level: 0, order: 1 })];
    expect(sortByLevel(input).map((m) => m.id)).toEqual(['first', 'none']);
  });

  it('난이도와 order가 모두 같으면 id 순이다', () => {
    const input = [meta({ id: 'zebra', level: 1, order: 5 }), meta({ id: 'alpha', level: 1, order: 5 })];
    expect(sortByLevel(input).map((m) => m.id)).toEqual(['alpha', 'zebra']);
  });

  it('입력을 변형하지 않고 새 배열을 돌려준다', () => {
    const input = [meta({ id: 'b', level: 1 }), meta({ id: 'a', level: 0 })];
    const out = sortByLevel(input);
    expect(out).not.toBe(input);
    expect(input.map((m) => m.id)).toEqual(['b', 'a']);
  });
});

describe('ProblemListPage', () => {
  // ProblemMeta.tags는 선택 필드다. 현재 세 문제가 모두 태그를 갖고 있어
  // e2e로는 이 경우에 닿지 않는다.
  it('tags가 없는 문제도 행으로 렌더하고 제목을 보여준다', async () => {
    const host = await renderList([meta({ id: '010-no-tags', title: '태그 없는 문제', level: 2 })]);

    expect(host.querySelectorAll('a[data-status]')).toHaveLength(1);
    expect(host.textContent).toContain('태그 없는 문제');
    expect(host.textContent).toContain('Lv.2');
  });

  // sortByLevel의 유닛 테스트만으로는 목록이 그 함수를 **쓰는지** 알 수 없다.
  // 문제가 세 개뿐이고 그 셋의 order 순서와 난이도 순서가 같아, e2e는 정렬을
  // 빼먹어도 통과한다. 두 순서가 어긋나는 픽스처를 로더로 넣어 확인한다.
  it('로더가 돌려준 순서가 난이도 순과 다르면 난이도 순으로 다시 세운다', async () => {
    const host = await renderList([
      meta({ id: 'hard', title: '어려운 문제', level: 2, order: 1 }),
      meta({ id: 'easy', title: '쉬운 문제', level: 0, order: 2 }),
    ]);

    expect(renderedTitles(host)).toEqual(['쉬운 문제', '어려운 문제']);
  });

  it('제출 기록이 없으면 모든 행이 미시도이고 진척도가 0이다', async () => {
    const host = await renderList([meta({ id: 'a', title: '가' }), meta({ id: 'b', title: '나' })]);

    const marks = Array.from(host.querySelectorAll('a[data-status] [data-mark]')).map((el) =>
      el.getAttribute('data-mark'),
    );
    expect(marks).toEqual(['none', 'none']);
    expect(host.textContent).toContain('2문제 중 0개 통과');
  });
});
