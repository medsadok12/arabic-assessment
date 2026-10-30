'use client';
import { useRef, useState } from 'react';
import AudioClipField from '../../../components/AudioClipField';
import {
  HUROOF_AUDIO_MAX_MB, HUROOF_IMAGE_MAX_MB, HUROOF_TEXT_LIMITS, HUROOF_LIST_LIMITS, HUROOF_DEFAULT_SETTINGS,
  riddleDefaults, answerFromWord,
} from '../../../lib/huroof';
import { checkSpelling, SPELL_KIND_LABELS } from '../../../lib/huroof-spell';
import { uploadHuroofMedia } from '../../../lib/huroof-client';
import { resizeImageToWebp } from '../../../lib/image-resize';

/* ════════════════════════════════════════════════════════════════
   محرر حرف واحد من الحروف الهجائية — للمعلم والمدير فقط
   الصورة (بدل الإيموجي) · اسم الحرف · الكلمة · الجملة ·
   صوت نطق الحرف · صوت الكلمة والجملة ·
   لغز فهيم وتسجيله · الكلمة المطلوبة إملاءً · إجابات أخرى مقبولة · قواعد المعلم + مختبر المدقق.
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

const FIELDS = ['name', 'word', 'emoji', 'sentence', 'image_url', 'letter_audio_url', 'sentence_audio_url', 'riddle', 'riddle_audio_url', 'answer'];
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export default function LetterEditor({ letter, settings = HUROOF_DEFAULT_SETTINGS, onClose, onSaved }) {
  const [initial] = useState(() => ({
    ...Object.fromEntries(FIELDS.map(f => [f, letter[f] ?? null])),
    // اللغز والإجابة: الحقل فارغ ما دام افتراضياً (والافتراضي يظهر كنص إرشادي)
    riddle: letter.custom?.riddle ? letter.riddle : null,
    answer: letter.custom?.answer ? letter.answer : null,
    accept: letter.accept ?? [],
    spell_rules: letter.rules ?? [],
  }));
  const [form,    setForm]    = useState(initial);
  const [newAlt,  setNewAlt]  = useState('');
  const [test,    setTest]    = useState('');
  const [saving,  setSaving]  = useState(false);
  const [imgBusy, setImgBusy] = useState(false);
  const [msg,     setMsg]     = useState(null);   // { ok, text }
  const imgRef = useRef(null);

  const set   = (f, v) => setForm(p => ({ ...p, [f]: v }));
  const dirty = FIELDS.some(f => (form[f] ?? null) !== (initial[f] ?? null))
    || !same(form.accept, initial.accept) || !same(form.spell_rules, initial.spell_rules);
  // الافتراضي لهذه الكلمة (إن غيّر المعلم الكلمة فلا لغز ولا قواعد افتراضية)
  const defs = riddleDefaults(letter.idx, form.word || letter.word);
  const rulesClean = form.spell_rules.map(r => ({ wrong: (r.wrong || '').trim(), msg: (r.msg || '').trim() })).filter(r => r.wrong && r.msg);
  const tryResult = test.trim() ? checkSpelling(test, {
    word: form.word || letter.word, answer: (form.answer || '').trim() || undefined, accept: form.accept, rules: rulesClean,
  }, { allowAl: settings.accept_al }) : null;
  const addAlt = () => {
    const v = newAlt.trim();
    if (!v || form.accept.includes(v) || form.accept.length >= HUROOF_LIST_LIMITS.accept) return;
    set('accept', [...form.accept, v]); setNewAlt('');
  };
  const setRule = (i, k, v) => set('spell_rules', form.spell_rules.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
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
      // تُعرض الآن تملأ إطار البطاقة (حتى ≈460×250 نقطة، وضعفها على شاشات الجوال الحادة) —
      // 360px كانت تبدو مشوّشة، فـ1280px بجودة عالية (≈100–250KB)
      const small = await resizeImageToWebp(file, 1280, 0.88);
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
      // القوائم المطابقة للافتراضي تُرسل null (تبقى افتراضية وتتبع تحديثاته)
      const body = {
        ...Object.fromEntries(FIELDS.map(f => [f, form[f] ?? null])),
        accept: same(form.accept, defs.accept) ? null : form.accept,
        spell_rules: same(rulesClean, defs.rules) ? null : rulesClean,
      };
      const res  = await fetch(`/api/huroof/${letter.idx}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
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

  const audioTexts = (kind) => kind === 'riddle' ? {
    title:         '🧩 تسجيل لغز فهيم (اختياري)',
    has:           '✅ للغز صوت مسجَّل',
    record:        'سجّل اللغز',
    rerecord:      'إعادة تسجيل اللغز',
    clipName:      `لغز حرف ${letter.l}`,
    recordingHint: `جارٍ التسجيل... اقرأ اللغز: ${form.riddle || defs.riddle || ''}`,
    added:         '✅ أُضيف صوت اللغز — اضغط «حفظ» في الأسفل',
    removeConfirm: 'إزالة صوت اللغز؟',
    removed:       '🗑 أُزيل الصوت — يُحذف نهائياً عند «حفظ»',
    footer:        'يظهر للطفل زر «🔊 اسمع اللغز» في نافذة فهيم. بدون تسجيل يقرأ الطفل اللغز بنفسه (لا صوت آلي).',
  } : kind === 'letter' ? {
    title:         `🔤 صوت نطق الحرف «${letter.l}»`,
    has:           '✅ للحرف صوت مسجَّل',
    record:        'سجّل نطق الحرف',
    rerecord:      'إعادة تسجيل الحرف',
    clipName:      `نطق حرف ${letter.l}`,
    recordingHint: `جارٍ التسجيل... انطق اسم الحرف بوضوح: ${form.name || letter.name}`,
    added:         '✅ أُضيف صوت الحرف — اضغط «حفظ» في الأسفل',
    removeConfirm: 'إزالة صوت نطق الحرف؟',
    removed:       '🗑 أُزيل الصوت — يُحذف نهائياً عند «حفظ»',
    footer:        'يسمعه الطالب عند الضغط على بطاقة الحرف وعند كشفه في التحدّي. بدونه لا صوت (لا قراءة آلية).',
  } : {
    title:         '🔊 صوت الكلمة والجملة',
    has:           '✅ للجملة صوت مسجَّل',
    record:        'سجّل الكلمة والجملة',
    rerecord:      'إعادة تسجيل الجملة',
    clipName:      `جملة حرف ${letter.l}`,
    recordingHint: `جارٍ التسجيل... اقرأ: ${form.word || letter.word} — ${form.sentence || letter.sentence}`,
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

        {/* لغز فهيم والإملاء (تحدّي الحروف) */}
        <div style={SECTION}>
          <span style={{ fontWeight: 900, color: NAVY, fontSize: '.88rem' }}>🧩 لغز فهيم والإملاء (تحدّي الحروف)</span>
          <label style={LABEL}>
            نص اللغز — يقوله فهيم بلسان الشيء: «من أنا؟»
            <textarea value={form.riddle ?? ''} onChange={e => set('riddle', e.target.value)} maxLength={HUROOF_TEXT_LIMITS.riddle} rows={2}
              placeholder={defs.riddle || 'اكتب لغزاً لهذه الكلمة… (بدونه يُسأل الطفل: ما اسم هذه الصورة؟)'}
              style={{ ...INPUT, resize: 'vertical', lineHeight: 1.9, fontFamily: 'var(--font-naskh), serif', fontSize: '1.05rem' }} />
          </label>
          <AudioClipField
            key={`riddle-${letter.idx}`}
            audioUrl={form.riddle_audio_url}
            onChange={url => set('riddle_audio_url', url)}
            upload={(blob, onProgress) => uploadHuroofMedia(letter.idx, 'riddle_audio', blob, onProgress)}
            maxSecs={60}
            maxMb={HUROOF_AUDIO_MAX_MB}
            texts={audioTexts('riddle')}
          />
          <label style={LABEL}>
            الكلمة التي يكتبها الطفل (بلا تشكيل — لا يُحاسَب عليه)
            <input value={form.answer ?? ''} onChange={e => set('answer', e.target.value)} maxLength={HUROOF_TEXT_LIMITS.answer}
              placeholder={answerFromWord(form.word || letter.word)} style={{ ...INPUT, fontFamily: 'var(--font-naskh), serif', fontSize: '1.2rem' }} />
          </label>
          <div style={LABEL}>
            إجابات أخرى مقبولة (مثل: قط لِـقطة)
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {form.accept.map(a => (
                <span key={a} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#E9F8F1', border: '1.5px solid #BFE9D4', borderRadius: 99, padding: '2px 4px 2px 12px', fontFamily: 'var(--font-naskh), serif', fontSize: '1.05rem' }}>
                  {a}
                  <button type="button" onClick={() => set('accept', form.accept.filter(x => x !== a))} aria-label={`حذف ${a}`}
                    style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: '#fff', cursor: 'pointer', fontWeight: 900 }}>✕</button>
                </span>
              ))}
              {!form.accept.length && <span style={{ color: '#94a3b8', fontWeight: 600, fontSize: '.8rem' }}>لا شيء — الكلمة وحدها</span>}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={newAlt} onChange={e => setNewAlt(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAlt(); } }}
                maxLength={HUROOF_LIST_LIMITS.item} placeholder="إجابة أخرى…" style={{ ...INPUT, flex: 1 }} />
              <button type="button" onClick={addAlt} disabled={!newAlt.trim() || form.accept.length >= HUROOF_LIST_LIMITS.accept} style={BTN_LIGHT}>➕ إضافة</button>
            </div>
          </div>
          <div style={LABEL}>
            قواعد المعلم — إن كتب الطفل كلمة قريبة (مرادفاً أو شبيهاً) يقول له فهيم رسالتك
            {form.spell_rules.map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', background: '#fff', border: `2px solid ${SAND}`, borderRadius: 12, padding: 6 }}>
                <input value={r.wrong} onChange={e => setRule(i, 'wrong', e.target.value)} maxLength={HUROOF_LIST_LIMITS.item} placeholder="إن كتب…" aria-label="ما قد يكتبه الطفل"
                  style={{ ...INPUT, flex: '0 1 110px', fontFamily: 'var(--font-naskh), serif' }} />
                <input value={r.msg} onChange={e => setRule(i, 'msg', e.target.value)} maxLength={HUROOF_LIST_LIMITS.msg} placeholder="يقول فهيم…" aria-label="رسالة فهيم"
                  style={{ ...INPUT, flex: '1 1 180px' }} />
                <button type="button" onClick={() => set('spell_rules', form.spell_rules.filter((_, j) => j !== i))} aria-label="حذف القاعدة" style={{ ...BTN_RED, minWidth: 44 }}>✕</button>
              </div>
            ))}
            <button type="button" onClick={() => set('spell_rules', [...form.spell_rules, { wrong: '', msg: '' }])}
              disabled={form.spell_rules.length >= HUROOF_LIST_LIMITS.spell_rules} style={{ ...BTN_LIGHT, alignSelf: 'flex-start' }}>➕ قاعدة جديدة</button>
          </div>
          <span style={{ color: '#64748b', fontSize: '.76rem', lineHeight: 1.8 }}>
            المدقق يصحّح وحده: الهمزات ومواضعها، التاء المربوطة والمفتوحة، التنوين المكتوب نوناً، الألف المقصورة، حروف المدّ، الحرف المشدّد، والحروف المتشابهة — ويكشف الكلمة في رسالته. أمّا الكلمة البعيدة فيقول «ليست هذه الكلمة» دون كشفها.
          </span>
          <label style={LABEL}>
            🧪 جرّب المدقق — اكتب كما قد يكتب الطفل
            <input value={test} onChange={e => setTest(e.target.value)} placeholder="مثل: اسد، تفاحه، أسدن…" style={{ ...INPUT, fontFamily: 'var(--font-naskh), serif', fontSize: '1.2rem' }} />
          </label>
          {tryResult && (
            <div style={{ borderRadius: 12, padding: '8px 12px', background: tryResult.ok ? '#E9F8F1' : '#F3EFFF', border: `2px solid ${tryResult.ok ? '#BFE9D4' : '#D9CCFF'}`, lineHeight: 1.8 }}>
              {tryResult.ok ? <b>✅ مقبولة — يُكشف الحرف</b> : (
                <>
                  <b style={{ fontSize: '.78rem', color: '#7C5CD9' }}>{SPELL_KIND_LABELS[tryResult.kind] || tryResult.kind}</b>
                  <div style={{ fontFamily: 'var(--font-naskh), serif', fontWeight: 700 }}>فهيم: {tryResult.msg}</div>
                  {tryResult.tip && <small style={{ color: '#52627E', fontWeight: 700 }}>💡 {tryResult.tip}</small>}
                </>
              )}
            </div>
          )}
        </div>

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
