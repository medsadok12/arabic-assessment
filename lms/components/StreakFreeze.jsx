'use client';
import { useState, useEffect } from 'react';

/* Streak-freeze store on the dashboard: the child spends points to hold up to `cap`
   freezes that automatically protect their streak on a day they miss. Purchase is
   fully atomic on the server (buy_streak_freeze). */
export default function StreakFreeze() {
  const [balance, setBalance] = useState(null);
  const [cap,     setCap]     = useState(2);
  const [price,   setPrice]   = useState(100);
  const [busy,    setBusy]    = useState(false);
  const [msg,     setMsg]     = useState(null); // { ok, text }

  useEffect(() => {
    let alive = true;
    fetch('/api/streak/freeze')
      .then(r => r.json())
      .then(d => {
        if (!alive) return;
        setBalance(d.balance ?? 0); setCap(d.cap ?? 2); setPrice(d.price ?? 100);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  async function buy() {
    if (busy || balance >= cap) return;
    setBusy(true); setMsg(null);
    try {
      const res = await fetch('/api/streak/freeze', { method: 'POST' });
      const j = await res.json();
      if (res.ok && j.ok) {
        setBalance(j.balance);
        setMsg({ ok: true, text: '🎉 حصلت على تجميدة! سلسلتُك محميّة الآن.' });
      } else {
        setMsg({ ok: false, text: j.error || 'تعذّر الشراء، حاول لاحقاً.' });
      }
    } catch {
      setMsg({ ok: false, text: 'تعذّر الاتصال، حاول لاحقاً.' });
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(null), 3600);
    }
  }

  if (balance === null) return null;
  const atCap = balance >= cap;

  return (
    <div style={{
      background: 'linear-gradient(135deg,#EEF4FF,#F4EFE6)',
      border: '1.5px solid #dbe6f5', borderRadius: 18,
      padding: '16px 18px', marginBottom: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: '2rem', lineHeight: 1 }}>🧊</div>
        <div style={{ flex: 1, minWidth: 150 }}>
          <div style={{ fontWeight: 900, fontSize: '.98rem', color: '#1A2B4A' }}>تجميد السلسلة</div>
          <div style={{ fontSize: '.8rem', color: '#5A6B84', marginTop: 2 }}>
            تحمي سلسلتك يوماً تغيب فيه — لديك <b>{balance}</b> من {cap}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {Array.from({ length: cap }, (_, i) => (
            <span key={i} style={{ fontSize: '1.2rem', opacity: i < balance ? 1 : 0.25 }}>🧊</span>
          ))}
        </div>
      </div>

      <button
        onClick={buy}
        disabled={busy || atCap}
        style={{
          width: '100%', marginTop: 12,
          background: atCap ? '#e6e0d4' : '#E8B84B',
          color: atCap ? '#8a94a6' : '#1A2B4A',
          border: 'none', borderRadius: 12, padding: '11px',
          fontWeight: 800, fontSize: '.92rem',
          cursor: busy || atCap ? 'default' : 'pointer', fontFamily: 'inherit',
          boxShadow: atCap ? 'none' : '0 3px 12px rgba(232,184,75,.4)',
        }}
      >
        {atCap ? '🧊 وصلت للحدّ الأقصى' : busy ? '⏳ لحظة...' : `🛡️ اشترِ تجميدة (${price} نقطة)`}
      </button>

      {msg && (
        <div style={{
          marginTop: 10, fontSize: '.82rem', fontWeight: 700, textAlign: 'center',
          color: msg.ok ? '#1a7c40' : '#b45309',
        }}>
          {msg.text}
        </div>
      )}
    </div>
  );
}
