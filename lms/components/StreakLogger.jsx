'use client';
import { useState, useEffect } from 'react';

export default function StreakLogger() {
  const [toast, setToast] = useState(null); // { streak, isNew }

  useEffect(() => {
    fetch('/api/streak', { method: 'POST' })
      .then(r => r.json())
      .then(d => {
        if (d.ok && d.streak > 0) {
          setToast({ streak: d.streak, isNew: true });
          setTimeout(() => setToast(null), 3500);
        }
      })
      .catch(() => {});
  }, []);

  if (!toast) return null;

  return (
    <>
      <style>{`
        @keyframes stToastIn  { from{opacity:0;transform:translateY(20px) scale(.9)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes stToastOut { from{opacity:1} to{opacity:0;transform:translateY(-12px) scale(.95)} }
        .st-toast {
          position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
          z-index: 9999;
          background: linear-gradient(135deg,#b45309,#d97706);
          color: #fff; border-radius: 50px;
          padding: 12px 24px; font-weight: 900; font-size: 1rem;
          font-family: 'Cairo','Tajawal',sans-serif;
          box-shadow: 0 8px 32px rgba(180,83,9,.45);
          display: flex; align-items: center; gap: 10px;
          animation: stToastIn .4s cubic-bezier(0,.9,.57,1) both;
          white-space: nowrap;
        }
        .st-toast.hide { animation: stToastOut .4s ease forwards; }
      `}</style>
      <div className="st-toast">
        🔥 {toast.streak} {toast.streak === 1 ? 'يوم' : 'أيام'} متتالية — تم تسجيل يومك!
      </div>
    </>
  );
}
