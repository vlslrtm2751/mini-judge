import { useUiStore } from '@/stores/uiStore';

export function MobileTabs() {
  const tab = useUiStore((s) => s.mobileView);
  const setTab = useUiStore((s) => s.setMobileView);
  return (
    <nav style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
      <button onClick={() => setTab('problem')} data-active={tab === 'problem'}>
        문제
      </button>
      <button onClick={() => setTab('code')} data-active={tab === 'code'}>
        코드
      </button>
      <button onClick={() => setTab('result')} data-active={tab === 'result'}>
        결과
      </button>
    </nav>
  );
}
