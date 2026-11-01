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
        // 에디터 안에서 누른 Escape도 중지로 받는다. CodeMirror의 탭 캡처를
        // 끄는 키와 겹치지만, 무한 루프를 돌려놓고 멈추려는 사람은 대개 에디터에
        // 포커스를 둔 상태다. 여기서 걸러내면 키보드로 중단할 길이 사라진다
        // (Escape는 포커스를 옮기지 않으므로 두 번 눌러도 마찬가지다).
        // 실행 중이 아니면 stop()은 아무 일도 하지 않으므로 평소에는 무해하다.
        h.stop();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
