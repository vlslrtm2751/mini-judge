import { beforeEach, describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import type { ProblemMeta } from '@/domain/types';
import { useSubmitStore } from '@/stores/submitStore';
import { useDraftStore } from '@/stores/draftStore';
import { ProblemListPage, sortProblems } from '@/features/problems/ProblemListPage';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** 라우트 element로서의 목록을 그린다 — 로더가 돌려주는 메타를 테스트가 정한다.
 *  path로 쿼리 문자열을 실어 보내면 useListQuery가 그걸 읽는다(기본은 '/'). */
async function renderList(metas: ProblemMeta[], path = '/'): Promise<HTMLElement> {
  const router = createMemoryRouter([{ path: '/', element: <ProblemListPage />, loader: () => metas }], {
    initialEntries: [path],
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

/** 정렬 헤더 버튼 하나의 상태를 한 번에 읽는다 — 접근 가능한 이름(aria-label),
 *  aria-pressed, 화살표의 data-dir(비활성이면 요소 자체가 없어 null). 리뷰가
 *  지적한 대로 이 세 가지를 **버튼마다, 양쪽 상태 모두** 확인해야 한다 —
 *  "텍스트 길이 > 0" 같은 느슨한 단언은 aria-pressed를 둘 다 true로
 *  뭉개거나 이름에서 상태 문구가 빠지는 변형을 전혀 잡지 못한다.
 *
 *  이름은 textContent가 아니라 aria-label을 읽는다 — 실제 브라우저의
 *  accessible name 계산은 자식 텍스트 노드를 이어붙일 때 공백을 끼워 넣어
 *  textContent와 다른 문자열이 나온다(SortHeaderButton 주석 참조).
 *  aria-label을 직접 읽어야 실제로 AT가 듣는 문자열과 같다. */
function sortButtonState(host: HTMLElement, label: '제목' | '난이도') {
  const button = Array.from(host.querySelectorAll('[class*="head"] button')).find((b) =>
    (b.textContent ?? '').startsWith(label),
  ) as HTMLButtonElement | undefined;
  return {
    button,
    name: button?.getAttribute('aria-label') ?? '',
    pressed: button?.getAttribute('aria-pressed') ?? null,
    dir: button?.querySelector('[class*="sortArrow"]')?.getAttribute('data-dir') ?? null,
  };
}

const liveRegionText = (host: HTMLElement): string =>
  (host.querySelector('[role="status"]')?.textContent ?? '').trim();

const meta = (over: Partial<ProblemMeta> & { id: string }): ProblemMeta => ({
  title: over.id,
  level: 0,
  ...over,
});

// 실제 세 문제(001/002/003). 손으로 계산한 값이 아니라 node로 직접 돌려
// 확인한 값이다(task-5a-brief.md의 표와 동일) — meta.json 세 개를 직접 읽어
// level·order가 표와 같은지도 확인했다. sortProblems 유닛 테스트와
// ProblemListPage 통합 테스트가 함께 쓴다.
const REAL_METAS = [
  meta({ id: '001-even-sum', title: '짝수만 더하기', level: 0, order: 1 }),
  meta({ id: '002-string-repeat', title: '문자열 n번 이어붙이기', level: 0, order: 2 }),
  meta({ id: '003-unique-sort', title: '중복 제거 후 정렬', level: 1, order: 3 }),
];
const shortId = (m: ProblemMeta) => m.id.slice(0, 3);

describe('sortProblems', () => {
  // 저장소가 돌려주는 순서(order 순)와 난이도 순서가 어긋나는 픽스처여야
  // 정렬 규칙이 실제로 검증된다. 현재 세 문제는 두 순서가 같아 어떤 정렬이든
  // — 정렬을 아예 안 해도 — 같은 결과가 나온다.
  it('난이도 오름차순으로 정렬한다', () => {
    const input = [meta({ id: 'c', level: 0, order: 3 }), meta({ id: 'a', level: 2, order: 1 }), meta({ id: 'b', level: 0, order: 2 })];
    expect(sortProblems(input, 'level', 'asc').map((m) => m.id)).toEqual(['b', 'c', 'a']);
  });

  // id의 알파벳 순서가 order의 순서와 반대여야 한다 — 'aaa'가 'bbb'보다
  // 앞서는 id만으로도 우연히 같은 결과가 나오면 order 비교가 실제로 쓰이는지
  // 이 테스트로는 알 수 없다(리뷰에서 실제로 걸린 사례: order 항을 지운
  // `(a,b) => a.level - b.level || a.id.localeCompare(b.id)`로도 78/78이
  // 그대로 녹색이었다).
  it('난이도가 같으면 order 순이다', () => {
    const input = [meta({ id: 'aaa', level: 1, order: 9 }), meta({ id: 'bbb', level: 1, order: 2 })];
    expect(sortProblems(input, 'level', 'asc').map((m) => m.id)).toEqual(['bbb', 'aaa']);
  });

  // 마찬가지로 id 순서가 '(order ?? 9999)'가 매기는 순서와 반대여야 한다.
  // order가 있는 쪽의 id를 알파벳상 뒤로 둔다 — 'aaa'(order 없음)가 'zzz'
  // (order 1)보다 앞에 와야 한다면, id만 보거나 없는 order를 9999 대신 0으로
  // 취급해도 같은 답이 나와 이 테스트가 아무것도 지키지 못한다.
  it('order가 없는 메타는 order가 있는 메타 뒤로 간다', () => {
    const input = [meta({ id: 'aaa', level: 0 }), meta({ id: 'zzz', level: 0, order: 1 })];
    expect(sortProblems(input, 'level', 'asc').map((m) => m.id)).toEqual(['zzz', 'aaa']);
  });

  it('난이도와 order가 모두 같으면 id 순이다', () => {
    const input = [meta({ id: 'zebra', level: 1, order: 5 }), meta({ id: 'alpha', level: 1, order: 5 })];
    expect(sortProblems(input, 'level', 'asc').map((m) => m.id)).toEqual(['alpha', 'zebra']);
  });

  it('입력을 변형하지 않고 새 배열을 돌려준다', () => {
    const input = [meta({ id: 'b', level: 1 }), meta({ id: 'a', level: 0 })];
    const out = sortProblems(input, 'level', 'asc');
    expect(out).not.toBe(input);
    expect(input.map((m) => m.id)).toEqual(['b', 'a']);
  });

  // 네 조합을 REAL_METAS(위 모듈 스코프)로 고정한다.
  it('실제 데이터: level asc → 001, 002, 003', () => {
    expect(sortProblems(REAL_METAS, 'level', 'asc').map(shortId)).toEqual(['001', '002', '003']);
  });

  // 결정: dir은 1차 키만 뒤집고 타이브레이커(order)는 오름차순을 유지한다.
  // 비교자 전체를 음수화하는 구현이었다면 003, 002, 001이 나온다 — 이 값과
  // 다음 테스트(타이브레이커 전용)가 그 구현을 함께 떨어뜨린다.
  it('실제 데이터: level desc → 003, 001, 002 (비교자 전체 음수화라면 003, 002, 001)', () => {
    expect(sortProblems(REAL_METAS, 'level', 'desc').map(shortId)).toEqual(['003', '001', '002']);
  });

  it('실제 데이터: title asc → 002, 003, 001', () => {
    expect(sortProblems(REAL_METAS, 'title', 'asc').map(shortId)).toEqual(['002', '003', '001']);
  });

  it('실제 데이터: title desc → 001, 003, 002', () => {
    expect(sortProblems(REAL_METAS, 'title', 'desc').map(shortId)).toEqual(['001', '003', '002']);
  });

  // 위 level desc 테스트 하나만으로는 "타이브레이커가 유지됐다"와 "어차피
  // 셋 다 서로 다른 order라 우연히 맞았다"를 구분하지 못한다. 같은 레벨
  // 두 문제를 order·id가 어긋나게 만들어 직접 본다(Task 4의 교훈).
  it('같은 난이도 두 문제는 level desc에서도 order 오름차순을 유지한다', () => {
    const input = [meta({ id: 'zzz', level: 5, order: 1 }), meta({ id: 'aaa', level: 5, order: 9 })];
    expect(sortProblems(input, 'level', 'desc').map((m) => m.id)).toEqual(['zzz', 'aaa']);
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

  // sortProblems의 유닛 테스트만으로는 목록이 그 함수를 **쓰는지** 알 수 없다.
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

  // sortProblems 유닛 테스트는 함수 자체만 본다 — ProblemListPage가 URL의
  // sort·dir을 실제로 그 함수에 넘기는지는 별개다(바로 이 배선이 Task 4에서
  // order 항을 빼먹어도 안 들키게 한 구멍과 같은 종류다). URL을 직접 쿼리로
  // 채워 렌더해 확인한다.
  it('URL의 sort·dir을 읽어 그 순서로 렌더한다', async () => {
    const host = await renderList(REAL_METAS, '/?sort=title&dir=desc');
    expect(renderedTitles(host).map((t) => REAL_METAS.find((m) => m.title === t)?.id.slice(0, 3))).toEqual([
      '001',
      '003',
      '002',
    ]);
  });

  // Task 4가 .head를 aria-hidden으로 둔 이유(눈으로만 읽는 열 이름)는
  // 정렬 버튼이 생기면서 깨진다 — 포커스 가능한 버튼이 스크린리더에서는
  // 사라지는데 탭으로는 닿는 상태가 axe 위반이자 실제 버그다. 그 수정을
  // 테스트로 고정한다.
  it('.head는 더 이상 aria-hidden이 아니고, 정렬 버튼은 기본 상태(난이도·오름차순)를 정확히 드러낸다', async () => {
    const host = await renderList(REAL_METAS);
    const head = host.querySelector('[class*="head"]');
    expect(head?.getAttribute('aria-hidden')).toBeNull();

    const buttons = Array.from(head?.querySelectorAll('button') ?? []);
    expect(buttons).toHaveLength(2);

    // 기본 정렬은 난이도/오름차순이다 — 난이도가 활성, 제목은 비활성이어야
    // 한다. aria-pressed가 둘 다 'true'가 되거나, sr-only 문구가 빠지거나,
    // 화살표 data-dir이 안 맞는 변형이 전부 여기서 잡혀야 한다(리뷰 Important 1).
    const level = sortButtonState(host, '난이도');
    expect(level.name).toBe('난이도, 오름차순 정렬 중');
    expect(level.pressed).toBe('true');
    expect(level.dir).toBe('asc');

    const title = sortButtonState(host, '제목');
    expect(title.name).toBe('제목');
    expect(title.pressed).toBe('false');
    expect(title.dir).toBeNull(); // 비활성 열에는 화살표 요소 자체가 없다

    expect(liveRegionText(host)).toBe('난이도 기준 오름차순으로 정렬 중');
  });

  // 제목 헤더를 누르면 정렬이 바뀌고(먼저 title/asc로), 같은 헤더를 다시
  // 누르면 방향이 뒤집힌다(title/desc). 클릭 한 번으로 열이 바뀔 때는 asc로
  // 리셋되고, 같은 열을 다시 누를 때만 토글된다는 두 규칙을 함께 본다.
  // 매 단계에서 두 버튼 모두의 이름·aria-pressed·화살표 방향과 live region
  // 문구까지 확인한다 — "순서만 맞으면 통과"가 아니라 사용자가 실제로 보고
  // 듣는 상태 표시 전체를 고정한다(리뷰 Important 1·Minor 1).
  it('제목 헤더를 누르면 제목 정렬로 바뀌고, 다시 누르면 방향이 뒤집힌다', async () => {
    const host = await renderList(REAL_METAS);
    const titleButton = sortButtonState(host, '제목').button;
    expect(titleButton).toBeDefined();

    await act(async () => {
      titleButton!.click();
    });
    expect(renderedTitles(host).map((t) => REAL_METAS.find((m) => m.title === t)?.id.slice(0, 3))).toEqual([
      '002',
      '003',
      '001',
    ]);
    let title = sortButtonState(host, '제목');
    let level = sortButtonState(host, '난이도');
    expect(title.name).toBe('제목, 오름차순 정렬 중');
    expect(title.pressed).toBe('true');
    expect(title.dir).toBe('asc');
    expect(level.name).toBe('난이도');
    expect(level.pressed).toBe('false');
    expect(level.dir).toBeNull();
    expect(liveRegionText(host)).toBe('제목 기준 오름차순으로 정렬 중');

    await act(async () => {
      titleButton!.click();
    });
    expect(renderedTitles(host).map((t) => REAL_METAS.find((m) => m.title === t)?.id.slice(0, 3))).toEqual([
      '001',
      '003',
      '002',
    ]);
    title = sortButtonState(host, '제목');
    expect(title.name).toBe('제목, 내림차순 정렬 중');
    expect(title.pressed).toBe('true');
    expect(title.dir).toBe('desc'); // 화살표가 실제로 뒤집히는지(리뷰 Important 1)
    expect(liveRegionText(host)).toBe('제목 기준 내림차순으로 정렬 중');
  });
});
