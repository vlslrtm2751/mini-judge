import { useEffect } from 'react';

interface Handlers {
  runTest(): void;
  submit(): void;
  stop(): void;
  toggleComment(): void;
}

export function useShortcuts(handlers: Handlers) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const cmd = event.ctrlKey || event.metaKey;
      if (cmd && event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handlers.runTest();
      } else if (cmd && event.key === 'Enter' && event.shiftKey) {
        event.preventDefault();
        handlers.submit();
      } else if (cmd && event.key === '/') {
        event.preventDefault();
        handlers.toggleComment();
      } else if (event.key === 'Escape') {
        handlers.stop();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handlers]);
}
