import type { KeyboardEvent } from 'react';
import { Link, useLoaderData } from 'react-router-dom';
import type { ProblemMeta } from '@/domain/types';
import type { ProblemStatus } from '@/domain/progress';
import { countSolved, deriveStatus } from '@/domain/progress';
import { useSubmitStore } from '@/stores/submitStore';
import { useDraftStore } from '@/stores/draftStore';
import type { MarkKind } from '@/ui/Mark';
import { Mark } from '@/ui/Mark';
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
 * 난이도 오름차순 → 작성자가 지정한 `order`(없으면 9999) → `id`.
 *
 * `localRepository`가 이미 `order`→`id` 순으로 돌려주므로 난이도만 안정
 * 정렬해도 지금은 결과가 같다. 그래도 비교자를 전부 적는다 — 입력 순서에
 * 기대지 않는 순수 함수여야 규칙 자체를 테스트로 확인할 수 있다. 현재 세
 * 문제는 `order` 순과 난이도 순이 완전히 같아서, 화면만 보면 정렬을 아예
 * 빼먹어도 똑같아 보인다.
 */
export function sortByLevel(metas: ProblemMeta[]): ProblemMeta[] {
  return [...metas].sort(
    (a, b) => a.level - b.level || (a.order ?? 9999) - (b.order ?? 9999) || a.id.localeCompare(b.id),
  );
}

export function ProblemListPage() {
  const metas = useLoaderData() as ProblemMeta[];
  const records = useSubmitStore((s) => s.records);
  const drafts = useDraftStore((s) => s.drafts);

  const sorted = sortByLevel(metas);
  // 분모도 분자도 현재 문제 목록 기준이다 — id를 바꾼 옛 기록이 남아 있어도
  // 분자를 부풀리지 않는다.
  const solved = countSolved(metas, records);

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
          {/* 표로 보이되 행 전체가 링크여야 해서 <table>을 쓸 수 없다. 머리줄은
              눈으로 읽는 열 이름일 뿐 행과 프로그램적으로 묶이지 않으므로
              숨기고, 상태는 행마다 글자로 다시 단다. */}
          <div className={styles.head} aria-hidden="true">
            <span />
            <span>제목</span>
            <span>난이도</span>
            <span>태그</span>
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
