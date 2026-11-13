import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ProblemStatus } from '@/domain/progress';

export interface ListQuery {
  q: string;
  level: number | null;
  status: ProblemStatus | null;
  tag: string | null;
  sort: 'level' | 'title';
  dir: 'asc' | 'desc';
}

// toSearchParams가 이 값과 같은 필드를 URL에서 뺀다 — 공유 링크와 새로고침이
// 짧고 읽기 좋게 유지된다. parseListQuery도 같은 객체를 기준점으로 쓴다.
const DEFAULT_QUERY: ListQuery = { q: '', level: null, status: null, tag: null, sort: 'level', dir: 'asc' };

const STATUSES: readonly ProblemStatus[] = ['solved', 'failed', 'wip', 'untried'];

function parseLevel(raw: string | null): number | null {
  // Number('')는 0이라 빈 문자열이 레벨 0으로 둔갑한다 — 먼저 걸러낸다.
  if (raw == null || raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function parseStatus(raw: string | null): ProblemStatus | null {
  return raw != null && (STATUSES as readonly string[]).includes(raw) ? (raw as ProblemStatus) : null;
}

function parseSort(raw: string | null): ListQuery['sort'] {
  return raw === 'title' ? 'title' : DEFAULT_QUERY.sort;
}

function parseDir(raw: string | null): ListQuery['dir'] {
  return raw === 'desc' ? 'desc' : DEFAULT_QUERY.dir;
}

/**
 * URL 쿼리를 읽는다. 알 수 없거나 잘못된 값은 조용히 기본값으로 떨어진다 —
 * 던지지도, 목록을 비우지도 않는다. 5a는 이 중 sort·dir만 UI에 연결한다.
 * q·level·status·tag는 5b가 검색·필터 컨트롤을 얹을 때 쓴다.
 */
export function parseListQuery(search: URLSearchParams): ListQuery {
  return {
    q: search.get('q') ?? DEFAULT_QUERY.q,
    level: parseLevel(search.get('level')),
    status: parseStatus(search.get('status')),
    // q와 달리 ''를 그대로 두지 않는다 — tag는 "이 태그로 거른다"는 뜻이라
    // 빈 문자열에 의미가 없다(q는 "검색어 없음"이 그대로 ''다). 5b가 value=''를
    // "필터 없음"으로 쓰는 <select>를 달면 그 값이 그대로 여기로 들어온다.
    tag: search.get('tag') || null,
    sort: parseSort(search.get('sort')),
    dir: parseDir(search.get('dir')),
  };
}

/** 기본값과 같은 필드는 뺀다. level:0처럼 falsy지만 유효한 값은 null과
 *  엄격히 구분해야 하므로 각 필드를 명시적으로 기본값과 비교한다.
 *
 *  여섯 필드로만 새로 만든다 — URL에 `?utm=x`처럼 이 훅이 모르는 값이
 *  있었다면 왕복(parse→여기) 뒤에는 사라진다. 의도된 동작이고 지금 그
 *  무엇도 그 값에 기대지 않지만, 나중에 놀라지 않도록 적어 둔다. */
export function toSearchParams(query: ListQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.q !== DEFAULT_QUERY.q) params.set('q', query.q);
  // null과 직접 비교해야 TS가 string | null을 string으로 좁힌다 — 기본값
  // 상수와 비교하면 그 필드의 선언 타입(ProblemStatus | null 등) 그대로라
  // 좁혀지지 않는다.
  if (query.level !== null) params.set('level', String(query.level));
  if (query.status !== null) params.set('status', query.status);
  // tag는 level과 달리 유효한 falsy 값이 없다(빈 문자열은 "태그 없음"과
  // 같은 뜻이다) — truthy 검사로 충분하고, 누군가 tag:''를 직접 넘겨도
  // 안전하게 생략된다.
  if (query.tag) params.set('tag', query.tag);
  if (query.sort !== DEFAULT_QUERY.sort) params.set('sort', query.sort);
  if (query.dir !== DEFAULT_QUERY.dir) params.set('dir', query.dir);
  return params;
}

/**
 * 필터·정렬의 유일한 출처인 URL 쿼리를 읽고 쓴다. 컴포넌트는 이 훅이
 * 돌려주는 값 말고 따로 상태를 두지 않는다.
 *
 * 해시 라우터에서도 그대로 동작한다 — `createHashRouter`는 `#/` 뒤를
 * `window.location.hash`에서 파싱해 일반 `pathname`/`search`로 바꿔 두므로
 * `useSearchParams`가 `#/?sort=title`의 `sort=title`을 다른 라우터와 똑같이
 * 읽는다(jsdom에서 실제 `createHashRouter`로 직접 확인했다).
 */
export function useListQuery(): [ListQuery, (next: Partial<ListQuery>) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useMemo(() => parseListQuery(searchParams), [searchParams]);
  const setQuery = useCallback(
    (next: Partial<ListQuery>) => {
      setSearchParams(toSearchParams({ ...query, ...next }));
    },
    [query, setSearchParams],
  );
  return [query, setQuery];
}
