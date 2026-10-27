import { useUiStore } from '@/stores/uiStore';
import styles from './chrome.module.css';

const TABS = [
  { view: 'problem', label: '문제' },
  { view: 'code', label: '코드' },
  { view: 'result', label: '결과' },
] as const;

export function MobileTabs() {
  const tab = useUiStore((s) => s.mobileView);
  const setTab = useUiStore((s) => s.setMobileView);

  return (
    <nav className={styles.mobileTabs} aria-label="화면 전환">
      {TABS.map(({ view, label }) => (
        <button key={view} type="button" aria-pressed={tab === view} onClick={() => setTab(view)}>
          {label}
        </button>
      ))}
    </nav>
  );
}
