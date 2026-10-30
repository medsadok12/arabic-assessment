import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { SyncStore } from '../lib/syncStore.js';
import { supabaseApi } from '../lib/api.js';
import { browserStorage } from '../lib/storage.js';

const POLL_MS = 30_000;

export function useMasareef(spaceKey) {
  const store = useMemo(
    () => new SyncStore({ key: spaceKey, api: supabaseApi, storage: browserStorage }),
    [spaceKey],
  );
  const state = useSyncExternalStore(store.subscribe, store.getState);

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') store.refresh();
    };
    store.refresh();
    const unsubscribe = supabaseApi.subscribe(spaceKey, () => store.refresh());
    const timer = setInterval(refreshIfVisible, POLL_MS);
    window.addEventListener('online', refreshIfVisible);
    window.addEventListener('focus', refreshIfVisible);
    document.addEventListener('visibilitychange', refreshIfVisible);
    return () => {
      unsubscribe();
      clearInterval(timer);
      window.removeEventListener('online', refreshIfVisible);
      window.removeEventListener('focus', refreshIfVisible);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [store, spaceKey]);

  return [state, store];
}
