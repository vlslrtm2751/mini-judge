import { describe, expect, it } from 'vitest';
import { parseListQuery, toSearchParams, type ListQuery } from '@/features/problems/useListQuery';

const DEFAULTS: ListQuery = { q: '', level: null, status: null, tag: null, sort: 'level', dir: 'asc' };

describe('parseListQuery', () => {
  it('빈 검색이면 기본값이다', () => {
    expect(parseListQuery(new URLSearchParams(''))).toEqual(DEFAULTS);
  });

  // 알 수 없는/잘못된 값뿐 아니라 "유효한" 값도 실제로 통과하는지 함께
  // 본다 — status를 항상 null로 떨어뜨리는 구현도 '?status=bogus → null'
  // 단언 하나만으로는 잡히지 않는다.
  it('유효한 값은 모두 그대로 통과한다', () => {
    const search = new URLSearchParams('q=검색어&level=1&status=wip&tag=배열&sort=title&dir=desc');
    expect(parseListQuery(search)).toEqual({
      q: '검색어',
      level: 1,
      status: 'wip',
      tag: '배열',
      sort: 'title',
      dir: 'desc',
    });
  });

  it('level이 숫자가 아니면 null로 떨어진다', () => {
    expect(parseListQuery(new URLSearchParams('level=abc')).level).toBeNull();
  });

  // level:0은 실제로 존재하는 난이도다(falsy이지만 유효하다). 0을 "없음"과
  // 혼동하는 구현(예: `Number(raw) || null`)이 있는지 따로 확인한다.
  it('level=0은 유효한 값으로 통과한다', () => {
    expect(parseListQuery(new URLSearchParams('level=0')).level).toBe(0);
  });

  it('sort가 level·title이 아니면 기본값 level로 떨어진다', () => {
    expect(parseListQuery(new URLSearchParams('sort=nope')).sort).toBe('level');
  });

  it('dir이 asc·desc가 아니면 기본값 asc로 떨어진다', () => {
    expect(parseListQuery(new URLSearchParams('dir=sideways')).dir).toBe('asc');
  });

  it('status가 네 상태 중 하나가 아니면 null로 떨어진다', () => {
    expect(parseListQuery(new URLSearchParams('status=bogus')).status).toBeNull();
  });

  it('알 수 없는 값이 여럿이어도 각자 독립적으로 기본값으로 떨어진다(한꺼번에 던지지 않는다)', () => {
    const q = parseListQuery(new URLSearchParams('level=abc&sort=nope&dir=sideways&status=bogus'));
    expect(q).toEqual(DEFAULTS);
  });
});

describe('toSearchParams', () => {
  it('기본값만 있으면 빈 문자열이다', () => {
    expect(toSearchParams(DEFAULTS).toString()).toBe('');
  });

  // level 0은 falsy지만 "필터가 걸려 있다"는 뜻이다. `!== null`이 아니라
  // truthy 검사로 기본값 여부를 가르는 구현은 0을 기본값(null)과 같이 취급해
  // URL에서 빼먹는다.
  it('level=0은 기본값이 아니므로 URL에 남는다', () => {
    const params = toSearchParams({ ...DEFAULTS, level: 0 });
    expect(params.get('level')).toBe('0');
  });

  it('기본값과 다른 필드만 URL에 남는다', () => {
    const params = toSearchParams({ ...DEFAULTS, sort: 'title' });
    expect(params.toString()).toBe('sort=title');
  });

  it('왕복: parseListQuery(toSearchParams(q))는 q와 같다', () => {
    const q: ListQuery = { q: '문자열', level: 1, status: 'failed', tag: '정렬', sort: 'title', dir: 'desc' };
    expect(parseListQuery(toSearchParams(q))).toEqual(q);
  });

  it('왕복: 기본값도 그대로 돌아온다', () => {
    expect(parseListQuery(toSearchParams(DEFAULTS))).toEqual(DEFAULTS);
  });
});
