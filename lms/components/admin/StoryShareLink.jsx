'use client';
import { useState } from 'react';

/* ════════════════════════════════════════════════════════════════
   رابط مشاركة عام لقصة (تبويب القصص في bogga)
   ينشئ/يلغي stories.share_token عبر /api/stories/[id]/share — من يفتح الرابط
   يقرأ القصة ويستمع لها على /story/<token> بلا تسجيل دخول (بلا نقاط).
════════════════════════════════════════════════════════════════ */

const GOLD = '#E8B84B';
const NAVY = '#1A2B4A';
const SAND = '#EDE5D8';
const BTN = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  minHeight: 44, borderRadius: 12, padding: '8px 14px',
  fontSize: '.85rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
};

export default function StoryShareLink({ story, onChanged }) {
  const [busy,   setBusy]   = useState(false);
  const [copied, setCopied] = useState(false);
  const [err,    setErr]    = useState('');

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.aarem.net';
  const url    = story.share_token ? `${origin}/story/${story.share_token}` : null;

  const call = async (method) => {
    setBusy(true); setErr('');
    try {
      const res = await fetch(`/api/stories/${story.id}/share`, { method });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'تعذّر تنفيذ الطلب');
      onChanged?.(j.share_token ?? null);
    } catch (e) {
      setErr(`❌ ${e.message}`);
    }
    setBusy(false);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setErr('تعذّر النسخ تلقائياً — حدّد الرابط وانسخه يدوياً');
    }
  };

  const remove = () => {
    if (confirm('إلغاء رابط المشاركة؟ من لديه الرابط القديم لن يستطيع فتح القصة بعد الآن.')) call('DELETE');
  };

  const waText = url ? encodeURIComponent(`📖 قصة «${story.title}» من أكاديمية عارم — اقرأها واستمع إليها:\n${url}`) : '';

  return (
    <div style={{
      direction: 'rtl', background: '#FAF7F2', border: `2px dashed ${SAND}`, borderRadius: 16,
      padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div>
        <div style={{ fontWeight: 900, color: NAVY, fontSize: '.95rem' }}>🔗 رابط مشاركة عام</div>
        <div style={{ color: '#64748b', fontSize: '.8rem', marginTop: 4, lineHeight: 1.7 }}>
          أي شخص يفتح الرابط يقرأ هذه القصة ويستمع لها دون تسجيل دخول — بلا نقاط، ولا يرى بقية المكتبة.
        </div>
      </div>

      {url ? (
        <>
          <input
            readOnly
            value={url}
            dir="ltr"
            onFocus={(e) => e.target.select()}
            style={{ width: '100%', boxSizing: 'border-box', border: `2px solid ${SAND}`, borderRadius: 12, padding: '10px 12px', fontSize: '.9rem', fontFamily: 'monospace', color: NAVY, background: '#fff' }}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={copy} style={{ ...BTN, border: 'none', background: GOLD, color: NAVY, flex: '1 1 150px' }}>
              {copied ? '✅ نُسخ الرابط' : '📋 نسخ الرابط'}
            </button>
            <a href={`https://wa.me/?text=${waText}`} target="_blank" rel="noopener noreferrer"
              style={{ ...BTN, border: `2px solid ${SAND}`, background: '#fff', color: NAVY, textDecoration: 'none', flex: '1 1 150px' }}>
              💬 إرسال عبر واتساب
            </a>
            <a href={url} target="_blank" rel="noopener noreferrer"
              style={{ ...BTN, border: `2px solid ${SAND}`, background: '#fff', color: NAVY, textDecoration: 'none' }}>
              👁 فتح
            </a>
            <button type="button" onClick={remove} disabled={busy} style={{ ...BTN, border: 'none', background: '#fee2e2', color: '#b91c1c' }}>
              🗑 إلغاء الرابط
            </button>
          </div>
        </>
      ) : (
        <button type="button" onClick={() => call('POST')} disabled={busy}
          style={{ ...BTN, border: 'none', background: GOLD, color: NAVY, alignSelf: 'flex-start', opacity: busy ? .7 : 1 }}>
          {busy ? '⏳ جارٍ الإنشاء...' : '🔗 إنشاء رابط المشاركة'}
        </button>
      )}

      {err && <div style={{ color: '#b91c1c', fontSize: '.82rem', fontWeight: 700 }}>{err}</div>}
    </div>
  );
}
