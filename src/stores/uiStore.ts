import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  outputTab: 'results' | 'terminal';
  mobileView: 'problem' | 'code' | 'result';
  theme: 'system' | 'light' | 'dark';
  setOutputTab(tab: 'results' | 'terminal'): void;
  setMobileView(view: 'problem' | 'code' | 'result'): void;
  setTheme(theme: 'system' | 'light' | 'dark'): void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      outputTab: 'results',
      mobileView: 'code',
      theme: 'system',
      setOutputTab: (outputTab) => set({ outputTab }),
      setMobileView: (mobileView) => set({ mobileView }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'js-ide:ui',
      partialize: (state) => ({ theme: state.theme }),
    },
  ),
);
