import { useEffect, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { Link, useLoaderData } from 'react-router-dom';
import type { ProblemMeta } from '@/domain/types';
import type { ProblemStatus } from '@/domain/progress';
import { countSolved, deriveStatus } from '@/domain/progress';
import { useSubmitStore } from '@/stores/submitStore';
import { useDraftStore } from '@/stores/draftStore';
import type { MarkKind } from '@/ui/Mark';
import { Mark } from '@/ui/Mark';
import type { ListQuery } from './useListQuery';
import { useListQuery } from './useListQuery';
import styles from './problemList.module.css';

// ProblemStatus와 MarkKind는 어휘가 다르다. 그 변환을 목록이 쥔다.
const MARK: Record<ProblemStatus, MarkKind> = {
  solved: 'pass',
  failed: 'fail',
  wip: 'wip',
  untried: 'none',
};

// 마크는 aria-hidden이라 상태가 스크린리더에 전혀 닿지 않는다. 글자로 덧붙인다.
const STATUS_LABEL: Record<ProblemStatus, string> = {
  solved: '통과',
  failed: '실패',
  wip: '진행 중',
  untried: '미시도',
};

// 상태 select의 옵션 순서. ProblemStatus는 고정된 네 값이라(태그·난이도와
// 달리 데이터에서 모을 대상이 아니다) 여기서 하드코딩한다.
const STATUS_FILTER_OPTIONS: readonly ProblemStatus[] = ['solved', 'failed', 'wip', 'untried'];

// 검색창의 타이핑을 URL 커밋 전에 모아 둔다 — useListQuery.setQuery(5a가
// 고정한 시그니처, replace 옵션이 없다)는 호출마다 history push를 한다.
// 디바운스 없이 글자마다 그걸 부르면 글자 수만큼 history entry가 쌓여
// 뒤로가기가 한 글자씩만 되돌아간다. 화면(필터링)은 즉시 반응하되 — 아래
// qInput을 쓴다 — URL 커밋만 이 시간만큼 미룬다.
const SEARCH_DEBOUNCE_MS = 300;

/**
 * q(검색어)·level·status·tag 네 필터를 모두 AND로 적용한다. 기본값(빈
 * 문자열 혹은 null)인 필터는 건너뛴다 — 네 필드가 전부 기본값이면 입력을
 * 내용 그대로 돌려준다.
 *
 * `statusOf`를 호출자가 주입한다 — 행을 그릴 때 쓰는
 * `deriveStatus(records[meta.id], hasDraft)`와 **같은 함수**를 넘겨야 한다.
 * 여기서 상태를 다시 유도하면(두 번째 구현) 목록의 마크와 상태 필터 결과가
 * 어긋날 수 있다.
 *
 * `q`는 대소문자를 구분하지 않고(toLowerCase) 앞뒤 공백을 무시한다(trim) —
 * 둘 다 결정이고 테스트로 고정했다. 제목 또는 태그 중 하나라도 검색어를
 * 포함하면(부분 일치) 통과한다.
 */
export function filterProblems(
  metas: ProblemMeta[],
  query: ListQuery,
  statusOf: (meta: ProblemMeta) => ProblemStatus,
): ProblemMeta[] {
  const q = query.q.trim().toLowerCase();
  return metas.filter((meta) => {
    if (query.level !== null && meta.level !== query.level) return false;
    if (query.status !== null && statusOf(meta) !== query.status) return false;
    // tags는 선택 필드다 — 없는 메타는 ?? []로 빈 배열처럼 다뤄 태그 필터에서
    // 조용히 빠진다(터지지 않는다).
    if (query.tag !== null && !(meta.tags ?? []).includes(query.tag)) return false;
    if (q !== '') {
      const inTitle = meta.title.toLowerCase().includes(q);
      const inTags = (meta.tags ?? []).some((tag) => tag.toLowerCase().includes(q));
      if (!inTitle && !inTags) return false;
    }
    return true;
  });
}

/**
 * `sort`(난이도·제목) 기준으로 정렬하고, 1차 키가 같으면 작성자가 지정한
 * `order`(없으면 9999) → `id` 순으로 타이브레이크한다.
 *
 * **`dir`은 1차 키만 뒤집는다 — 타이브레이커는 항상 오름차순을 유지한다.**
 * `order`는 작성자가 의도한 배열 순서라서, 난이도를 내림차순으로 보겠다는
 * 선택이 그 큐레이션 순서까지 뒤집으라는 뜻은 아니라고 봤다(결정,
 * task-5a-brief.md 참조). 비교자 전체를 음수화하는 구현과 실제 데이터에서
 * 결과가 갈린다 — `level desc`는 이 규칙으로 `003, 001, 002`, 전체
 * 음수화라면 `003, 002, 001`이다. `tests/unit/problemList.test.tsx`의
 * "같은 난이도 두 문제는 level desc에서도 order 오름차순을 유지한다"가
 * 이 차이를 고정한다.
 */
export function sortProblems(metas: ProblemMeta[], sort: ListQuery['sort'], dir: ListQuery['dir']): ProblemMeta[] {
  // 로케일을 명시한다 — 지정하지 않으면 Node/Chromium의 "기본 로케일"에
  // 기대게 되는데, small-ICU로 빌드된 CI 러너는 그 기본값조차 환경마다
  // 다를 수 있다. 지금 세 제목은 로케일을 줘도 안 줘도 같은 순서지만(node로
  // 확인), 그 우연에 기대지 않는다.
  const primary = (a: ProblemMeta, b: ProblemMeta): number =>
    sort === 'title' ? a.title.localeCompare(b.title, 'ko') : a.level - b.level;
  const tiebreak = (a: ProblemMeta, b: ProblemMeta): number =>
    (a.order ?? 9999) - (b.order ?? 9999) || a.id.localeCompare(b.id);
  return [...metas].sort((a, b) => {
    const p = primary(a, b);
    return (dir === 'desc' ? -p : p) || tiebreak(a, b);
  });
}

const SORT_LABEL: Record<ListQuery['sort'], string> = { level: '난이도', title: '제목' };

/**
 * 제목·난이도 열 머리. 눌러서 그 열로 정렬을 바꾸고, 같은 열을 다시 누르면
 * 방향이 뒤집힌다. 상태 표시는 aria-sort 대신 접근 가능한 이름으로 한다 —
 * 아래 ProblemListPage의 주석 참조. 화살표는 장식(aria-hidden)이다.
 *
 * 이름은 `aria-label`로 직접 준다 — 처음엔 보이는 글자 + sr-only 글자
 * 조각으로 나눠 "텍스트에서 이름을 계산"하게 뒀는데, 실제 Chromium에서
 * 접근 가능한 이름을 찍어 보니(리뷰 Important 2 대응 중 발견) 서로 다른
 * 자식 노드의 텍스트를 이어붙일 때 **공백을 끼워 넣어**(ARIA accname 계산의
 * 일부) `"제목 , 오름차순 정렬 중"`처럼 쉼표 앞에 뜬금없는 공백이 생겼다.
 * jsdom의 `textContent`는 그 공백을 넣지 않아 유닛 테스트에서는 안 보이고
 * 실제 브라우저에서만 드러나는 차이였다. `aria-label`은 그 결합 규칙을
 * 아예 타지 않아 환경에 상관없이 같은 문자열이 보장된다. 보이는 글자
 * "제목"으로 시작하므로 Label-in-Name(2.5.3)도 지킨다.
 */
function SortHeaderButton({
  col,
  query,
  onSort,
}: {
  col: ListQuery['sort'];
  query: ListQuery;
  onSort: (col: ListQuery['sort']) => void;
}) {
  const active = query.sort === col;
  const label = active
    ? `${SORT_LABEL[col]}, ${query.dir === 'asc' ? '오름차순' : '내림차순'} 정렬 중`
    : SORT_LABEL[col];
  return (
    <button
      type="button"
      className={styles.sortBtn}
      aria-pressed={active}
      aria-label={label}
      onClick={() => onSort(col)}
    >
      {SORT_LABEL[col]}
      {active ? <span aria-hidden="true" className={styles.sortArrow} data-dir={query.dir} /> : null}
    </button>
  );
}

export function ProblemListPage() {
  const metas = useLoaderData() as ProblemMeta[];
  const records = useSubmitStore((s) => s.records);
  const drafts = useDraftStore((s) => s.drafts);
  // 필터·정렬의 유일한 출처는 URL 쿼리다 — 컴포넌트에 따로 상태를 두지 않는다.
  const [query, setQuery] = useListQuery();

  // 검색창만 예외다(바로 아래 두 useEffect). 나머지 세 필터(level·status·tag)
  // 는 select의 discrete한 change 한 번이 곧 커밋이라 5a의 정렬 버튼과 같은
  // 패턴을 그대로 쓴다 — 로컬 상태가 없다.
  const [qInput, setQInput] = useState(query.q);

  // 초기화 버튼이나 뒤로가기·직접 진입처럼 URL이 "밖에서" 바뀌면 입력창도
  // 맞춘다. 디바운스 커밋 직후에도 이 효과가 돌지만 qInput이 이미 같은
  // 값이라 setQInput은 no-op이다.
  useEffect(() => {
    setQInput(query.q);
  }, [query.q]);

  // 타이핑을 디바운스해 커밋한다. useListQuery.setQuery는 호출마다
  // history push를 한다(useListQuery.ts는 5b의 수정 대상이 아니라 replace
  // 옵션을 추가할 수 없다) — 디바운스 없이 글자마다 그걸 부르면 글자
  // 수만큼 history entry가 쌓여 뒤로가기가 한 글자씩만 되돌아간다.
  //
  // query.q·setQuery를 의존성에 넣는 것이 장식이 아니다 — 타이핑 중간에
  // 난이도·상태·태그 select를 바꾸면(둘 다 같은 query 객체를 머지하는
  // setQuery를 쓴다) setQuery의 참조가 바뀐다. 의존성에서 빠지면 이
  // effect가 그 변화를 못 보고 오래된 클로저로 커밋해, select로 바꾼
  // 값을 되돌려 버린다. 이 재스케줄 덕에 타이머가 항상 최신 query를 문다.
  useEffect(() => {
    if (qInput === query.q) return;
    const timer = setTimeout(() => setQuery({ q: qInput }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [qInput, query.q, setQuery]);

  // 행을 그릴 때 쓰는 유도와 상태 필터가 반드시 같은 함수를 쓴다 — 아래
  // .map()도 이 참조를 그대로 쓴다(두 번째 구현을 만들지 않는다).
  const statusOf = (meta: ProblemMeta): ProblemStatus =>
    deriveStatus(records[meta.id], typeof drafts[meta.id] === 'string');

  // 검색은 로컬 입력을 즉시 쓰고(디바운스는 URL 커밋만 미룬다 — 화면은
  // 미루지 않는다), 나머지 세 필터는 커밋된 query를 쓴다.
  const effectiveQuery: ListQuery = { ...query, q: qInput };
  const filtered = filterProblems(metas, effectiveQuery, statusOf);
  const visible = sortProblems(filtered, query.sort, query.dir);
  // 분모도 분자도 현재 문제 목록 "전체" 기준이다 — 필터와 무관하다(스펙
  // 226행). id를 바꾼 옛 기록이 남아 있어도 분자를 부풀리지 않는다.
  const solved = countSolved(metas, records);

  const hasFilter =
    effectiveQuery.q !== '' ||
    effectiveQuery.level !== null ||
    effectiveQuery.status !== null ||
    effectiveQuery.tag !== null;
  // 필터가 없거나, 있어도 결과가 있으면 비워 둔다(OutputPanel.tsx의 live
  // region과 같은 패턴 — 항상 떠 있되 알릴 내용이 있을 때만 채운다). 0건일
  // 때만 눈으로 보이는 .empty 블록(아래)과 같은 글자를 그대로 읽어 준다.
  // 전에는 0건이 아닐 때도 "N건 표시 중"을 읽어 줬는데, 그 분기는 (a)
  // 브리프가 요청하지 않았고 (b) 아무 테스트도 지키지 않았고(문자열을
  // 'XXXX'로 바꿔도 유닛·e2e 둘 다 green이었다) (c) 키 입력마다 polite
  // region이 발화해 타이핑 내내 안내가 울리는 역효과가 있었다(리뷰
  // Minor 5) — 지웠다. "필터가 없을 때도 안내가 비어 있는가"는
  // task-5b-report.md에 결정으로 남긴다.
  const filterStatusText = hasFilter && visible.length === 0 ? '조건에 맞는 문제가 없습니다' : '';

  // 태그·난이도 옵션은 지금의 metas에서 모은다(하드코딩 금지) — 문제가
  // 늘거나 줄어도 select가 따라간다. status는 ProblemStatus가 고정된 네
  // 값이라 위 STATUS_FILTER_OPTIONS에서 가져온다.
  const levels = Array.from(new Set(metas.map((m) => m.level))).sort((a, b) => a - b);
  const tags: string[] = [];
  for (const m of metas) {
    for (const t of m.tags ?? []) {
      if (!tags.includes(t)) tags.push(t);
    }
  }

  // "필터 초기화" — q·level·status·tag만 기본값으로 되돌린다. sort·dir은
  // 5b의 범위가 아니라 손대지 않는다(사용자가 고른 정렬은 필터 초기화와
  // 무관하게 남는다). qInput은 직접 비워 디바운스를 기다리지 않고 입력창이
  // 바로 반영되게 한다.
  const resetFilters = () => {
    setQInput('');
    setQuery({ q: '', level: null, status: null, tag: null });
  };

  // 같은 열을 다시 누르면 방향만 뒤집고, 다른 열을 누르면 그 열의 오름차순
  // 으로 리셋한다.
  const onSort = (col: ListQuery['sort']) => {
    const nextDir: ListQuery['dir'] = query.sort === col && query.dir === 'asc' ? 'desc' : 'asc';
    setQuery({ sort: col, dir: nextDir });
  };

  // 행이 <Link>라 Enter는 그냥 동작한다. 화살표만 여기서 가로채 다음·이전
  // 링크로 포커스를 옮긴다. 포커스 링은 전역 :focus-visible이 맡는다.
  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const links = Array.from(e.currentTarget.querySelectorAll('a'));
    const at = links.findIndex((el) => el === document.activeElement);
    if (at < 0) return;
    const next = links[at + (e.key === 'ArrowDown' ? 1 : -1)];
    if (!next) return;
    // 실제로 옮길 때만 기본 스크롤을 막는다. 끝 행에서는 목록이 평소처럼 스크롤된다.
    e.preventDefault();
    next.focus();
  };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.topbar}>
          <span className={styles.brandName}>코딩테스트 연습장</span>
          <span className={styles.brandLang}>JavaScript</span>
          <p className={styles.progress}>
            {`${metas.length}문제 중 ${solved}개 통과`}
            <progress className={styles.bar} value={solved} max={Math.max(metas.length, 1)} aria-hidden="true" />
          </p>
        </header>

        <div className={styles.filters}>
          <label className={styles.search}>
            {/* sr-only 글자가 보이는 placeholder와 같아야 한다 — 전에는
                "문제 검색"이라 써서, 눈으로 보이는 글자("제목·태그 검색")가
                접근 가능한 이름에 전혀 나타나지 않았다(Label-in-Name,
                SC 2.5.3 위반). SortHeaderButton의 주석이 적어 둔 대로 이
                저장소는 2.5.3을 의도적으로 지킨다 — 같은 글자로 맞춘다. */}
            <span className="sr-only">제목·태그 검색</span>
            <input
              type="search"
              placeholder="제목·태그 검색"
              value={qInput}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setQInput(e.target.value)}
            />
          </label>
          <label className={styles.select}>
            <span className="sr-only">난이도 필터</span>
            {/* URL이 levels(현 metas에서 모은 값)에 없는 레벨을 가리키면(예:
                ?level=9 — 공유 링크나 손으로 바꾼 주소로만 닿는다) 일치하는
                option이 없어 네이티브 select가 value=""로 떨어져 "전체
                난이도"를 보여준다. 목록은 0건이고 안내는 "맞는 문제가
                없다"는데 컨트롤은 "필터 없음"이라고 말하는 모순이다(리뷰
                Important 1). 활성값 전용 option을 하나 더 그려 select가
                항상 URL과 일치하게 한다 — parse 계층(useListQuery.ts)에서는
                못 고친다, level의 유효값은 "지금의 문제 데이터"에 달려
                있고 그 훅은 데이터를 보지 못한다. */}
            <select
              value={query.level ?? ''}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setQuery({ level: e.target.value === '' ? null : Number(e.target.value) })
              }
            >
              <option value="">전체 난이도</option>
              {levels.map((lv) => (
                <option value={lv} key={lv}>
                  Lv.{lv}
                </option>
              ))}
              {query.level !== null && !levels.includes(query.level) ? (
                <option value={query.level}>Lv.{query.level} (해당 문제 없음)</option>
              ) : null}
            </select>
          </label>
          <label className={styles.select}>
            <span className="sr-only">상태 필터</span>
            <select
              value={query.status ?? ''}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setQuery({ status: e.target.value === '' ? null : (e.target.value as ProblemStatus) })
              }
            >
              <option value="">전체 상태</option>
              {STATUS_FILTER_OPTIONS.map((s) => (
                <option value={s} key={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.select}>
            <span className="sr-only">태그 필터</span>
            {/* level과 같은 함정, 같은 해법(리뷰 Important 1) — tags에 없는
                값(예: ?tag=zzz)을 활성값 전용 option으로 하나 더 그려
                select가 항상 URL과 일치하게 한다.
                핸들러는 level·status와 같이 ''를 직접 null로 접어 넘긴다
                (리뷰 Minor 11). 예전에는 ''를 그대로 넘기고 toSearchParams→
                parseListQuery의 왕복(useListQuery.ts, task-5a 수정)에 접기를
                맡겼는데 — 동작은 같지만, 핸들러만 읽는 사람은
                query.tag === ''가 가능하다고 오해하기 쉽고 바로 아래
                hasFilter도 그 값을 활성 필터로 셀 여지가 있었다. */}
            <select
              value={query.tag ?? ''}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setQuery({ tag: e.target.value === '' ? null : e.target.value })
              }
            >
              <option value="">전체 태그</option>
              {tags.map((t) => (
                <option value={t} key={t}>
                  {t}
                </option>
              ))}
              {query.tag !== null && !tags.includes(query.tag) ? (
                <option value={query.tag}>{query.tag} (해당 문제 없음)</option>
              ) : null}
            </select>
          </label>
        </div>

        <div className={styles.scroller}>
          {/* 표로 보이되 행 전체가 링크여야 해서 <table>을 쓸 수 없고, 열 이름이
              행과 프로그램적으로 묶이지도 않는다(요소 전체에 aria-hidden을
              얹어 눈으로만 읽게 Task 4가 피해 갔던 자리). 제목·난이도가
              정렬 버튼이 되면서 그 전제가 깨진다 — 포커스되는 버튼이
              aria-hidden 안에 있으면 스크린리더에서는 사라지는데 탭으로는
              닿는 상태가 되어 axe 위반이자 실제 버그다. 그래서 컨테이너의
              aria-hidden은 걷어내고, 여전히 비대화형인 상태·태그 칸만 각자
              aria-hidden으로 숨긴다(행마다 상태는 sr-only 글자로, 태그는
              칩 자체로 이미 다시 드러난다). 정렬 상태는 <table>의 aria-sort
              대신 버튼의 접근 가능한 이름으로 알린다 — columnheader/row
              역할을 직접 달려면 행 전체(<Link>)까지 그 역할 트리에 맞게
              다시 짜야 하는데, 그러면 지금처럼 행 전체를 탭 한 번에 포커스·
              Enter로 여는 링크가 아니라 그리드 셀 내비게이션을 기대하게 돼
              실제 동작과 어긋난다. */}
          <div className={styles.head}>
            <span aria-hidden="true" />
            <SortHeaderButton col="title" query={query} onSort={onSort} />
            <SortHeaderButton col="level" query={query} onSort={onSort} />
            <span aria-hidden="true">태그</span>
          </div>
          {/* 정렬이 바뀌면 목록 순서가 조용히 바뀐다 — 포커스가 머문 버튼의
              이름이 달라지는 것 말고는 비시각 사용자에게 아무 신호가 없다.
              OutputPanel.tsx:43의 채점 완료 live region과 같은 패턴: 항상
              떠 있는 상태로 두고 내용이 바뀔 때만 읽히게 한다. */}
          <p className="sr-only" role="status" aria-live="polite" data-live="sort-status">
            {`${SORT_LABEL[query.sort]} 기준 ${query.dir === 'asc' ? '오름차순' : '내림차순'}으로 정렬 중`}
          </p>
          {/* 정렬 live region과 별개로 둔다 — 하나로 합치면 5a가 고정한 그
              region의 문구를 바꾸게 되는데, 정렬과 필터는 독립적으로 바뀌는
              서로 다른 상태라 따로 알리는 쪽이 더 간단하고, 5a의 리뷰를
              지난 그 테스트들을 건드리지 않는다. 필터가 없으면 비워 둔다. */}
          <p className="sr-only" role="status" aria-live="polite" data-live="filter-count">
            {filterStatusText}
          </p>
          {visible.length === 0 ? (
            <div className={styles.empty}>
              {/* 0건에는 서로 다른 두 원인이 있다 — 필터가 걸러냈거나, 로더가
                  처음부터 빈 목록을 돌려줬거나(리뷰 Minor 6). 필터가 없는데도
                  이 블록이 보인다면 후자다. 안내 문구를 원인에 맞게 나누고,
                  "필터 초기화" 버튼은 되돌릴 필터가 있을 때만 보인다 —
                  전에는 항상 떠 있어서 문제가 아예 없는 목록에서도 눌러도
                  아무 일 하지 않는 버튼이 보였다. */}
              <p>{hasFilter ? '조건에 맞는 문제가 없습니다' : '아직 등록된 문제가 없습니다'}</p>
              {hasFilter ? (
                <button type="button" className={styles.resetBtn} onClick={resetFilters}>
                  필터 초기화
                </button>
              ) : null}
            </div>
          ) : (
            <ul className={styles.rows} onKeyDown={onKeyDown}>
              {visible.map((meta) => {
                const status = statusOf(meta);
                return (
                  <li key={meta.id}>
                    <Link className={styles.row} to={`/problems/${meta.id}`} data-status={status}>
                      <span className={styles.cellMark}>
                        <Mark kind={MARK[status]} />
                        <span className="sr-only">{STATUS_LABEL[status]}</span>
                      </span>
                      <span className={styles.cellTitle}>{meta.title}</span>
                      <span className={styles.cellLevel}>Lv.{meta.level}</span>
                      <span className={styles.cellTags}>
                        {(meta.tags ?? []).map((tag) => (
                          <span className={styles.tag} key={tag}>
                            {tag}
                          </span>
                        ))}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
