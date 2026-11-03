import { useLoaderData } from 'react-router-dom';
import type { Problem } from '@/domain/types';
import { useIsPhone } from '@/hooks/useIsPhone';
import { useShortcuts } from '@/hooks/useShortcuts';
import { useRun } from '@/hooks/useRun';
import { ProblemPanel } from '@/features/problem/ProblemPanel';
import { EditorPanel } from '@/features/editor/EditorPanel';
import { OutputPanel } from '@/features/output/OutputPanel';
import { ActionBar } from './ActionBar';
import { MobileTabs } from './MobileTabs';
import { ProblemPicker } from './ProblemPicker';
import { useDraftStore } from '@/stores/draftStore';
import { useEffect, useRef, useState } from 'react';
import styles from './workspace.module.css';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { useRunStore } from '@/stores/runStore';
import { useUiStore } from '@/stores/uiStore';

interface LoaderData {
  problem: Problem;
}

export function IdePage() {
  const { problem } = useLoaderData() as LoaderData;
  const isPhone = useIsPhone();
  const runState = useRunStore();
  const mobileView = useUiStore((s) => s.mobileView);
  const initialCode = useDraftStore((s) => s.drafts[problem.meta.id] ?? problem.starter);
  const setDraft = useDraftStore((s) => s.setDraft);
  const resetDraft = useDraftStore((s) => s.reset);
  const [code, setCode] = useState(initialCode);
  const [loadedProblemId, setLoadedProblemId] = useState(problem.meta.id);
  const resetRunFor = useRunStore((s) => s.resetFor);
  const toggleCommentRef = useRef<() => void>(() => undefined);
  const { runTest, submit, stop } = useRun(problem);

  // react-router reuses this component across /problems/:id changes, so
  // per-problem state has to be rebuilt explicitly rather than on mount.
  if (loadedProblemId !== problem.meta.id) {
    setLoadedProblemId(problem.meta.id);
    setCode(initialCode);
  }

  useEffect(() => {
    resetRunFor(problem.meta.id);
  }, [problem.meta.id, resetRunFor]);

  const onRunTest = () => {
    setDraft(problem.meta.id, code, problem.starter);
    void runTest(code);
  };
  const onSubmit = () => {
    setDraft(problem.meta.id, code, problem.starter);
    void submit(code);
  };

  useShortcuts({
    runTest: onRunTest,
    submit: onSubmit,
    stop,
    toggleComment: () => toggleCommentRef.current?.(),
  });

  const content = (
    <>
      {/* 문제를 고르는 일은 이제 목록 화면이 한다. Task 6에서 이 선택기가
          "← 목록" 링크로 바뀌면서 list prop 자체가 사라진다. */}
      <ProblemPicker list={[]} selected={problem.meta.id} disabled={runState.phase === 'running'} />
      {isPhone ? (
        <div className={styles.mobileStack}>
          <MobileTabs />
          <section className={`${styles.mobilePanel} ${styles.pane}`}>
            {mobileView === 'problem' ? <ProblemPanel problem={problem} /> : null}
            {mobileView === 'code' ? (
              <EditorPanel
                code={code}
                onCode={setCode}
                onToggleComment={(fn) => {
                  toggleCommentRef.current = fn;
                }}
              />
            ) : null}
            {mobileView === 'result' ? <OutputPanel /> : null}
          </section>
        </div>
      ) : (
        <Group orientation="horizontal" id="layout-main" className={styles.layoutMain}>
          <Panel className={styles.pane} defaultSize="42" minSize="25" maxSize="65">
            <ProblemPanel problem={problem} />
          </Panel>
          <Separator className={styles.separatorV} />
          <Panel>
            <Group orientation="vertical" id="layout-right" className={styles.layoutRight}>
              <Panel className={styles.pane} defaultSize="60">
                <EditorPanel
                  code={code}
                  onCode={setCode}
                  onToggleComment={(fn) => {
                    toggleCommentRef.current = fn;
                  }}
                />
              </Panel>
              <Separator className={styles.separatorH} />
              <Panel className={styles.pane} defaultSize="40">
                <OutputPanel />
              </Panel>
            </Group>
          </Panel>
        </Group>
      )}
      <ActionBar
        onRunTest={onRunTest}
        onSubmit={onSubmit}
        onStop={stop}
        onReset={() => {
          resetDraft(problem.meta.id);
          setCode(problem.starter);
        }}
      />
    </>
  );

  return <div key={problem.meta.id} className={styles.page}>{content}</div>;
}
