'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

const CHECK_INTERVAL = 10 * 60 * 1000; // 10 minutes

export default function FlashcardReminder() {
  const [pending, setPending]   = useState(0);
  const [visible, setVisible]   = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const timerRef = useRef(null);

  async function check() {
    try {
      const r = await fetch('/api/flashcards');
      if (!r.ok) return;
      const data = await r.json();
      const count = (data.deck ?? []).length;
      setPending(count);
      if (count > 0) { setVisible(true); setDismissed(false); }
    } catch {}
  }

  useEffect(() => {
    // Initial check after 2 minutes (not immediately on page load)
    const initial = setTimeout(check, 2 * 60 * 1000);
    timerRef.current = setInterval(check, CHECK_INTERVAL);
    return () => { clearTimeout(initial); clearInterval(timerRef.current); };
  }, []);

  if (!visible || dismissed || pending === 0) return null;

  return (
    <>
      <style>{`
        @keyframes fcr-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes fcr-pulse  { 0%,100%{box-shadow:0 0 0 0 rgba(232,184,75,.55)} 70%{box-shadow:0 0 0 10px rgba(232,184,75,0)} }
        .fcr-wrap {
          position: fixed; bottom: 88px; left: 18px; z-index: 9999;
          animation: fcr-bounce 2s ease-in-out infinite;
        }
        .fcr-card {
          display: flex; align-items: center; gap: 10px;
          background: #1A2B4A; color: #fff;
          border: 2px solid #E8B84B; border-radius: 16px;
          padding: 10px 14px; box-shadow: 0 4px 20px rgba(0,0,0,.35);
          animation: fcr-pulse 2s infinite;
          text-decoration: none; font-family: Cairo, sans-serif;
          max-width: 220px;
        }
        .fcr-icon { font-size: 1.5rem; flex-shrink: 0; }
        .fcr-text { font-size: .8rem; font-weight: 700; line-height: 1.35; }
        .fcr-count {
          background: #E8B84B; color: #1A2B4A; border-radius: 20px;
          font-size: .72rem; font-weight: 800; padding: 2px 7px; white-space: nowrap;
        }
        .fcr-close {
          position: absolute; top: -7px; right: -7px;
          width: 20px; height: 20px; border-radius: 50%;
          background: #64748B; color: #fff; border: none; cursor: pointer;
          font-size: .7rem; display: flex; align-items: center; justify-content: center;
        }
      `}</style>
      <div className="fcr-wrap" dir="rtl">
        <Link href="/library/flashcards" className="fcr-card" onClick={() => setDismissed(true)}>
          <span className="fcr-icon">📚</span>
          <div className="fcr-text">
            راجع كلماتك!
            <span className="fcr-count"> {pending} كلمة معلقة</span>
          </div>
        </Link>
        <button className="fcr-close" onClick={() => setDismissed(true)} aria-label="إغلاق">✕</button>
      </div>
    </>
  );
}
