'use client';
import { useRef, useState } from 'react';
import AudioClipField from '../../../../../components/AudioClipField';
import { resizeImageToWebp } from '../../../../../lib/image-resize';
import { uploadWordMedia, wwApi } from '../../../../../lib/word-wheel-client';
import { stripWheel, isArabicWord, cardFor, WORD_TEXT_LIMITS } from '../../../../../lib/word-wheel';
import { WordCard, themeVars, useWordVoice } from '../_ui';
import { Modal, Notice } from './_admin-ui';

/* ════════════════════════════════════════════════════════════════
   بطاقة التعلّم لكلمة واحدة (بنك الكلمات): الكلمة مشكولة، صورة أو رمز،
   نطق مسجَّل (.mp3 أو تسجيل مباشر)، شرح مبسّط، وتلميح «أكمل الكلمة».
   البطاقة تظهر للطفل عند اكتشاف الكلمة في أي عجلة وأي نمط.
   الصورة والصوت يُحفظان في البطاقة فور رفعهما (بطاقة محفوظة) فلا يضيعان
   إن أُغلقت النافذة قبل «حفظ» — درس قصة «فَهيم» (القسم 16).
════════════════════════════════════════════════════════════════ */

const TASHKEEL = [
  { ch: 'َ', name: 'فتحة' }, { ch: 'ُ', name: 'ضمة' }, { ch: 'ِ', name: 'كسرة' }, { ch: 'ْ', name: 'سكون' },
  { ch: 'ّ', name: 'شدة' }, { ch: 'ً', name: 'تنوين فتح' }, { ch: 'ٌ', name: 'تنوين ضم' }, { ch: 'ٍ', name: 'تنوين كسر' },
];
const TEXT_KEYS = ['vocalized', 'emoji', 'definition', 'hint'];
const pickForm = (r) => ({
  word: r?.word || '', vocalized: r?.vocalized || '', emoji: r?.emoji || '',
  image_url: r?.image_url || null, audio_url: r?.audio_url || null,
  definition: r?.definition || '', hint: r?.hint || '',
});

export default function WordEditor({ initial, theme, usedIn = [], onSaved, onDeleted, onClose, layer = 1 }) {
  const [row, setRow]         = useState(initial?.id ? initial : null);   // البطاقة المحفوظة
  const [form, setForm]       = useState(() => pickForm(initial));
  const [saving, setSaving]   = useState(false);
  const [uploads, setUploads] = useState(0);
  const [imgProgress, setImgProgress] = useState(null);
  const [msg, setMsg]         = useState(null);
  const [preview, setPreview] = useState(false);
  const vocRef  = useRef(null);
  const caretRef = useRef(null);   // موضع المؤشر في «المشكولة» — اللمس على آيباد يُفقد التركيز قبل زر الحركة
  const fileRef = useRef(null);
  const voice = useWordVoice();

  const isNew = !row;
  const word = stripWheel(form.word).replace(/\s+/g, '');
  const wordOk = word.length >= 2 && word.length <= 12 && isArabicWord(word);
  const vocOk = !form.vocalized || stripWheel(form.vocalized).replace(/\s+/g, '') === word;
  const baseline = pickForm(row || initial);
  const dirty = TEXT_KEYS.some(k => (form[k] || '') !== (baseline[k] || ''))
    || (isNew && (word !== baseline.word || form.image_url || form.audio_url));
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const close = () => {
    if (uploads) { setMsg({ tone: 'warn', text: '⏳ انتظر لحظة — الرفع لم يكتمل بعد' }); return; }
    if (dirty && !confirm('لم تُحفظ تعديلات البطاقة — هل تريد الخروج دون حفظ؟')) return;
    onClose();
  };

  /* الصورة/الصوت لبطاقة محفوظة: تُحفظ فوراً في القاعدة */
  const persistMedia = async (field, url) => {
    set(field, url);
    if (!row) return null;
    const { ok, data } = await wwApi(`/api/word-wheel/words/${row.id}`, { method: 'PUT', body: { [field]: url } });
    if (!ok) throw new Error(data.error || 'تعذّر الحفظ');
    setRow(data.word);
    onSaved(data.word, { stay: true });
    return data.word;
  };

  const track = async (fn) => {
    setUploads(n => n + 1);
    try { return await fn(); } finally { setUploads(n => n - 1); }
  };

  const onImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setMsg({ tone: 'error', text: 'اختر ملف صورة (JPG أو PNG أو WEBP)' }); return; }
    setMsg(null);
    await track(async () => {
      try {
        setImgProgress(0);
        const small = await resizeImageToWebp(file, 480); // تُعرض حتى 200px في البطاقة
        const url = await uploadWordMedia('image', small, setImgProgress);
        await persistMedia('image_url', url);
        setMsg({ tone: 'ok', text: row ? '✅ حُفظت الصورة في بطاقة الكلمة' : '✅ رُفعت الصورة — اضغط «حفظ البطاقة»' });
      } catch (err) {
        setMsg({ tone: 'error', text: `تعذّر رفع الصورة: ${err.message || 'حاول مرة أخرى'}` });
      } finally { setImgProgress(null); }
    });
  };

  const removeImage = async () => {
    if (!confirm('إزالة صورة الكلمة؟')) return;
    try {
      await persistMedia('image_url', null);
      setMsg({ tone: 'ok', text: row ? '🗑 أُزيلت الصورة' : '🗑 أُزيلت الصورة من البطاقة' });
    } catch (err) { setMsg({ tone: 'error', text: err.message }); }
  };

  const uploadAudio = (blob, onProgress) => track(async () => {
    const url = await uploadWordMedia('audio', blob, onProgress);
    await persistMedia('audio_url', url);
    return { url, message: row ? '✅ حُفظ نطق الكلمة في بطاقتها' : '✅ رُفع النطق — اضغط «حفظ البطاقة»' };
  });
  const onAudioChange = (url) => {
    if (url) { set('audio_url', url); return; }
    persistMedia('audio_url', null).catch(err => setMsg({ tone: 'error', text: err.message }));
  };

  const addMark = (ch) => {
    const el = vocRef.current;
    const v = form.vocalized || word;
    const at = Math.min(v.length, el && document.activeElement === el ? el.selectionStart : (caretRef.current ?? v.length));
    caretRef.current = at + 1;
    const next = v.slice(0, at) + ch + v.slice(at);
    set('vocalized', next);
    // المؤشر بعد الحركة المضافة — بلا إعادة تركيز (لا تقفز لوحة المفاتيح ولا يُسرق حقل آخر)
    requestAnimationFrame(() => { if (el && document.activeElement === el) el.setSelectionRange(at + 1, at + 1); });
  };

  const save = async () => {
    if (!wordOk) { setMsg({ tone: 'error', text: 'اكتب الكلمة بحروف عربية فقط (من حرفين إلى 12 حرفاً)' }); return; }
    if (!vocOk) { setMsg({ tone: 'error', text: 'الكلمة المشكولة يجب أن تكون نفس الكلمة بعد حذف الحركات' }); return; }
    setSaving(true); setMsg(null);
    const body = { vocalized: form.vocalized, emoji: form.emoji, definition: form.definition, hint: form.hint };
    const res = row
      ? await wwApi(`/api/word-wheel/words/${row.id}`, { method: 'PUT', body })
      : await wwApi('/api/word-wheel/words', { method: 'POST', body: { ...body, word, image_url: form.image_url, audio_url: form.audio_url } });
    setSaving(false);
    if (!res.ok) { setMsg({ tone: 'error', text: res.data.error || 'تعذّر حفظ البطاقة' }); return; }
    onSaved(res.data.word, { stay: false, created: !row });
  };

  const remove = async () => {
    if (!confirm(`حذف بطاقة «${row.vocalized || row.word}»؟ تبقى الكلمة في عجلاتها، وتظهر للطفل بلا صورة ولا شرح.`)) return;
    setSaving(true);
    const { ok, data } = await wwApi(`/api/word-wheel/words/${row.id}`, { method: 'DELETE' });
    setSaving(false);
    if (!ok) { setMsg({ tone: 'error', text: data.error || 'تعذّر الحذف' }); return; }
    onDeleted(row);
  };

  const card = cardFor(word || '؟', { [word]: { ...form, word } });
  const busy = saving || uploads > 0;

  return (
    <Modal layer={layer} onClose={close}
      title={isNew ? '✨ بطاقة كلمة جديدة' : `🃏 بطاقة «${row.vocalized || row.word}»`}
      footer={<>
        <button type="button" className="wa-btn" onClick={save} disabled={busy || !wordOk}>
          {saving ? 'جارٍ الحفظ…' : uploads ? '⏳ ننتظر اكتمال الرفع…' : '💾 حفظ البطاقة'}
        </button>
        <button type="button" className="wa-btn ghost" onClick={() => { if (word) { voice(card); setPreview(true); } }} disabled={!wordOk}>👀 معاينة كما يراها الطفل</button>
        {!isNew && <button type="button" className="wa-btn soft-red sm" onClick={remove} disabled={busy}>🗑 حذف البطاقة</button>}
      </>}>

      <div className="wa-section">
        <h4>🔤 الكلمة</h4>
        {isNew ? (
          <div className="wa-field">
            <span className="wa-label">الكلمة بلا تشكيل (كما تُركَّب من العجلة)</span>
            <input className="wa-input big" value={form.word} onChange={e => set('word', e.target.value)} placeholder="سمك" dir="rtl" lang="ar" autoFocus={!initial?.word} />
            {form.word && !wordOk && <small style={{ color: '#B45309', fontWeight: 800 }}>حروف عربية فقط، كلمة واحدة من حرفين إلى 12 حرفاً</small>}
          </div>
        ) : (
          <p className="wa-sub">الكلمة: <b style={{ fontSize: '1.2rem', color: '#1A2B4A' }}>{row.word}</b> — لتغيير الكلمة نفسها أنشئ بطاقة جديدة</p>
        )}
        <div className="wa-field">
          <span className="wa-label">الكلمة مشكولة (تظهر في البطاقة ويقرؤها الصوت الآلي)</span>
          <input ref={vocRef} className="wa-input big" value={form.vocalized} onChange={e => set('vocalized', e.target.value)}
            onSelect={e => { caretRef.current = e.target.selectionStart; }}
            placeholder={word ? `${word} ← مثل: سَمَك` : 'سَمَك'} dir="rtl" lang="ar" maxLength={WORD_TEXT_LIMITS.vocalized} />
          <div className="wa-tashkeel" aria-label="أزرار الحركات">
            {TASHKEEL.map(t => (
              <button key={t.name} type="button" title={t.name} aria-label={`أضف ${t.name}`} onMouseDown={e => e.preventDefault()} onClick={() => addMark(t.ch)}>
                {`ـ${t.ch}`}
              </button>
            ))}
          </div>
          {!vocOk && <small style={{ color: '#B45309', fontWeight: 800 }}>بعد حذف الحركات يجب أن تبقى «{word}» نفسها</small>}
        </div>
      </div>

      <div className="wa-section">
        <h4>🖼️ صورة الكلمة <small>تظهر في نمط «اكتشف الكلمة من الصورة» وفي بطاقة التعلّم</small></h4>
        <input ref={fileRef} type="file" accept="image/*" onChange={onImage} style={{ display: 'none' }} />
        <div className="wa-media">
          <div className="wa-media-img">
            {form.image_url ? <img src={form.image_url} alt={word} /> : form.emoji ? <span>{form.emoji}</span> : <span style={{ fontSize: '1rem', color: '#94A3B8' }}>بلا صورة</span>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: '1 1 200px' }}>
            <button type="button" className="wa-btn navy" onClick={() => fileRef.current?.click()} disabled={busy}>
              📷 {form.image_url ? 'استبدال الصورة' : 'ارفع صورة'}
            </button>
            {form.image_url && <button type="button" className="wa-btn ghost sm" onClick={removeImage} disabled={busy}>🗑 إزالة الصورة</button>}
            {imgProgress !== null && <div className="wa-progress"><div style={{ width: `${imgProgress}%` }} /></div>}
            <div className="wa-field">
              <span className="wa-label">أو رمز تعبيري (إيموجي) بديل عن الصورة</span>
              <input className="wa-input" value={form.emoji} onChange={e => set('emoji', e.target.value)} placeholder="🐟" maxLength={WORD_TEXT_LIMITS.emoji} style={{ fontSize: '1.6rem', maxWidth: 140, textAlign: 'center' }} />
            </div>
          </div>
        </div>
      </div>

      <AudioClipField
        key={row?.id || 'new'}
        audioUrl={form.audio_url}
        onChange={onAudioChange}
        upload={uploadAudio}
        maxSecs={20}
        maxMb={5}
        texts={{
          title: `🔊 نطق الكلمة «${form.vocalized || word || '…'}»`,
          has: '✅ للكلمة نطق مسجَّل',
          record: 'سجّل نطق الكلمة',
          rerecord: 'أعد تسجيل النطق',
          clipName: `نطق ${word || 'الكلمة'}`,
          recordingHint: `جارٍ التسجيل… انطق الكلمة بوضوح: ${form.vocalized || word}`,
          added: '✅ أُضيف النطق',
          removeConfirm: 'إزالة نطق الكلمة؟',
          removed: '🗑 أُزيل النطق',
          footer: 'يُشغَّل تلقائياً عند اكتشاف الطفل للكلمة. ملف MP3 أو تسجيل مباشر من الميكروفون (حتى 20 ثانية).',
        }}
      />

      <div className="wa-section">
        <h4>📝 الشرح والتلميح</h4>
        <div className="wa-field">
          <span className="wa-label">شرح بسيط وممتع للطفل (يظهر في بطاقة التعلّم)</span>
          <textarea className="wa-textarea" value={form.definition} onChange={e => set('definition', e.target.value)} maxLength={WORD_TEXT_LIMITS.definition}
            placeholder="حيوانٌ يعيشُ في الماءِ ويسبحُ بزعانفِهِ الصغيرة." dir="rtl" lang="ar" />
          <span className="wa-count">{form.definition.length}/{WORD_TEXT_LIMITS.definition}</span>
        </div>
        <div className="wa-field">
          <span className="wa-label">تلميح «أكمل الكلمة» (أسلوب التلميح النصي)</span>
          <input className="wa-input" value={form.hint} onChange={e => set('hint', e.target.value)} maxLength={WORD_TEXT_LIMITS.hint}
            placeholder="حيوانٌ أليفٌ يقولُ «مياو»" dir="rtl" lang="ar" />
          <span className="wa-sub" style={{ fontSize: '.76rem' }}>إن لم تذكر عدد الحروف يُضاف تلقائياً «— من {word.length || 'N'} حروف». وبلا تلميح يُستعمل الشرح.</span>
        </div>
      </div>

      {usedIn.length > 0 && <p className="wa-sub">🎡 تُستعمل في: {usedIn.join('، ')}</p>}
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}

      {preview && (
        <div style={themeVars(theme)}>
          <WordCard card={card} points={10} onReplay={() => voice(card)} onClose={() => setPreview(false)} />
        </div>
      )}
    </Modal>
  );
}
