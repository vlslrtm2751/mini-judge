import { useEffect, useState } from 'react';

export function useIsPhone(): boolean {
  const [isPhone, setIsPhone] = useState(() => window.matchMedia('(max-width: 760px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)');
    const update = () => setIsPhone(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return isPhone;
}
