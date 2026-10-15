'use client';
import { useRef, useState } from 'react';
import AudioClipField from '../../../components/AudioClipField';
import {
  HUROOF_AUDIO_MAX_MB, HUROOF_IMAGE_MAX_MB, HUROOF_TEXT_LIMITS,
} from '../../../lib/huroof';
import { uploadHuroofMedia } from '../../../lib/huroof-client';
import { resizeImageToWebp } from '../../../lib/image-resize';

/* ════════════════════════════════════════════════════════════════
   محرر حرف واحد من الحروف الهجائية — للمعلم والمدير فقط
   الصورة (بدل الإيموجي) · اسم الحرف · الكلمة · الجملة ·
   صوت نطق الحرف · صوت الكلمة والجملة.
   الملفات تُرفع فوراً إلى Storage، وكل شيء يُحفظ معاً بزر «حفظ»
   (PUT /api/huroof/[idx]) فيراه الطلاب في الحال.
════════════════════════════════════════════════════════════════ */

const GOLD = '#E8B84B';
const NAVY = '#1A2B4A';
const SAND = '#EDE5D8';

const BTN = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  minHeight: 44, borderRadius: 12, padding: '8px 14px',
  fontSize: '.85rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
};
const BTN_GOLD  = { ...BTN, border: 'none', background: GOLD, color: NAVY, boxShadow: '0 3px 10px rgba(232,184,75,.35)' };
const BTN_LIGHT = { ...BTN, border: `2px solid ${SAND}`, background: '#fff', color: NAVY };
const BTN_RED   = { ...BTN, border: 'none', background: '#fee2e2', color: '#b91c1c' };
const INPUT = {
  width: '100%', boxSizing: 'border-box', border: `2px solid ${SAND}`, borderRadius: 12,
  padding: '10px 12px', fontSize: '1rem', fontFamily: 'inherit', color: NAVY, background: '#fff', direction: 'rtl',
};
const LABEL = { display: 'flex', flexDirection: 'column', gap: 6, fontWeight: 800, color: NAVY, fontSize: '.85rem' };
const SECTION = {
  background: '#FAF7F2', border: `2px dashed ${SAND}`, borderRadius: 14, padding: 14,
  display: 'flex', flexDirection: 'column', gap: 10,
};

const FIELDS = ['name', 'word', 'emoji', 'sentence', 'image_url', 'letter_audio_url', 'sentence_audio_url'];

export default function LetterEditor({ letter, onClose, onSaved }) {
  const [initial] = useState(() => Object.fromEntries(FIELDS.map(f => [f, letter[f] ?? null])));
  const [form,    setForm]    = useState(initial);
  const [saving,  setSaving]  = useState(false);
  const [imgBusy, setImgBusy] = useState(false);
  const [msg,     setMsg]     = useState(null);   // { ok, text }
  const imgRef = useRef(null);

  const set   = (f, v) => setForm(p => ({ ...p, [f]: v }));
  const dirty = FIELDS.some(f => (form[f] ?? null) !== (initial[f] ?? null));
  const busy  = saving || imgBusy;

  const close = () => {
    if (busy) return;
    if (dirty && !confirm('لم تحفظ التعديلات بعد — إغلاق النافذة؟')) return;
    onClose();
  };

  const pickImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setMsg({ ok: false, text: 'اختر ملف صورة (JPG أو PNG أو WEBP)' }); return; }
    if (file.size > HUROOF_IMAGE_MAX_MB * 1024 * 1024) { setMsg({ ok: false, text: `الصورة أكبر من ${HUROOF_IMAGE_MAX_MB}MB` }); return; }
    setImgBusy(true); setMsg(null);
    try {
      const small = await resizeImageToWebp(file, 360); // تُعرض بحجم 120px
      const url   = await uploadHuroofMedia(letter.idx, 'image', small);
      set('image_url', url);
      setMsg({ ok: true, text: '✅ رُفعت الصورة — اضغط «حفظ» في الأسفل' });
    } catch (err) {
      setMsg({ ok: false, text: `❌ ${err.message || 'تعذّر رفع الصورة'} — حاول مرة أخرى` });
    }
    setImgBusy(false);
  };

  const save = async () => {
    if (busy) return;
    setSaving(true); setMsg(null);
    try {
      const res  = await fetch(`/api/huroof/${letter.idx}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'تعذّر الحفظ');
      onSaved(json.row ?? null);
      onClose();
    } catch (err) {
      setMsg({ ok: false, text: `❌ ${err.message} — حاول مرة أخرى` });
      setSaving(false);
    }
  };

  const reset = async () => {
    if (busy || !confirm(`إعادة حرف «${letter.l}» لمحتواه الأصلي؟ ستُحذف صورته وأصواته المرفوعة.`)) return;
    setSaving(true); setMsg(null);
    try {
      const res  = await fetch(`/api/huroof/${letter.idx}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'تعذّرت الإعادة');
      onSaved(null);
      onClose();
    } catch (err) {
      setMsg({ ok: false, text: `❌ ${err.message}` });
      setSaving(false);
    }
  };

  const audioTexts = (kind) => kind === 'letter' ? {
    title:         `🔤 صوت نطق الحرف «${letter.l}»`,
    has:           '✅ للحرف صوت مسجَّل',
    record:        'سجّل نطق الحرف',
    rerecord:      'إعادة تسجيل الحرف',
    clipName:      `نطق حرف ${letter.l}`,
    recordingHint: `جارٍ التسجيل... انطق اسم الحرف بوضوح: ${form.name || letter.name}`,
    accept:        '✔ اعتمد هذا الصوت للحرف',
    added:         '✅ أُضيف صوت الحرف — اضغط «حفظ» في الأسفل',
    removeConfirm: 'إزالة صوت نطق الحرف؟',
    removed:       '🗑 أُزيل الصوت — يُحذف نهائياً عند «حفظ»',
    footer:        'يسمعه الطالب عند الضغط على بطاقة الحرف. بدونه يقرأ الجهاز اسم الحرف آلياً.',
  } : {
    title:         '🔊 صوت الكلمة والجملة',
    has:           '✅ للجملة صوت مسجَّل',
    record:        'سجّل الكلمة والجملة',
    rerecord:      'إعادة تسجيل الجملة',
    clipName:      `جملة حرف ${letter.l}`,
    recordingHint: `جارٍ التسجيل... اقرأ: ${form.word || letter.word} — ${form.sentence || letter.sentence}`,
    accept:        '✔ اعتمد هذا الصوت للجملة',
    added:         '✅ أُضيف صوت الجملة — اضغط «حفظ» في الأسفل',
    removeConfirm: 'إزالة صوت الكلمة والجملة؟',
    removed:       '🗑 أُزيل الصوت — يُحذف نهائياً عند «حفظ»',
    footer:        `يسمعه الطالب عند الضغط على «🔊 استمع» في نافذة الحرف. الحد الأقصى ${HUROOF_AUDIO_MAX_MB}MB — يُفضَّل MP3 أو M4A لأجهزة آيباد وآيفون.`,
  };

  return (
    <div
      onClick={close}
      style={{
        position: 'fixed', inset: 0, zIndex: 1300, background: 'rgba(15,23,42,.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12,
        fontFamily: "'Cairo','Tajawal',sans-serif",
      }}
    >
      <div
        dir="rtl"
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 22, width: '100%', maxWidth: 520, maxHeight: '92dvh',
          overflowY: 'auto', boxSizing: 'border-box', boxShadow: '0 16px 48px rgba(0,0,0,.3)',
          padding: '18px 18px calc(18px + env(safe-area-inset-bottom, 0px))',
          display: 'flex', flexDirection: 'column', gap: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <h3 style={{ margin: 0, color: NAVY, fontSize: '1.1rem', fontWeight: 900 }}>✏️ تعديل حرف «{letter.l}»</h3>
          <button type="button" onClick={close} aria-label="إغلاق"
            style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', background: '#f1f5f9', color: '#475569', fontSize: '1.1rem', cursor: 'pointer' }}>✕</button>
        </div>

        {/* الصورة */}
        <div style={SECTION}>
          <span style={{ fontWeight: 900, color: NAVY, fontSize: '.88rem' }}>🖼️ صورة الكلمة</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div style={{
              width: 120, height: 120, borderRadius: 18, background: '#fff', border: `2px solid ${SAND}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, fontSize: '4rem',
            }}>
              {form.image_url
                ? <img src={form.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                : (form.emoji || letter.emoji)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: '1 1 180px' }}>
              <input ref={imgRef} type="file" accept="image/*" onChange={pickImage} style={{ display: 'none' }} />
              <button type="button" onClick={() => imgRef.current?.click()} disabled={busy} style={{ ...BTN_GOLD, opacity: imgBusy ? .7 : 1 }}>
                {imgBusy ? '⏳ جارٍ رفع الصورة...' : form.image_url ? '🖼️ تغيير الصورة' : '🖼️ رفع صورة'}
              </button>
              {form.image_url && (
                <button type="button" onClick={() => set('image_url', null)} disabled={busy} style={BTN_RED}>✕ إزالة الصورة</button>
              )}
            </div>
          </div>
          <label style={LABEL}>
            الإيموجي (يظهر حين لا توجد صورة)
            <input value={form.emoji ?? ''} onChange={e => set('emoji', e.target.value)} maxLength={HUROOF_TEXT_LIMITS.emoji}
              style={{ ...INPUT, width: 90, textAlign: 'center', fontSize: '1.6rem', padding: '4px 8px' }} />
          </label>
        </div>

        {/* النصوص */}
        <div style={SECTION}>
          <label style={LABEL}>
            اسم الحرف
            <input value={form.name ?? ''} onChange={e => set('name', e.target.value)} maxLength={HUROOF_TEXT_LIMITS.name} style={INPUT} />
          </label>
          <label style={LABEL}>
            الكلمة
            <input value={form.word ?? ''} onChange={e => set('word', e.target.value)} maxLength={HUROOF_TEXT_LIMITS.word} style={{ ...INPUT, fontSize: '1.15rem' }} />
          </label>
          <label style={LABEL}>
            الجملة
            <textarea value={form.sentence ?? ''} onChange={e => set('sentence', e.target.value)} maxLength={HUROOF_TEXT_LIMITS.sentence} rows={2}
              style={{ ...INPUT, resize: 'vertical', lineHeight: 1.9 }} />
          </label>
          <span style={{ color: '#94a3b8', fontSize: '.72rem' }}>اترك أي حقل فارغاً ليعود لنصّه الأصلي.</span>
        </div>

        {/* الأصوات */}
        <AudioClipField
          key={`letter-${letter.idx}`}
          audioUrl={form.letter_audio_url}
          onChange={url => set('letter_audio_url', url)}
          upload={(blob, onProgress) => uploadHuroofMedia(letter.idx, 'letter_audio', blob, onProgress)}
          maxSecs={60}
          maxMb={HUROOF_AUDIO_MAX_MB}
          texts={audioTexts('letter')}
        />
        <AudioClipField
          key={`sentence-${letter.idx}`}
          audioUrl={form.sentence_audio_url}
          onChange={url => set('sentence_audio_url', url)}
          upload={(blob, onProgress) => uploadHuroofMedia(letter.idx, 'sentence_audio', blob, onProgress)}
          maxSecs={3 * 60}
          maxMb={HUROOF_AUDIO_MAX_MB}
          texts={audioTexts('sentence')}
        />

        {msg && (
          <div style={{
            borderRadius: 10, padding: '8px 12px', fontSize: '.85rem', fontWeight: 700,
            background: msg.ok ? '#ecfdf5' : '#fef2f2', color: msg.ok ? '#065f46' : '#b91c1c',
            border: `1.5px solid ${msg.ok ? '#86efac' : '#fecaca'}`,
          }}>{msg.text}</div>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" onClick={save} disabled={busy} style={{ ...BTN_GOLD, flex: '1 1 100%', minHeight: 50, fontSize: '1rem', opacity: saving ? .7 : 1 }}>
            {saving ? '⏳ جارٍ الحفظ...' : '💾 حفظ التعديلات'}
          </button>
          {letter.customized && (
            <button type="button" onClick={reset} disabled={busy} style={{ ...BTN_LIGHT, flex: '1 1 140px' }}>↩️ إعادة الأصل</button>
          )}
          <button type="button" onClick={close} disabled={busy} style={{ ...BTN_LIGHT, flex: '1 1 140px' }}>إلغاء</button>
        </div>
        <span style={{ color: '#94a3b8', fontSize: '.72rem', textAlign: 'center' }}>يرى الطلاب التعديل فور الحفظ.</span>
      </div>
    </div>
  );
}
