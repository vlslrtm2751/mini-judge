import { beforeEach, describe, expect, it } from 'vitest';
import { deriveStatus } from '@/domain/progress';
import { useDraftStore } from '@/stores/draftStore';

const ID = '001-even-sum';
const STARTER = 'function solution(n) {\n  return 0;\n}\n';

function resetStore(): void {
  localStorage.clear();
  useDraftStore.setState({ drafts: {} });
}

const drafts = () => useDraftStore.getState().drafts;
const setDraft = (code: string) => useDraftStore.getState().setDraft(ID, code, STARTER);

describe('draftStore', () => {
  beforeEach(resetStore);

  it('스타터와 다른 코드는 저장한다', () => {
    setDraft('function solution(n) { return n; }');
    expect(drafts()[ID]).toBe('function solution(n) { return n; }');
  });

  it('코드가 스타터와 같으면 저장하지 않는다', () => {
    setDraft(STARTER);
    expect(ID in drafts()).toBe(false);
  });

  // 고쳤다가 되돌린 경우. 남아 있던 항목을 실제로 지워야 한다 — "쓰지 않는다"와
  // "지운다"는 다르고, 여기서 틀리면 한 번 건드린 문제가 영원히 진행 중으로 남는다.
  it('고쳤다가 스타터로 되돌리면 남아 있던 draft를 지운다', () => {
    setDraft('function solution(n) { return n; }');
    expect(ID in drafts()).toBe(true);

    setDraft(STARTER);
    expect(ID in drafts()).toBe(false);
  });

  it('reset은 해당 문제의 draft만 지운다', () => {
    useDraftStore.getState().setDraft('a', 'code-a', 'starter-a');
    useDraftStore.getState().setDraft('b', 'code-b', 'starter-b');

    useDraftStore.getState().reset('a');
    expect('a' in drafts()).toBe(false);
    expect(drafts().b).toBe('code-b');
  });

  // 스펙이 테스트로 요구한 항목("스타터 그대로 돌린 것이 미시도로 남는지")의
  // 본체다. 목록의 상태는 draft의 **존재 여부**로만 유도되므로, 스타터를
  // 건드리지 않고 `테스트 실행`을 눌렀을 때 항목이 남지 않는다는 것이
  // 곧 "미시도로 남는다"는 뜻이다. 두 조각을 한 자리에서 잇는다.
  it('스타터 그대로 테스트를 돌린 문제는 미시도로 남는다', () => {
    setDraft(STARTER);

    const hasDraft = typeof drafts()[ID] === 'string';
    expect(hasDraft).toBe(false);
    expect(deriveStatus(undefined, hasDraft)).toBe('untried');
  });

  // 대비: 한 글자라도 고쳤으면 진행 중이다. 위 테스트가 "항상 untried"를
  // 단언하는 공허한 테스트가 아님을 같은 자리에서 보인다.
  it('한 글자라도 고치고 돌린 문제는 진행 중이 된다', () => {
    setDraft(`${STARTER}// 메모\n`);

    const hasDraft = typeof drafts()[ID] === 'string';
    expect(hasDraft).toBe(true);
    expect(deriveStatus(undefined, hasDraft)).toBe('wip');
  });
});
