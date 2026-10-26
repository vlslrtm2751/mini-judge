import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProblemId } from '@/domain/types';

interface DraftState {
  drafts: Record<ProblemId, string>;
  setDraft(id: ProblemId, code: string, starter: string): void;
  reset(id: ProblemId): void;
}

export const useDraftStore = create<DraftState>()(
  persist(
    (set) => ({
      drafts: {},
      setDraft(id, code, starter) {
        set((state) => {
          const next = { ...state.drafts };
          if (code === starter) delete next[id];
          else next[id] = code;
          return { drafts: next };
        });
      },
      reset(id) {
        set((state) => {
          const next = { ...state.drafts };
          delete next[id];
          return { drafts: next };
        });
      },
    }),
    { name: 'js-ide:drafts' },
  ),
);
