'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { childFetch, getActiveChildTab } from '../../lib/child-fetch';

export default function useLibraryProgress(staff) {
  const [state, setState] = useState({ progress: {}, ready: false, preview: !!staff, error: '' });
  const scopeRef = useRef(undefined), ticketRef = useRef(0);
  const refresh = useCallback(async () => {
    if (staff) return;
    const scope = getActiveChildTab(), ticket = ++ticketRef.current;
    if (scopeRef.current !== scope) {
      scopeRef.current = scope;
      setState({ progress: {}, ready: false, preview: false, error: '' });
    }
    try {
      const r = await childFetch('/api/library/progress', { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok || !j.progress || typeof j.progress !== 'object' || Array.isArray(j.progress)) throw new Error();
      if (ticket !== ticketRef.current || scope !== getActiveChildTab()) return;
      setState({ progress: j.progress, ready: true, preview: !!j.preview, error: '' });
    } catch {
      if (ticket !== ticketRef.current || scope !== getActiveChildTab()) return;
      setState({ progress: {}, ready: true, preview: false, error: 'إنجازاتك محفوظة. تعذّر عرض التقدّم الآن.' });
    }
  }, [staff]);
  useEffect(() => {
    if (staff) return;
    refresh();
    const visible = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('focus', visible); document.addEventListener('visibilitychange', visible);
    const timer = setInterval(visible, 60000);
    return () => { ticketRef.current++; clearInterval(timer); window.removeEventListener('focus', visible); document.removeEventListener('visibilitychange', visible); };
  }, [refresh, staff]);
  return { ...state, refresh };
}
