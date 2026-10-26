import { useRunStore } from '@/stores/runStore';
import { useUiStore } from '@/stores/uiStore';
import { ResultsView } from './ResultsView';
import { TerminalView } from './TerminalView';

export function OutputPanel() {
  const tab = useUiStore((s) => s.outputTab);
  const setTab = useUiStore((s) => s.setOutputTab);
  const clear = useRunStore((s) => s.clearTerminal);
  const report = useRunStore((s) => s.report);

  return (
    <section style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', gap: 8, padding: 8, borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => setTab('results')}>결과</button>
        <button onClick={() => setTab('terminal')}>터미널</button>
        <span style={{ marginLeft: 'auto' }}>{report ? `${report.passed}/${report.total}` : ''}</span>
        <button onClick={clear}>지우기</button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>{tab === 'results' ? <ResultsView /> : <TerminalView />}</div>
    </section>
  );
}
