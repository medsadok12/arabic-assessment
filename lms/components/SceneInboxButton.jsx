'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

/* زر «📥 حكايات الطلاب» في رأس bogga ولوحة المعلم — يفتح صندوق «مشهدٌ وحكاية»
   مباشرة، وعليه عدد الحكايات التي تنتظر التقييم (مما يحق لصاحب الحساب رؤيته).
   العدد حيّ: يتجدّد عند العودة للتبويب (القسم 9.5). */
export default function SceneInboxButton() {
  const [pending, setPending] = useState(0);

  const load = useCallback(() => {
    fetch(`/api/scenes/inbox?count=1&t=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(j => setPending(Number(j.pending) || 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const onBack = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onBack);
    return () => document.removeEventListener('visibilitychange', onBack);
  }, [load]);

  return (
    <Link href="/library/scenes/manage?tab=inbox" className="btn btn-outline btn-sm"
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
      aria-label={pending ? `حكايات الطلاب — ${pending} تنتظر التقييم` : 'حكايات الطلاب'}>
      📥 حكايات الطلاب
      {pending > 0 && (
        <span style={{
          minWidth: 22, height: 22, borderRadius: 999, padding: '0 6px', background: '#E8B84B', color: '#1A2B4A',
          fontSize: '.75rem', fontWeight: 900, display: 'inline-grid', placeItems: 'center',
        }}>{pending > 99 ? '99+' : pending}</span>
      )}
    </Link>
  );
}
