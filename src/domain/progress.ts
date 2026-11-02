import type { ProblemId, ProblemMeta } from '@/domain/types';
import type { SubmitRecord } from '@/stores/submitStore';

export type ProblemStatus = 'solved' | 'failed' | 'wip' | 'untried';

// 유도 우선순위: 통과한 적 있음 -> 제출한 적 있음 -> draft 있음 -> 미시도.
// solvedAt은 한 번 생기면 지워지지 않으므로, 그 존재만으로 '통과한 적 있음'을 안다.
export function deriveStatus(
  record: SubmitRecord | undefined,
  hasDraft: boolean,
): ProblemStatus {
  // localStorage가 손상되면 레코드가 문자열 등 다른 모양으로 들어올 수 있다.
  // 그런 값은 던지지 않고 '기록 없음'과 같이 취급한다.
  if (record == null || typeof record !== 'object') {
    return hasDraft ? 'wip' : 'untried';
  }
  return record.solvedAt !== undefined ? 'solved' : 'failed';
}

export function countSolved(
  metas: ProblemMeta[],
  records: Record<ProblemId, SubmitRecord>,
): number {
  return metas.filter(
    (meta) => deriveStatus(records[meta.id], false) === 'solved',
  ).length;
}
