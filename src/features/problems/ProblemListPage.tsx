import type { KeyboardEvent } from 'react';
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
  const primary = (a: ProblemMeta, b: ProblemMeta): number =>
    sort === 'title' ? a.title.localeCompare(b.title) : a.level - b.level;
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
 * 아래 ProblemListPage의 주석 참조. 화살표는 장식(aria-hidden)이고, 같은
 * 정보를 sr-only 글자가 스크린리더에 전달한다.
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
  return (
    <button type="button" className={styles.sortBtn} aria-pressed={active} onClick={() => onSort(col)}>
      {SORT_LABEL[col]}
      {active ? (
        <>
          <span aria-hidden="true" className={styles.sortArrow} data-dir={query.dir} />
          <span className="sr-only">{query.dir === 'asc' ? ', 오름차순 정렬 중' : ', 내림차순 정렬 중'}</span>
        </>
      ) : null}
    </button>
  );
}

export function ProblemListPage() {
  const metas = useLoaderData() as ProblemMeta[];
  const records = useSubmitStore((s) => s.records);
  const drafts = useDraftStore((s) => s.drafts);
  // 필터·정렬의 유일한 출처는 URL 쿼리다 — 컴포넌트에 따로 상태를 두지 않는다.
  // q·level·status·tag는 5b가 검색·필터 컨트롤을 얹을 때까지는 파싱·직렬화만
  // 되고 여기서는 쓰이지 않는다.
  const [query, setQuery] = useListQuery();

  const sorted = sortProblems(metas, query.sort, query.dir);
  // 분모도 분자도 현재 문제 목록 기준이다 — id를 바꾼 옛 기록이 남아 있어도
  // 분자를 부풀리지 않는다.
  const solved = countSolved(metas, records);

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
          <ul className={styles.rows} onKeyDown={onKeyDown}>
            {sorted.map((meta) => {
              // setDraft는 코드가 스타터와 같으면 항목을 지운다 — 그래서
              // 스타터 그대로 돌린 문제는 draft가 남지 않고 미시도로 남는다.
              const status = deriveStatus(records[meta.id], typeof drafts[meta.id] === 'string');
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
        </div>
      </div>
    </div>
  );
}
