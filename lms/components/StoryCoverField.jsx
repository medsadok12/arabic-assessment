'use client';
import { useRef, useState } from 'react';
import { resizeImageToWebp } from '../lib/image-resize';

/* ════════════════════════════════════════════════════════════════
   صورة غلاف القصة في محرر القصص — تظهر على بطاقة القصة في المكتبة مع العنوان.
   الصورة تُصغَّر في المتصفح (أطول ضلع 480px، WEBP/JPG) وتُرسل data URL صغيراً
   مع القصة عند الحفظ؛ الخادم يرفعها إلى Storage ويحفظ رابطها فقط
   (lib/story-cover.js). بلا غلاف تبقى البطاقة بالأيقونة كما كانت.
════════════════════════════════════════════════════════════════ */

const COVER_MAX = 480;
const FRIENDLY_ERROR = 'تعذّر تجهيز هذه الصورة — جرّب صورة أخرى بصيغة JPG أو PNG';

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

const BTN = {
  border: 'none', borderRadius: 12, padding: '11px 18px', minHeight: 44,
  fontSize: '.86rem', fontWeight: 800, cursor: 'pointer',
  fontFamily: "'Cairo','Tajawal',sans-serif",
};

export default function StoryCoverField({ value, onChange, title, icon, bg, border }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.type && !file.type.startsWith('image/')) { setErr('اختر ملف صورة (JPG أو PNG)'); return; }
    setBusy(true); setErr('');
    try {
      const blob = await resizeImageToWebp(file, COVER_MAX, 0.85);
      onChange(await blobToDataUrl(blob));
    } catch {
      setErr(FRIENDLY_ERROR);
    }
    setBusy(false);
  };

  return (
    <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
      {/* معاينة البطاقة كما تظهر في المكتبة */}
      <div style={{
        width: 132, flexShrink: 0, borderRadius: 18, padding: '10px 10px 12px',
        background: bg || '#ecfdf5', border: `2px solid ${border || '#6ee7b7'}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center',
      }}>
        <div style={{
          width: '100%', aspectRatio: '3 / 4', borderRadius: 12, overflow: 'hidden',
          background: value ? '#fff' : 'rgba(255,255,255,.6)',
          border: value ? 'none' : '2px dashed #cbd5e1',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: value ? '0 3px 10px rgba(0,0,0,.15)' : 'none',
        }}>
          {value
            ? <img src={value} alt="صورة الغلاف" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : <span style={{ fontSize: '2.6rem', lineHeight: 1 }}>{icon || '📖'}</span>}
        </div>
        <span style={{ fontSize: '.85rem', fontWeight: 800, color: '#1e293b', lineHeight: 1.35, wordBreak: 'break-word' }}>
          {title?.trim() || 'عنوان القصة'}
        </span>
      </div>

      <div style={{ flex: '1 1 220px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ margin: 0, fontSize: '.8rem', color: '#64748b', fontWeight: 600, lineHeight: 1.7 }}>
          {value
            ? 'هكذا ستظهر القصة للطلاب في قسم «قصص وحكايات»: صورة الغلاف ومعها العنوان.'
            : 'اختر صورة تكون غلافاً للقصة — تظهر للطلاب في قسم «قصص وحكايات» مع العنوان. بدون صورة تبقى الأيقونة.'}
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            style={{ ...BTN, background: '#E8B84B', color: '#1A2B4A', opacity: busy ? .6 : 1, boxShadow: '0 3px 10px rgba(232,184,75,.35)' }}
          >
            {busy ? '⏳ جارٍ تجهيز الصورة...' : value ? '🔄 تغيير صورة الغلاف' : '🖼️ رفع صورة الغلاف'}
          </button>
          {value && !busy && (
            <button
              type="button"
              onClick={() => { setErr(''); onChange(null); }}
              style={{ ...BTN, background: '#fee2e2', color: '#b91c1c' }}
            >
              🗑️ إزالة الصورة
            </button>
          )}
        </div>
        {err && <span style={{ fontSize: '.8rem', color: '#b91c1c', fontWeight: 700 }}>{err}</span>}
        {value?.startsWith('data:') && (
          <span style={{ fontSize: '.75rem', color: '#64748b', fontWeight: 600 }}>
            تُحفظ الصورة عند الضغط على «حفظ التغييرات».
          </span>
        )}
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={pick} />
      </div>
    </div>
  );
}
