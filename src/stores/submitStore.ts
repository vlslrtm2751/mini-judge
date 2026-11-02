import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProblemId } from '@/domain/types';

export interface SubmitRecord {
  passed: number;
  total: number;
  at: number;
  solvedAt?: number;
}

interface SubmitState {
  records: Record<ProblemId, SubmitRecord>;
  record(id: ProblemId, passed: number, total: number): void;
}

export const useSubmitStore = create<SubmitState>()(
  persist(
    (set) => ({
      records: {},
      record(id, passed, total) {
        set((state) => {
          const prev = state.records[id];
          const now = Date.now();
          // 한 번 통과(solvedAt)하면 이후 실패해도 유지한다. 없을 때만 새로 채운다.
          const solvedAt =
            prev?.solvedAt ?? (passed === total && total > 0 ? now : undefined);
          const next: SubmitRecord =
            solvedAt === undefined
              ? { passed, total, at: now }
              : { passed, total, at: now, solvedAt };
          return { records: { ...state.records, [id]: next } };
        });
      },
    }),
    { name: 'js-ide:submits' },
  ),
);
