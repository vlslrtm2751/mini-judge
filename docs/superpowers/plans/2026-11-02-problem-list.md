# 문제 목록 홈 화면 구현 계획

> **완료.** PR #10로 머지됨(2026-11-13). 일곱 태스크 전부 구현·리뷰·수정을
> 거쳤다. 실행 중 이 계획 자체의 결함이 여러 건 드러나 고쳐가며 진행했고,
> 그 기록은 각 태스크 절의 경고 블록과 커밋 메시지에 있다. 특히:
> - Task 3의 테스트 목록은 실패한 제출을 기록하지 않는 구현도 통과시켰다.
> - Task 4가 지정한 정렬 e2e는 실제 문제 셋의 난이도 순서가 `order` 순서와
>   우연히 같아 정렬 코드 없이도 통과했다.
> - 스펙이 e2e로 요구한 "제출 뒤 목록에 반영"이 어느 태스크에도 없었다.
> - Task 7의 전제 두 개가 틀렸다(아래 그 절의 경고 블록 참조).
>
> Task 5는 사용자 결정으로 5a(URL 쿼리·정렬)와 5b(검색·필터·0건)로 쪼개
> 실행했다. 이 문서의 Task 5 절은 둘을 합친 원래 형태 그대로 둔다.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/`를 문제 목록 홈으로 만들고, 문제별 풀이 상태를 보여준다.

**Architecture:** 상태는 저장하지 않고 새 제출 기록 저장소와 기존 `draftStore`에서 순수 함수로 유도한다. 필터·정렬은 URL 쿼리가 유일한 출처다. 빨간 펜 마크는 출력 패널에 묶여 있던 것을 `src/ui/`로 꺼내 목록과 공유한다.

**Tech Stack:** React 19, TypeScript, react-router(해시), zustand + persist, CSS Modules, vitest(jsdom), Playwright

**Spec:** `docs/superpowers/specs/2026-11-02-problem-list-design.md`

## Global Constraints

- 상태 4종은 `통과 / 실패 / 진행 중 / 미시도`. 마크는 `○ / ╱ / ··· / 빈칸`.
- 유도 우선순위: 통과한 적 있음 → 제출한 적 있음 → draft 있음 → 미시도.
- **통과는 한 번 따면 유지된다.** 이후 제출이 실패해도 통과로 남는다.
- 중지(`cancelled`)되거나 치명적 오류(`fatal`)로 끝난 실행은 기록하지 않는다.
- 색·간격·폰트는 `tokens.css` 변수로만 쓴다. 색 리터럴 금지.
- 인라인 `style={{}}`를 새로 쓰지 않는다. CSS Module을 쓴다.
- localStorage가 없거나 읽기에 실패해도 앱이 죽지 않는다.
- 760px 이하가 모바일 경계. 기존 작업 영역과 같은 값.
- 문서 전체는 스크롤되지 않는다. 목록은 자체 스크롤 영역을 갖는다.
- 모든 커밋에서 `npm run typecheck`과 `npm run lint`(0 errors)가 통과해야 한다.
- 각 태스크 끝에서 Playwright 스크린샷을 찍어 **실제 화면을 눈으로 확인한다.**

## Review Focus

스펙이 전제하지만 어느 태스크의 테스트도 건드리지 않는, 사용자를 물 가능성이 높은 순서:

1. **localStorage가 막혔거나 저장된 값이 깨졌을 때** — 사생활 보호 모드나 손상된 값에서 목록이 빈 화면이 되면 안 된다. 모양이 맞지 않는 값은 무시하고 미시도로 친다. → Task 1에서 테스트.
2. **`tags`가 없는 문제** — `ProblemMeta.tags`는 선택 필드다. 태그 열과 태그 필터가 `undefined`에서 깨지면 안 된다. → Task 4에서 테스트.
3. **알 수 없는 쿼리 값** — `?level=abc`, `?sort=nope`, `?dir=sideways`로 들어와도 기본값으로 떨어지고 목록이 보여야 한다. → Task 5에서 테스트.
4. **기록은 있는데 문제가 사라진 경우** — id를 바꾸거나 문제를 지우면 남은 기록이 뜬다. 진척도 분모·분자가 현재 문제 목록 기준이어야 한다. → Task 1에서 테스트.
5. **필터로 0건이 된 URL을 직접 열었을 때** — 빈 표가 아니라 안내와 초기화가 보여야 한다. → Task 5에서 테스트.

---

## File Structure

| 파일 | 책임 |
|---|---|
| `src/stores/submitStore.ts` (신규) | 문제별 제출 기록의 영속 저장 |
| `src/domain/progress.ts` (신규) | 기록 + draft → 상태. 순수 함수 |
| `src/ui/Mark.tsx` · `Mark.module.css` (신규) | 빨간 펜 마크 공용 프리미티브 |
| `src/features/problems/ProblemListPage.tsx` (신규) | 목록 화면 |
| `src/features/problems/problemList.module.css` (신규) | 목록 스타일 |
| `src/features/problems/useListQuery.ts` (신규) | URL 쿼리 ↔ 필터·정렬 상태 |
| `src/app/router.tsx` | `/`를 목록으로 |
| `src/features/workspace/ProblemPicker.tsx` | select → "← 목록" + 제목 |
| `src/features/workspace/IdePage.tsx` | 로더 데이터에서 `list` 제거 |
| `src/hooks/useRun.ts` | 제출 결과 기록 |
| `src/features/output/CaseItem.tsx` · `output.module.css` | 공용 `Mark` 사용 |

---

## Task 1: 제출 기록 저장소와 상태 유도

**Files:**
- Create: `src/stores/submitStore.ts`, `src/domain/progress.ts`
- Test: `tests/unit/progress.test.ts`

**Interfaces:**
- Consumes: `ProblemId`, `ProblemMeta` (`@/domain/types`)
- Produces:
  ```ts
  // src/stores/submitStore.ts
  export interface SubmitRecord { passed: number; total: number; at: number; solvedAt?: number }
  interface SubmitState {
    records: Record<ProblemId, SubmitRecord>;
    record(id: ProblemId, passed: number, total: number): void;
  }
  export const useSubmitStore: UseBoundStore<StoreApi<SubmitState>>;

  // src/domain/progress.ts
  export type ProblemStatus = 'solved' | 'failed' | 'wip' | 'untried';
  export function deriveStatus(
    record: SubmitRecord | undefined,
    hasDraft: boolean,
  ): ProblemStatus;
  export function countSolved(
    metas: ProblemMeta[],
    records: Record<ProblemId, SubmitRecord>,
  ): number;
  ```
  `record()`는 `passed === total && total > 0`일 때 `solvedAt`이 **없을 때만** 채운다. `at`은 항상 갱신한다.

- [x] **Step 1: 실패 테스트 작성** — `tests/unit/progress.test.ts`

`deriveStatus`:
- 기록 없음 + draft 없음 → `'untried'`
- 기록 없음 + draft 있음 → `'wip'`
- `{passed:1,total:3}` → `'failed'`
- `{passed:3,total:3,solvedAt:1}` → `'solved'`
- **`{passed:0,total:3,solvedAt:1}` → `'solved'`** (통과 뒤 실패 제출)
- `{passed:1,total:3}` + draft 있음 → `'failed'` (기록이 draft보다 강하다)

`countSolved` (Review Focus 4):
- `metas`에 없는 id의 기록은 세지 않는다

`useSubmitStore.record` (Review Focus 1):
- 첫 통과에 `solvedAt`이 생긴다
- 통과 뒤 실패를 기록해도 `solvedAt`이 남고 `passed`/`at`은 갱신된다
- `total === 0`인 기록은 통과로 치지 않는다

- [x] **Step 2: 실패 확인** — `npm run test -- progress` / 기대: `@/domain/progress` 해결 실패

- [x] **Step 3: `src/stores/submitStore.ts` 구현**

`draftStore`와 같은 모양 — `create<SubmitState>()(persist(..., { name: 'js-ide:submits' }))`.

- [x] **Step 4: `src/domain/progress.ts` 구현**

순수 함수 두 개. zustand나 React를 import하지 않는다.

- [x] **Step 5: 통과 확인** — `npm run test` / 기대: 기존 41개 + 신규 전부 통과

- [x] **Step 6: 손상된 저장값에 대한 방어 테스트** (Review Focus 1)

`localStorage`에 `js-ide:submits`로 `'{"state":{"records":{"a":"nope"}}}'`를 넣고 스토어를 다시 읽었을 때, `deriveStatus`가 던지지 않고 `'untried'`로 떨어지는지. 필요하면 `deriveStatus`에 모양 검사를 넣는다.

- [x] **Step 7: 커밋**

```bash
git add src/stores/submitStore.ts src/domain/progress.ts tests/unit/progress.test.ts
git commit -m "feat: 제출 기록 저장소와 문제 상태 유도 추가"
```

---

## Task 2: 빨간 펜 마크를 공용으로 추출

**Files:**
- Create: `src/ui/Mark.tsx`, `src/ui/Mark.module.css`
- Modify: `src/features/output/CaseItem.tsx`, `src/features/output/output.module.css`
- Test: `tests/unit/mark.test.tsx`

**Interfaces:**
- Consumes: 없음
- Produces:
  ```ts
  export type MarkKind = 'pass' | 'fail' | 'error' | 'timeout' | 'running' | 'pending' | 'wip' | 'none';
  export function Mark(props: { kind: MarkKind; className?: string }): React.ReactElement;
  ```
  루트 요소에 `data-mark={kind}`를 단다. `'none'`은 빈 상자를 그린다.

지금 규칙은 `output.module.css`에 `.case[data-status='…'] .mark::before`로 묶여 있어 CSS Modules에서 다른 기능이 재사용할 수 없다. 모양 정의를 `Mark.module.css`로 옮기고 `[data-mark='…']`로 다시 건다. **`wip`은 점 세 개(`···`, `--ink-2`)로 새로 추가한다.**

- [x] **Step 1: 실패 테스트 작성** — `tests/unit/mark.test.tsx`

`kind`별로 `data-mark` 속성이 맞게 붙는지, `'none'`도 요소를 렌더하는지(열 너비 유지).

- [x] **Step 2: 실패 확인** — `npm run test -- mark`

- [x] **Step 3: `Mark.module.css`에 모양 이전**

`output.module.css`의 `.mark`, `.mark::before`, 상태별 `::before`/`::after` 규칙을 그대로 옮기되 선택자를 `[data-mark='pass']` 형태로 바꾼다. `ink`·`spin` 키프레임도 함께 옮긴다. 옮긴 규칙은 `output.module.css`에서 지운다.

- [x] **Step 4: `Mark.tsx` 구현 후 `CaseItem.tsx`에서 사용**

`CaseItem`의 `<span className={styles.mark} aria-hidden />`를 `<Mark kind={item.status} />`로 바꾼다. `CaseStatus`와 `MarkKind`는 `'wip'`/`'none'`을 뺀 나머지가 같은 이름이다.

- [x] **Step 5: 기존 테스트가 그대로 통과하는지 확인**

`npm run test && npm run build && npx playwright test`
기대: 유닛 전부 통과, **e2e 25개 전부 통과**. `output-panel.spec.ts`의 상태 구분 테스트가 복제하는 클래스 이름이 바뀌므로, 깨지면 그 테스트를 `[data-mark]` 기준으로 고친다 — 지키려는 동작(네 상태가 서로 구분됨)은 그대로다.

- [x] **Step 6: 눈으로 확인** — 테스트를 실행해 통과·실패·오류 마크가 이전과 똑같이 보이는지 스크린샷

- [x] **Step 7: 커밋**

```bash
git add src/ui/Mark.tsx src/ui/Mark.module.css src/features/output tests/unit/mark.test.tsx tests/e2e
git commit -m "refactor: 빨간 펜 마크를 공용 프리미티브로 추출"
```

---

## Task 3: 제출 결과를 기록에 남긴다

**Files:**
- Modify: `src/hooks/useRun.ts`
- Test: `tests/unit/useRun.test.tsx`

**Interfaces:**
- Consumes: Task 1의 `useSubmitStore.record`
- Produces: 없음

- [x] **Step 1: 실패 테스트 작성** — `tests/unit/useRun.test.tsx`

`@/app/services`의 `judge`를 `vi.mock`해 `RunReport`를 통제한다. 네 가지:
- `kind:'submit'`, `passed:3,total:3` → `record`가 `(id, 3, 3)`로 불린다
- `kind:'test'` → `record`가 불리지 않는다
- `kind:'submit'`, `cancelled:true` → 불리지 않는다
- `kind:'submit'`, `fatal` 있음 → 불리지 않는다

- [x] **Step 2: 실패 확인** — `npm run test -- useRun`

- [x] **Step 3: `useRun.ts`에 기록 추가**

`runStore.finish(report)` 직후, 위 네 조건을 만족할 때만 `record(problem.meta.id, report.passed, report.total)`.

- [x] **Step 4: 통과 확인** — `npm run test`

- [x] **Step 5: 커밋**

```bash
git add src/hooks/useRun.ts tests/unit/useRun.test.tsx
git commit -m "feat: 제출이 끝나면 결과를 기록한다"
```

---

## Task 4: 목록 화면과 라우팅

**Files:**
- Create: `src/features/problems/ProblemListPage.tsx`, `src/features/problems/problemList.module.css`
- Modify: `src/app/router.tsx`, `src/features/workspace/IdePage.tsx`
- Modify: `tests/e2e/*.spec.ts` (6개 전부)
- Test: `tests/e2e/problem-list.spec.ts` (신규)

**Interfaces:**
- Consumes: Task 1의 `deriveStatus`·`countSolved`·`useSubmitStore`, Task 2의 `Mark`
- Produces: 라우트 `/` → `ProblemListPage`. 로더가 `ProblemMeta[]`를 돌려준다.
- **상태 이름이 다르다.** `ProblemStatus`는 `solved|failed|wip|untried`, `MarkKind`는
  `pass|fail|…|wip|none`이다. 목록 안에 변환을 둔다:
  `solved→pass`, `failed→fail`, `wip→wip`, `untried→none`.
- **정렬 기준.** 난이도 오름차순, 같으면 `meta.order`(없으면 9999), 그래도 같으면 `id`.
  `localRepository`의 `metaList`가 이미 `order`→`id` 순으로 정렬돼 오므로 난이도만 안정
  정렬하면 된다.

**이 태스크가 기존 e2e 25개를 깬다.** `/`가 더 이상 IDE가 아니다.

- [x] **Step 1: 목록 e2e 작성** — `tests/e2e/problem-list.spec.ts`

- `/`를 열면 문제 3개가 행으로 보이고, 난이도 오름차순이다
- 행을 클릭하면 `/problems/<id>`로 간다
- 첫 행에 포커스를 두고 아래 화살표를 누르면 둘째 행으로 옮겨가고, Enter로 그 문제가 열린다
- 상단에 `0개 통과`가 보인다
- 난이도가 같은 두 문제는 `order` 순으로 나온다

- [x] **Step 1b: 태그 없는 문제 유닛 테스트 작성** (Review Focus 2) — `tests/unit/problemList.test.tsx`

`ProblemMeta.tags`는 선택 필드다. 현재 세 문제가 모두 태그를 갖고 있어 e2e로는
이 경우에 닿지 않는다. `tags`가 `undefined`인 `ProblemMeta`를 넘겨 행이 렌더되고
제목이 보이는지 단언한다.

- [x] **Step 2: 실패 확인** — `npm run build && npx playwright test tests/e2e/problem-list.spec.ts` / 기대: `/`가 IDE라 실패

- [x] **Step 3: `ProblemListPage` 구현**

열: 상태 `<Mark>` · 제목 · `Lv.{level}` · 태그 칩. 난이도 오름차순 고정(정렬 UI는 Task 5). 상단에 `{n}문제 중 {k}개 통과`와 `--ok` 막대. 행 전체가 `<Link>`. 목록은 자체 스크롤 영역.

읽기 좋은 최대 폭으로 가운데 정렬한다(스펙: 문제가 적을 때 허공에 뜨지 않게).

**키보드 이동**(스펙): 위·아래 화살표로 행 사이를 옮기고 Enter로 연다. 행이
`<Link>`이므로 Enter는 그냥 동작한다 — 화살표만 목록 컨테이너의 `onKeyDown`에서
처리해 다음/이전 링크에 `focus()`를 준다. 포커스 링은 전역 `:focus-visible`이 맡는다.

- [x] **Step 4: 라우터 수정** — `src/app/router.tsx`

`/`의 리다이렉트 로더를 `repository.list()`를 돌려주는 로더로 바꾸고 `element: <ProblemListPage />`를 단다. `/problems/:id` 로더에서 `list`를 빼고, `IdePage`의 `LoaderData`에서도 뺀다. `ProblemPicker`가 아직 `list`를 받으므로 Task 6까지는 **빈 배열을 넘겨 타입만 맞춘다** — Task 6에서 prop 자체가 사라진다.

- [x] **Step 5: 기존 e2e 25개 이전**

6개 스펙의 `page.goto('/')`를 `page.goto('/problems/001-even-sum')`로 바꾼다. `locator('select')`를 쓰는 **세 곳**을 고친다:
- `basic.spec.ts:26` 문제 전환 — 목록으로 가서 다른 문제를 클릭하는 흐름으로
- `layout.spec.ts:54`, `theme.spec.ts:153` 단순 대기 — `.cm-content` 등 IDE에 확실히 있는 요소로

`theme.spec.ts`의 포커스 순회는 `SELECT` 방문을 단언한다. Task 6에서 select가 사라지므로 **지금은 그대로 두고**, Task 6에서 함께 고친다.

- [x] **Step 6: 전체 통과 확인**

`npm run typecheck && npm run lint && npm run test && npm run build && npx playwright test`
기대: 기존 25개 + 목록 신규 전부 통과

- [x] **Step 7: 눈으로 확인** — 목록 화면 스크린샷. 3행이 허공에 뜨지 않는지, 마크와 난이도가 읽히는지

- [x] **Step 8: 커밋**

```bash
git add src/features/problems src/app/router.tsx src/features/workspace/IdePage.tsx tests/e2e
git commit -m "feat: 문제 목록을 홈 화면으로"
```

---

## Task 5: 검색·필터·정렬과 URL 쿼리

**Files:**
- Create: `src/features/problems/useListQuery.ts`
- Modify: `src/features/problems/ProblemListPage.tsx`, `problemList.module.css`
- Test: `tests/unit/listQuery.test.ts`, `tests/e2e/problem-list.spec.ts` (추가)

**Interfaces:**
- Consumes: Task 1의 `ProblemStatus`
- Produces:
  ```ts
  export interface ListQuery {
    q: string;
    level: number | null;
    status: ProblemStatus | null;
    tag: string | null;
    sort: 'level' | 'title';
    dir: 'asc' | 'desc';
  }
  export function parseListQuery(search: URLSearchParams): ListQuery;
  export function toSearchParams(query: ListQuery): URLSearchParams;
  export function useListQuery(): [ListQuery, (next: Partial<ListQuery>) => void];
  ```
  기본값: `{ q:'', level:null, status:null, tag:null, sort:'level', dir:'asc' }`.
  `toSearchParams`는 기본값과 같은 항목을 **빼서** URL을 짧게 유지한다.

- [x] **Step 1: 실패 테스트 작성** — `tests/unit/listQuery.test.ts`

`parseListQuery` (Review Focus 3):
- 빈 검색 → 기본값
- `?level=1&sort=title&dir=desc` → 그대로
- **`?level=abc` → `level: null`**
- **`?sort=nope` → `sort: 'level'`**
- **`?dir=sideways` → `dir: 'asc'`**
- **`?status=bogus` → `status: null`**

`toSearchParams`:
- 기본값만 있으면 빈 문자열
- 왕복: `parse(toSearchParams(q))`가 `q`와 같다

- [x] **Step 2: 실패 확인** — `npm run test -- listQuery`

- [x] **Step 3: `useListQuery.ts` 구현**

`react-router`의 `useSearchParams` 위에 얹는다. 알 수 없는 값은 조용히 기본값으로 떨어뜨린다.

- [x] **Step 4: 목록에 컨트롤 연결**

검색 입력(제목·태그 대상), 난이도·상태·태그 필터, 정렬 가능한 표 헤더. 필터 컨트롤은 기존 `ProblemPicker`처럼 커스텀 화살표를 붙인 네이티브 `select`를 쓴다. 진척도 줄은 **필터와 무관하게 전체 기준**이다.

0건이면 `조건에 맞는 문제가 없습니다`와 `필터 초기화` 버튼을 보인다.

- [x] **Step 5: e2e 추가** — `tests/e2e/problem-list.spec.ts`

- 검색어를 넣으면 행이 줄고 URL에 `?q=`가 붙는다
- 제목 정렬로 바꾸면 순서가 바뀌고 URL에 `?sort=title`이 붙는다
- **0건이 되는 URL로 직접 들어가면 안내와 초기화 버튼이 보이고, 누르면 전체가 돌아온다** (Review Focus 5)

- [x] **Step 6: 전체 통과 확인** — 게이트 전부

- [x] **Step 7: 눈으로 확인** — 필터를 건 상태와 0건 상태 스크린샷

- [x] **Step 8: 커밋**

```bash
git add src/features/problems tests/unit/listQuery.test.ts tests/e2e/problem-list.spec.ts
git commit -m "feat: 목록에 검색·필터·정렬을 붙이고 URL에 담는다"
```

---

## Task 6: IDE 상단바 교체

**Files:**
- Modify: `src/features/workspace/ProblemPicker.tsx` (→ 이름도 바꾼다), `IdePage.tsx`, `chrome.module.css`
- Modify: `src/features/problems/ProblemListPage.tsx` (링크에 state 싣기)
- Modify: `tests/e2e/theme.spec.ts` (포커스 순회), `tests/e2e/problem-list.spec.ts` (추가)

**Interfaces:**
- Consumes: Task 5의 `toSearchParams`
- Produces: `ProblemPicker`를 대체하는 `WorkspaceHeader`
  ```ts
  export function WorkspaceHeader(props: { title: string }): React.ReactElement;
  ```
  목록의 행 `<Link>`는 `state={{ listSearch: location.search }}`를 싣는다. 헤더의 "← 목록"은 `useLocation().state?.listSearch`가 있으면 `/${search}`로, 없으면 `/`로 간다.

- [x] **Step 1: 실패 e2e 작성** — `tests/e2e/problem-list.spec.ts`

필터를 건 뒤 문제를 열고 "← 목록"을 누르면 **필터가 그대로**인지. 그리고 `/problems/001-even-sum`으로 직접 들어가 "← 목록"을 누르면 필터 없는 목록으로 가는지.

- [x] **Step 2: 실패 확인** — 아직 select라 실패

- [x] **Step 3: `WorkspaceHeader` 구현, `ProblemPicker` 삭제**

브랜드 + 현재 문제 제목(글자) + "← 목록" 링크. `IdePage`에서 `list` prop을 완전히 들어낸다(Task 4에서 임시로 넘기던 빈 배열도).

- [x] **Step 4: 포커스 순회 테스트 수정** — `tests/e2e/theme.spec.ts`

`SELECT` 방문 단언이 더 이상 성립하지 않는다. 링크(`A`)를 지나는지로 바꾸고, 버튼 고유 개수 단언은 유지한다.

- [x] **Step 5: 전체 통과 확인** — 게이트 전부

- [x] **Step 6: 눈으로 확인** — IDE 상단바 스크린샷

- [x] **Step 7: 커밋**

```bash
git add src/features/workspace src/features/problems tests/e2e
git commit -m "feat: IDE 상단바를 목록 링크로 바꾼다"
```

---

## Task 7: 모바일 레이아웃

**Files:**
- Modify: `src/features/problems/problemList.module.css`
- Test: `tests/e2e/problem-list.spec.ts` (추가)

**Interfaces:**
- Consumes: 없음
- Produces: 없음

> **이 절의 전제 두 개가 틀렸다**(Task 4 이후 실측으로 확인). 아래 Step은 그에
> 맞춰 고쳐 쓴 것이다.
> - 열은 **6개가 아니라 4개**다(상태·제목·난이도·태그). "케이스 수"와 "제한"은
>   사용자가 뺐다.
> - 390px에서 **가로로 넘치지 않는다**(`documentElement.scrollWidth === clientWidth === 390`).
>   grid가 `28px 48px 52px 180px`이라 태그 열이 180px를 고정으로 쥐는 동안 제목
>   열이 48px로 찌그러지기 때문이다. 넘치는 대신 **제목이 잘린다.**

- [x] **Step 1: 실패 테스트 작성**

390×844에서 `/`를 열었을 때 **첫 행의 제목이 잘리지 않는지** — 제목 셀의
`scrollWidth <= clientWidth`. 이것이 지금 실패하고 카드 레이아웃 후 통과하는
단언이다. 실측 당시 세 제목은 73~128px를 필요로 하는데 48px만 받았다
**숫자를 테스트에 박지 마라.** 같은 제목이 측정 때마다 73~78px로 나왔다.
가장 큰 요인은 재는 맥락의 font-size다 — 문서 기본 14px로 재면 78/128/99,
셀이 실제로 상속받는 13px로 재면 73/118/90으로 비율 14/13이 그대로 드러난다.
다만 셀의 `scrollWidth`를 직접 읽어도 실행에 따라 73과 78이 모두 관측됐으므로
font-size만이 원인은 아니다(웹폰트 로드 시점이 의심되나 확정하지 않았다).
`scrollWidth`와 순수 텍스트 폭의 차이는 1px 미만으로 무관하다. 어느 쪽이든
`scrollWidth <= clientWidth`로 비교하면 이 변동에 영향받지 않는다.

문서가 가로로 넘치지 않는지도 함께 본다(기존 `layout.spec.ts`의 치수 재는
방식). **다만 그 단언만으로는 부족하다** — 지금도 넘치지 않으므로 착수 전에
이미 통과한다.

- [x] **Step 2: 실패 확인** — 제목이 48px로 잘려 `scrollWidth > clientWidth`

- [x] **Step 3: `@media (max-width: 760px)` 추가**

표의 행을 쌓인 카드로 바꾼다 — 첫 줄 마크 + 제목, 둘째 줄 난이도 · 태그. 컨트롤은 검색 입력과 필터만 남긴다.

**검색 입력과 필터 `select` 세 개의 `font-size`를 16px 이상으로 둔다.** 16px
미만이면 iOS Safari가 포커스 시 화면을 확대한다. 이 지식은 Task 6이 지운
`chrome.module.css`의 `.picker select` 규칙에 적혀 있던 것이다 — 그 select가
사라지면서 규칙도 사라졌고, 같은 함정이 목록의 컨트롤로 옮겨왔다.

- [x] **Step 4: 통과 확인** — `npx playwright test`

- [x] **Step 5: 눈으로 확인** — 390px 스크린샷

- [x] **Step 6: 커밋**

```bash
git add src/features/problems/problemList.module.css tests/e2e/problem-list.spec.ts
git commit -m "feat: 좁은 화면에서 목록을 카드로 쌓는다"
```

---

## 마무리

- [x] 전체 게이트: `npm run typecheck && npm run lint && npm run verify:problems && npm run test && npm run build && npm run test:e2e`
- [x] e2e를 3회 연속 돌려 플래키가 없는지 확인
- [x] 제출 → 목록 왕복을 손으로 해보고 마크와 진척도가 바뀌는지 눈으로 확인
- [x] 데스크톱·모바일 최종 스크린샷
