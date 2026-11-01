import { useEffect, useRef } from 'react';

interface Handlers {
  runTest(): void;
  submit(): void;
  stop(): void;
  toggleComment(): void;
}

export function useShortcuts(handlers: Handlers) {
  // 호출부는 매 렌더마다 새 객체를 넘긴다. 이걸 의존성에 두면 타이핑 한 글자마다
  // keydown 리스너를 떼었다 다시 단다. 최신 핸들러는 ref로 갈아끼우고 구독은
  // 한 번만 한다.
  const latest = useRef(handlers);
  useEffect(() => {
    latest.current = handlers;
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const cmd = event.ctrlKey || event.metaKey;
      const h = latest.current;
      if (cmd && event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        h.runTest();
      } else if (cmd && event.key === 'Enter' && event.shiftKey) {
        event.preventDefault();
        h.submit();
      } else if (cmd && event.key === '/') {
        event.preventDefault();
        h.toggleComment();
      } else if (event.key === 'Escape') {
        // Escape는 CodeMirror의 탭 캡처를 빠져나오는 키이기도 하다. 에디터 안에서
        // 누른 것까지 중지로 받으면 키보드로 에디터를 벗어나려다 채점이 취소된다.
        const target = event.target as Element | null;
        if (target?.closest?.('.cm-editor')) return;
        h.stop();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
