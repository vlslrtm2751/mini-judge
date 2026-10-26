import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { useUiStore } from '@/stores/uiStore';

export function AppShell() {
  const theme = useUiStore((s) => s.theme);

  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'system') html.removeAttribute('data-theme');
    else html.setAttribute('data-theme', theme);
  }, [theme]);

  return <Outlet />;
}
