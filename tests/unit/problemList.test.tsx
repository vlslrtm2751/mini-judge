import { beforeEach, describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import type { ProblemMeta } from '@/domain/types';
import type { ProblemStatus } from '@/domain/progress';
import { useSubmitStore } from '@/stores/submitStore';
import { useDraftStore } from '@/stores/draftStore';
import type { ListQuery } from '@/features/problems/useListQuery';
import { filterProblems, ProblemListPage, sortProblems } from '@/features/problems/ProblemListPage';

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

// 정렬 region에 data-live="sort-status"를 달아 필터 region과 명시적으로
// 구분한다(ProblemListPage.tsx) — 전에는 첫 [role="status"]를 그냥
// 집었는데, 그게 맞는 이유는 "정렬 region이 DOM에서 필터 region보다 먼저
// 나온다"는 순서에 불과했다(리뷰 Minor 9). 두 region이 하나로 합쳐지거나
// 순서가 바뀌는 변형에서도 이 헬퍼가 여전히 정렬 region만 읽는지는 아래
// data-live 선택자가 보장한다.
const liveRegionText = (host: HTMLElement): string =>
  (host.querySelector('[data-live="sort-status"]')?.textContent ?? '').trim();

const meta = (over: Partial<ProblemMeta> & { id: string }): ProblemMeta => ({
  title: over.id,
  level: 0,
  ...over,
});

// 실제 세 문제(001/002/003). 손으로 계산한 값이 아니라 node로 직접 돌려
// 확인한 값이다(task-5a-brief.md의 표와 동일) — meta.json 세 개를 직접 읽어
// level·order가 표와 같은지도 확인했다. sortProblems 유닛 테스트와
// ProblemListPage 통합 테스트가 함께 쓴다.
// tags는 5b가 추가했다 — problems/00{1,2,3}-*/meta.json을 직접 읽어 확인한
// 실제 값이다(001:배열, 002:문자열, 003:정렬). task-5b-brief.md의 검색어 표가
// 전제하는 값과 같다 — 문자열/정렬은 제목과 태그 양쪽에 걸리고, 배열은
// 태그에서만(제목 "짝수만 더하기"에는 없음), 짝수는 제목에서만(태그
// "배열"에는 없음) 걸린다. sortProblems는 tags를 보지 않으므로 이 추가가
// 기존 정렬 단언에 영향을 주지 않는다.
const REAL_METAS = [
  meta({ id: '001-even-sum', title: '짝수만 더하기', level: 0, order: 1, tags: ['배열'] }),
  meta({ id: '002-string-repeat', title: '문자열 n번 이어붙이기', level: 0, order: 2, tags: ['문자열'] }),
  meta({ id: '003-unique-sort', title: '중복 제거 후 정렬', level: 1, order: 3, tags: ['정렬'] }),
];
const shortId = (m: ProblemMeta) => m.id.slice(0, 3);

// useListQuery.ts의 DEFAULT_QUERY는 export되지 않는다(listQuery.test.ts도
// 같은 이유로 자신만의 복사본을 둔다) — 필터 테스트에서 "이 필드만 바꾼
// 쿼리"를 짧게 만들기 위한 로컬 기준점.
const DEFAULT_QUERY: ListQuery = { q: '', level: null, status: null, tag: null, sort: 'level', dir: 'asc' };

/** 리액트 컨트롤드 input/select는 `.value =`로만 바꾸면 리액트의 값 추적기가
 *  "안 바뀌었다"고 보고 onChange를 안 부른다 — 테스트 전용 라이브러리
 *  (React Testing Library의 fireEvent 등)가 쓰는 것과 같은 우회: 프로토타입의
 *  value setter를 직접 호출해 추적기를 건너뛴다. */
function setControlValue(el: HTMLInputElement | HTMLSelectElement, value: string): void {
  const proto = el instanceof HTMLSelectElement ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
}

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

describe('filterProblems', () => {
  // status 필터를 쓰지 않는 테스트에서는 statusOf가 뭘 리턴해도 결과에
  // 영향이 없다 — 항상 'untried'로 고정해 둔다.
  const anyStatus = (): ProblemStatus => 'untried';

  describe('q(검색어) — 제목·태그', () => {
    // 브리프의 검색어 표(브리프 작성자가 실제 데이터로 확인한 값)와 정확히
    // 같은 네 조합. 문자열·정렬만 쓰면 "제목만 보는" 구현도 통과하고 태그
    // 검색은 검증 없이 출하된다 — 배열·짝수가 그 구현을 갈라낸다.
    it('제목에서만 걸린다 (짝수 → 001, 태그 "배열"에는 없음)', () => {
      expect(filterProblems(REAL_METAS, { ...DEFAULT_QUERY, q: '짝수' }, anyStatus).map(shortId)).toEqual(['001']);
    });

    it('태그에서만 걸린다 (배열 → 001, 제목 "짝수만 더하기"에는 없음)', () => {
      expect(filterProblems(REAL_METAS, { ...DEFAULT_QUERY, q: '배열' }, anyStatus).map(shortId)).toEqual(['001']);
    });

    it('제목과 태그 모두에 걸리는 경우 (문자열 → 002)', () => {
      expect(filterProblems(REAL_METAS, { ...DEFAULT_QUERY, q: '문자열' }, anyStatus).map(shortId)).toEqual(['002']);
    });

    it('제목과 태그 모두에 걸리는 다른 경우 (정렬 → 003)', () => {
      expect(filterProblems(REAL_METAS, { ...DEFAULT_QUERY, q: '정렬' }, anyStatus).map(shortId)).toEqual(['003']);
    });

    // 결정(브리프가 요구한 대로 정하고 테스트로 고정): 대소문자를 구분하지
    // 않고, 앞뒤 공백은 무시한다. 한글에는 대소문자가 없어 라틴 문자가 있는
    // 합성 픽스처로 따로 확인해야 한다.
    it('대소문자를 구분하지 않는다', () => {
      const metas = [meta({ id: 'a', title: 'Even Sum', tags: ['Array'] })];
      expect(filterProblems(metas, { ...DEFAULT_QUERY, q: 'EVEN' }, anyStatus).map((m) => m.id)).toEqual(['a']);
      expect(filterProblems(metas, { ...DEFAULT_QUERY, q: 'array' }, anyStatus).map((m) => m.id)).toEqual(['a']);
    });

    it('검색어 앞뒤 공백은 무시한다', () => {
      expect(filterProblems(REAL_METAS, { ...DEFAULT_QUERY, q: '  짝수  ' }, anyStatus).map(shortId)).toEqual(['001']);
    });

    it('공백만 있는 검색어는 필터 없음과 같다', () => {
      expect(filterProblems(REAL_METAS, { ...DEFAULT_QUERY, q: '   ' }, anyStatus)).toEqual(REAL_METAS);
    });

    // `(meta.tags ?? []).some(...)`의 `?? []` 가드는 지금까지 "필터 둘
    // 이상은 AND로 합쳐진다" 테스트(아래)가 우연히 태그 없는 메타를 쓴
    // 덕에만 죽었다 — 그 테스트의 목적은 AND 로직이라 가드가 빠져도 되는
    // 날엔 다른 이유로 같이 죽어 신호가 섞인다. q 하나만으로, 제목에도
    // 안 걸리는 검색어를 써서 이 가드를 직접 고정한다(리뷰 Minor 12) —
    // 가드를 지우면(`meta.tags.some(...)`) tags가 undefined인 메타에서
    // TypeError가 나 바로 아래 toThrow 쪽이 잡는다.
    it('태그가 없는 메타를 검색해도 터지지 않고 조용히 빠진다(제목에도 안 걸리는 경우)', () => {
      const metas = [meta({ id: 'no-tags', title: '전혀 다른 제목' })];
      expect(() => filterProblems(metas, { ...DEFAULT_QUERY, q: '배열' }, anyStatus)).not.toThrow();
      expect(filterProblems(metas, { ...DEFAULT_QUERY, q: '배열' }, anyStatus)).toEqual([]);
    });
  });

  it('level로 거른다', () => {
    expect(filterProblems(REAL_METAS, { ...DEFAULT_QUERY, level: 1 }, anyStatus).map(shortId)).toEqual(['003']);
  });

  // statusOf를 주입해 네 상태를 전부 만든다(브리프 Step 1) — deriveStatus를
  // 다시 부르지 않고 호출자가 정한 그대로 쓰는지를 본다.
  it('status로 거른다 — 네 상태 모두', () => {
    const metas = (['solved', 'failed', 'wip', 'untried'] as const).map((id) => meta({ id }));
    const statusOf = (m: ProblemMeta): ProblemStatus => m.id as ProblemStatus;
    for (const s of ['solved', 'failed', 'wip', 'untried'] as const) {
      expect(filterProblems(metas, { ...DEFAULT_QUERY, status: s }, statusOf).map((m) => m.id)).toEqual([s]);
    }
  });

  describe('tag', () => {
    it('tag로 거른다', () => {
      expect(filterProblems(REAL_METAS, { ...DEFAULT_QUERY, tag: '정렬' }, anyStatus).map(shortId)).toEqual(['003']);
    });

    // ProblemMeta.tags는 선택 필드다. undefined인 메타가 태그 필터에서
    // 터지지 않고 조용히 빠지는지 — tags가 있는 메타와 함께 둬서 "둘 다
    // 우연히 통과해도 티가 안 나는" 상황을 피한다.
    it('tags가 undefined인 메타는 태그 필터에서 터지지 않고 조용히 빠진다', () => {
      const metas = [meta({ id: 'no-tags' }), meta({ id: 'has-tag', tags: ['x'] })];
      expect(() => filterProblems(metas, { ...DEFAULT_QUERY, tag: 'x' }, anyStatus)).not.toThrow();
      expect(filterProblems(metas, { ...DEFAULT_QUERY, tag: 'x' }, anyStatus).map((m) => m.id)).toEqual(['has-tag']);
    });

    it('태그 필터가 없으면 tags가 undefined인 메타도 그대로 남는다', () => {
      const metas = [meta({ id: 'no-tags' })];
      expect(filterProblems(metas, DEFAULT_QUERY, anyStatus)).toEqual(metas);
    });
  });

  // 필터 둘 이상은 AND로 합쳐진다 — OR로 구현해도 통과하는 픽스처는 아무것도
  // 막지 못한다. b도 q에는 걸리지만 level이 달라 AND에서는 빠져야 한다.
  // OR 구현이면 a·b 둘 다 남는다.
  it('필터 둘 이상은 AND로 합쳐진다', () => {
    const metas = [meta({ id: 'a', title: '검색어포함', level: 0 }), meta({ id: 'b', title: '검색어포함', level: 9 })];
    const result = filterProblems(metas, { ...DEFAULT_QUERY, q: '검색어', level: 0 }, anyStatus);
    expect(result.map((m) => m.id)).toEqual(['a']);
  });

  it('전부 기본값이면 입력을 그대로(내용 동일) 돌려준다', () => {
    expect(filterProblems(REAL_METAS, DEFAULT_QUERY, anyStatus)).toEqual(REAL_METAS);
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

  // 5b: 검색·필터 컨트롤 배선.
  const searchInput = (host: HTMLElement): HTMLInputElement => host.querySelector('input[type="search"]')!;

  // 라벨은 각 select를 감싸는 <label>의 sr-only 글자다 — select 자신의
  // textContent(선택된 옵션 글자)가 섞여도 sr-only 문구는 그 select에만
  // 있어 유일하게 찾힌다.
  const selectByLabel = (host: HTMLElement, labelText: string): HTMLSelectElement =>
    Array.from(host.querySelectorAll('label')).find((l) => (l.textContent ?? '').includes(labelText))!.querySelector(
      'select',
    )!;

  const filterLiveText = (host: HTMLElement): string => (host.querySelector('[data-live="filter-count"]')?.textContent ?? '').trim();

  it('검색 입력은 제목에 없어도 태그에 걸리는 문제를 찾는다', async () => {
    const host = await renderList(REAL_METAS);

    await act(async () => {
      setControlValue(searchInput(host), '배열');
    });

    expect(renderedTitles(host)).toEqual(['짝수만 더하기']);
  });

  it('난이도 select를 바꾸면 그 난이도만 남고, select는 고른 값을 보여준다', async () => {
    const host = await renderList(REAL_METAS);

    await act(async () => {
      setControlValue(selectByLabel(host, '난이도 필터'), '1');
    });

    expect(renderedTitles(host)).toEqual(['중복 제거 후 정렬']);
    expect(selectByLabel(host, '난이도 필터').value).toBe('1');
  });

  // 리뷰 Minor 5: 필터가 걸려 있어도 결과가 0건이 아니면 필터 라이브
  // region은 비어 있어야 한다 — 전에는 `${visible.length}건 표시 중`을
  // 읊었는데, 그 문구를 'XXXX'로 바꿔도 유닛·e2e 둘 다 green이라 아무것도
  // 지키지 못했다(검증 없이 출하됐다는 뜻이고, 키 입력마다 발화하는 역효과도
  // 있었다). 0건이 아닌 필터링 결과에서 region이 비는지를 직접 고정한다.
  it('필터가 걸려도 결과가 있으면 필터 라이브 region은 비어 있다', async () => {
    const host = await renderList(REAL_METAS);

    await act(async () => {
      setControlValue(selectByLabel(host, '난이도 필터'), '0'); // 001·002 두 건 남는다(0건 아님)
    });

    expect(renderedTitles(host)).toHaveLength(2);
    expect(filterLiveText(host)).toBe('');
  });

  // 태그 derivation(아래 '태그 select 옵션은...')은 이미 고정돼 있지만
  // 난이도는 아니었다 — `:211`을 `const levels = [0, 1, 2, 3, 4, 5]`로
  // 바꿔도 유닛 124/124·e2e 40/40이 그대로 green이었다(리뷰 Minor 4).
  // 희귀 레벨(기본 난이도 select에 없는 값)로 같은 모양의 테스트를 만든다.
  it('난이도 select 옵션은 metas에서 모은다(하드코딩이 아니다)', async () => {
    const host = await renderList([meta({ id: 'x', title: '희귀 난이도 문제', level: 42 })]);
    const select = selectByLabel(host, '난이도 필터');
    const optionTexts = Array.from(select.querySelectorAll('option')).map((o) => o.textContent);
    expect(optionTexts).toContain('Lv.42');

    await act(async () => {
      setControlValue(select, '42');
    });
    expect(renderedTitles(host)).toEqual(['희귀 난이도 문제']);
  });

  // 리뷰 Important 1: URL이 levels에 없는 값(예: ?level=9 — 브리프의 canonical
  // 0건 URL)을 가리키면, 일치하는 <option>이 없어 네이티브 select가 value=""로
  // 떨어져 "전체 난이도"를 보여준다 — 목록은 0건인데 컨트롤은 "필터 없음"
  // 이라고 말하는 모순. select.value가 여전히 URL의 값과 같아야 한다.
  it('URL이 존재하지 않는 난이도를 가리키면 select가 그 값을 활성 옵션으로 보여준다(전체로 떨어지지 않는다)', async () => {
    const host = await renderList(REAL_METAS, '/?level=9');
    const select = selectByLabel(host, '난이도 필터');

    expect(select.value).toBe('9');
    expect(select.selectedOptions[0]?.textContent).not.toBe('전체 난이도');
    expect(renderedTitles(host)).toEqual([]);
  });

  it('URL이 존재하지 않는 태그를 가리키면 select가 그 값을 활성 옵션으로 보여준다(전체로 떨어지지 않는다)', async () => {
    const host = await renderList(REAL_METAS, '/?tag=zzz');
    const select = selectByLabel(host, '태그 필터');

    expect(select.value).toBe('zzz');
    expect(select.selectedOptions[0]?.textContent).not.toBe('전체 태그');
    expect(renderedTitles(host)).toEqual([]);
  });

  // 상태 필터는 행의 마크가 쓰는 것과 같은 유도(레코드·draft)를 거쳐야
  // 한다 — 별도 구현이면 마크와 필터 결과가 어긋날 수 있다.
  it('상태 select는 행의 마크와 같은 유도로 걸러낸다', async () => {
    useSubmitStore.setState({
      records: {
        solved: { passed: 2, total: 2, at: 1, solvedAt: 1 },
        failed: { passed: 1, total: 2, at: 1 },
      },
    });
    useDraftStore.setState({ drafts: { wip: 'function solution() {}' } });
    const host = await renderList(['solved', 'failed', 'wip', 'untried'].map((id) => meta({ id })));

    await act(async () => {
      setControlValue(selectByLabel(host, '상태 필터'), 'wip');
    });

    const hrefs = Array.from(host.querySelectorAll('a[data-status]')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/problems/wip']);
  });

  // 태그 목록은 metas에서 모은다 — 하드코딩이면 이 희귀 태그가 옵션에
  // 나타나지 않는다.
  it('태그 select 옵션은 metas의 tags에서 모은다', async () => {
    const host = await renderList([meta({ id: 'x', title: '커스텀 문제', tags: ['희귀태그'] })]);
    const select = selectByLabel(host, '태그 필터');
    const optionTexts = Array.from(select.querySelectorAll('option')).map((o) => o.textContent);
    expect(optionTexts).toContain('희귀태그');

    await act(async () => {
      setControlValue(select, '희귀태그');
    });
    expect(renderedTitles(host)).toEqual(['커스텀 문제']);
  });

  it('tags가 undefined인 메타가 섞여 있어도 태그 필터가 죽지 않는다', async () => {
    const host = await renderList([
      meta({ id: 'no-tags', title: '태그 없음' }),
      meta({ id: 'has-tag', title: '태그 있음', tags: ['x'] }),
    ]);

    await act(async () => {
      setControlValue(selectByLabel(host, '태그 필터'), 'x');
    });

    expect(renderedTitles(host)).toEqual(['태그 있음']);
  });

  // 0건 URL로 직접 들어가는 경우(리뷰 포커스 5 · 브리프 Step 5) — 빈 표가
  // 아니라 안내와 초기화가 보여야 하고, 라이브 리전이 비시각 사용자에게도
  // 같은 사실을 알려야 한다.
  it('필터로 0건이 되면 안내와 초기화 버튼이 보이고, 누르면 네 필터가 모두 풀린다', async () => {
    // 네 필터를 동시에 걸되, 각각 **따로도** 0건 쪽으로 좁히는 값을 쓴다
    // (q='짝수'→001만, level=1→003만, status='solved'→기본은 전부 미시도라
    // 아무것도 없음, tag='정렬'→003만) — resetFilters가 넷 중 하나라도
    // 빼먹으면 그 필터 하나만으로도 3건 전체가 돌아오지 못한다. 손으로
    // encode하지 않고 URLSearchParams로 만든다.
    const search = new URLSearchParams({ q: '짝수', level: '1', status: 'solved', tag: '정렬' }).toString();
    const host = await renderList(REAL_METAS, `/?${search}`);

    expect(host.querySelectorAll('a[data-status]')).toHaveLength(0);
    expect(host.textContent).toContain('조건에 맞는 문제가 없습니다');
    expect(filterLiveText(host)).toBe('조건에 맞는 문제가 없습니다');

    const resetBtn = Array.from(host.querySelectorAll('button')).find((b) => (b.textContent ?? '').trim() === '필터 초기화')!;
    await act(async () => {
      resetBtn.click();
    });

    expect(host.querySelectorAll('a[data-status]')).toHaveLength(3);
    // 필터가 모두 기본값으로 돌아오면 필터 라이브 리전도 다시 비워진다.
    expect(filterLiveText(host)).toBe('');
    // 검색창도 리셋된다 — 로컬 qInput이 URL과 별개로 남아 있지 않은지.
    expect(searchInput(host).value).toBe('');
  });

  // 리뷰 Minor 6: 0건에는 "필터가 걸러냈다"와 "로더가 원래 빈 목록을 돌려줬다"
  // 두 원인이 있는데, `visible.length === 0`만 보고 하나의 블록을 그리면
  // 구분이 안 된다. 필터가 하나도 없는데 0건이면 — 되돌릴 필터가 없으므로
  // "필터 초기화" 버튼이 아무 일도 하지 않아야 정상인데, 버튼 자체가 그냥
  // 떠 있으면 사용자가 눌러볼 이유를 준다. 안내 문구도 원인에 맞게
  // 갈라야 한다. `hasFilter && …`로만 바꿔도(초기화 버튼을 숨기지 않고)
  // 유닛·e2e가 그대로 green이라 이 분기 자체가 지금까지 검증되지 않았다.
  it('문제가 아예 없으면(필터와 무관) 다른 안내를 보여주고 초기화 버튼은 없다', async () => {
    const host = await renderList([]);

    expect(host.querySelectorAll('a[data-status]')).toHaveLength(0);
    expect(host.textContent).toContain('아직 등록된 문제가 없습니다');
    expect(host.textContent).not.toContain('조건에 맞는 문제가 없습니다');
    expect(Array.from(host.querySelectorAll('button')).some((b) => (b.textContent ?? '').trim() === '필터 초기화')).toBe(
      false,
    );
  });

  // 대조군 — 필터가 걸려 0건이면(바로 위 테스트와 반대) 반드시 "조건에 맞는
  // 문제가 없습니다"와 초기화 버튼이 함께 보인다. 두 테스트가 함께 있어야
  // `hasFilter` 분기 자체가 실제로 양쪽을 가르는지가 고정된다.
  it('필터로 0건이면(문제는 있음) "조건에 맞는 문제가 없습니다"와 초기화 버튼이 함께 보인다', async () => {
    const host = await renderList(REAL_METAS, '/?level=9');

    expect(host.textContent).toContain('조건에 맞는 문제가 없습니다');
    expect(host.textContent).not.toContain('아직 등록된 문제가 없습니다');
    expect(Array.from(host.querySelectorAll('button')).some((b) => (b.textContent ?? '').trim() === '필터 초기화')).toBe(
      true,
    );
  });

  // 스펙 226행: 진척도 줄은 필터와 무관하게 전체 기준이다. 0건이 되어도
  // (분자가 있는데도) 분모·분자가 줄지 않는지까지 본다.
  it('필터를 걸어 0건이 되어도 진척도 줄은 전체 기준으로 남는다', async () => {
    useSubmitStore.setState({
      records: { '001-even-sum': { passed: 1, total: 1, at: 1, solvedAt: 1 } },
    });
    const host = await renderList(REAL_METAS, '/?level=9');

    expect(host.textContent).toContain('3문제 중 1개 통과');
  });

  // 검색창은 예외적으로 로컬 상태(qInput)를 쓴다 — 화면은 즉시 반응하되
  // URL 커밋만 디바운스한다(ProblemListPage.tsx의 SEARCH_DEBOUNCE_MS 주석
  // 참조). router.state.location.search로 "진짜 URL"을 직접 들여다봐야
  // 이 시차를 확인할 수 있다.
  it('검색 입력은 즉시 필터링하지만 URL 커밋은 디바운스한다', async () => {
    const router = createMemoryRouter([{ path: '/', element: <ProblemListPage />, loader: () => REAL_METAS }], {
      initialEntries: ['/'],
    });
    const host = document.createElement('div');
    document.body.appendChild(host);
    await act(async () => {
      createRoot(host).render(<RouterProvider router={router} />);
    });

    await act(async () => {
      setControlValue(searchInput(host), '배열');
    });

    // 즉시: 행은 이미 걸러졌다.
    expect(renderedTitles(host)).toEqual(['짝수만 더하기']);
    // 즉시: 그런데 URL은 아직 비어 있다 — 디바운스 중.
    expect(router.state.location.search).toBe('');

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 400));
    });

    expect(new URLSearchParams(router.state.location.search).get('q')).toBe('배열');
  });

  // 디바운스 타이머가 돌고 있는 중에 다른 필터(select, 즉시 커밋)를 바꾸면
  // — 두 커밋이 모두 같은 query 객체를 머지하는 setQuery를 쓰므로 —
  // 타이머가 오래된 클로저를 들고 있으면 select로 바꾼 값이 되돌아갈 수
  // 있다. useEffect 의존성에 query.q·setQuery를 넣어 막은 그 회귀를 고정한다.
  it('디바운스가 끝나기 전에 다른 필터를 바꿔도 디바운스가 끝나면 둘 다 반영된다', async () => {
    const router = createMemoryRouter([{ path: '/', element: <ProblemListPage />, loader: () => REAL_METAS }], {
      initialEntries: ['/'],
    });
    const host = document.createElement('div');
    document.body.appendChild(host);
    await act(async () => {
      createRoot(host).render(<RouterProvider router={router} />);
    });

    await act(async () => {
      setControlValue(searchInput(host), '배열'); // 디바운스 타이머 시작, 아직 안 커밋
    });
    await act(async () => {
      setControlValue(selectByLabel(host, '난이도 필터'), '0'); // select는 즉시 커밋
    });

    let params = new URLSearchParams(router.state.location.search);
    expect(params.get('level')).toBe('0');
    expect(params.get('q')).toBeNull(); // q는 아직 디바운스 중이어야 한다

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 400));
    });

    params = new URLSearchParams(router.state.location.search);
    expect(params.get('level')).toBe('0');
    expect(params.get('q')).toBe('배열');
  });

  // 리뷰 Minor 7: resetFilters(ProblemListPage.tsx)의 setQuery 호출에서
  // q:''를 빼면 — 로컬 qInput은 즉시 비어 화면은 바로 맞아 보이지만, URL의
  // q는 "qInput과 query.q가 달라졌다"는 디바운스 effect가 300ms 뒤에야
  // 지운다. e2e의 toHaveURL처럼 재시도하는 단언은 그 지연을 가려 "결국은
  // 깨끗해지니 통과"로 넘어간다. 여기서는 act() 밖의 실제 시간을 전혀
  // 기다리지 않고 — resetFilters의 setQuery는 타이머가 아니라 클릭
  // 핸들러 안에서 바로 불린다 — 클릭 직후 시점의 URL을 본다.
  it('필터 초기화는 URL의 q를 즉시 지운다(디바운스를 기다리지 않는다)', async () => {
    const router = createMemoryRouter([{ path: '/', element: <ProblemListPage />, loader: () => REAL_METAS }], {
      initialEntries: ['/?q=zzz'],
    });
    const host = document.createElement('div');
    document.body.appendChild(host);
    await act(async () => {
      createRoot(host).render(<RouterProvider router={router} />);
    });
    expect(new URLSearchParams(router.state.location.search).get('q')).toBe('zzz');

    const resetBtn = Array.from(host.querySelectorAll('button')).find(
      (b) => (b.textContent ?? '').trim() === '필터 초기화',
    )!;
    await act(async () => {
      resetBtn.click();
    });

    // 디바운스(300ms)를 한순간도 기다리지 않은 이 지점에서 이미 q가 없어야
    // 한다 — 기다렸다가 통과하면(즉 여기서 실패했다가 400ms 뒤 재확인하면
    // 통과하면) 리뷰가 지적한 그 결함이다.
    expect(new URLSearchParams(router.state.location.search).get('q')).toBeNull();
  });
});
