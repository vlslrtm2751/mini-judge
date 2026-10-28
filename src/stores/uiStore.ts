import { create } from 'zustand';

interface UiState {
  outputTab: 'results' | 'terminal';
  mobileView: 'problem' | 'code' | 'result';
  setOutputTab(tab: 'results' | 'terminal'): void;
  setMobileView(view: 'problem' | 'code' | 'result'): void;
}

export const useUiStore = create<UiState>((set) => ({
  outputTab: 'results',
  mobileView: 'code',
  setOutputTab: (outputTab) => set({ outputTab }),
  setMobileView: (mobileView) => set({ mobileView }),
}));
