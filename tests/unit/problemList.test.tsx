import { beforeEach, describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import type { ProblemMeta } from '@/domain/types';
import { useSubmitStore } from '@/stores/submitStore';
import { useDraftStore } from '@/stores/draftStore';
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

  // id의 알파벳 순서가 order의 순서와 반대여야 한다 — 'aaa'가 'bbb'보다
  // 앞서는 id만으로도 우연히 같은 결과가 나오면 order 비교가 실제로 쓰이는지
  // 이 테스트로는 알 수 없다(리뷰에서 실제로 걸린 사례: order 항을 지운
  // `(a,b) => a.level - b.level || a.id.localeCompare(b.id)`로도 78/78이
  // 그대로 녹색이었다).
  it('난이도가 같으면 order 순이다', () => {
    const input = [meta({ id: 'aaa', level: 1, order: 9 }), meta({ id: 'bbb', level: 1, order: 2 })];
    expect(sortByLevel(input).map((m) => m.id)).toEqual(['bbb', 'aaa']);
  });

  // 마찬가지로 id 순서가 '(order ?? 9999)'가 매기는 순서와 반대여야 한다.
  // order가 있는 쪽의 id를 알파벳상 뒤로 둔다 — 'aaa'(order 없음)가 'zzz'
  // (order 1)보다 앞에 와야 한다면, id만 보거나 없는 order를 9999 대신 0으로
  // 취급해도 같은 답이 나와 이 테스트가 아무것도 지키지 못한다.
  it('order가 없는 메타는 order가 있는 메타 뒤로 간다', () => {
    const input = [meta({ id: 'aaa', level: 0 }), meta({ id: 'zzz', level: 0, order: 1 })];
    expect(sortByLevel(input).map((m) => m.id)).toEqual(['zzz', 'aaa']);
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
  // 스토어는 모듈 수준이라 한 파일 안의 테스트끼리 상태가 샌다.
  beforeEach(() => {
    useSubmitStore.setState({ records: {} });
    useDraftStore.setState({ drafts: {} });
  });

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

  // ProblemStatus와 MarkKind는 이름이 다르고, 그 변환표가 목록 안에 있다.
  // e2e는 제출해서 통과한 경우(solved→pass)밖에 보지 못하고 untried→none은
  // 위 테스트가 덮는다 — failed와 wip은 어디서도 검증되지 않아, 변환표에
  // 오타가 나도 아무 테스트가 깨지지 않는다. 네 갈래를 한 번에 본다.
  it('네 가지 상태가 각자의 마크로 바뀐다', async () => {
    useSubmitStore.setState({
      records: {
        solved: { passed: 2, total: 2, at: 1, solvedAt: 1 },
        failed: { passed: 1, total: 2, at: 1 },
      },
    });
    useDraftStore.setState({ drafts: { wip: 'function solution() {}' } });

    const host = await renderList(
      ['solved', 'failed', 'wip', 'untried'].map((id) => meta({ id })),
    );

    const marks = Object.fromEntries(
      Array.from(host.querySelectorAll('a[data-status]')).map((row) => [
        row.getAttribute('href')?.split('/').pop(),
        row.querySelector('[data-mark]')?.getAttribute('data-mark'),
      ]),
    );
    expect(marks).toEqual({ solved: 'pass', failed: 'fail', wip: 'wip', untried: 'none' });
    expect(host.textContent).toContain('4문제 중 1개 통과');
  });
});
