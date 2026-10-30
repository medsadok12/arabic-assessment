import { useCallback, useEffect, useRef, useState } from 'react';

export function useToast() {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  const hide = useCallback(() => {
    clearTimeout(timer.current);
    setToast(null);
  }, []);

  const show = useCallback(next => {
    clearTimeout(timer.current);
    setToast({ ...next, id: Date.now() });
    timer.current = setTimeout(() => setToast(null), next.action ? 6000 : 3500);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return { toast, show, hide };
}
