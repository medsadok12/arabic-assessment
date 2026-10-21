'use client';
import { useMemo, useRef, useState } from 'react';
import AudioClipField from '../../../../components/AudioClipField';
import { resizeImageToWebp } from '../../../../lib/image-resize';
import { sceneApi, uploadSceneFile } from '../../../../lib/scene-story-client';
import {
  SCENE_MODES, MODE_INFO, BAND_INFO, DEFAULT_STARTERS, DEFAULT_WHAT_IF, LIMITS, wordNoun,
} from '../../../../lib/scene-story';
import { Modal, Toggle, Choice, Stepper, Notice } from '../../games/word-wheel/settings/_admin-ui';

/* ════════════════════════════════════════════════════════════════
   محرر المشهد — كل ما يراه الطفل بلا كود: الصورة وعدسات المحقّق عليها،
   السؤال (مكتوباً وبصوت المعلم)، وجوه المشاعر، سلّة الكلمات والذهبية منها،
   مساعدة الكتابة لكل فئة عمرية، بطاقات «ماذا لو؟»، طرق التعبير، والنشر.
════════════════════════════════════════════════════════════════ */

const DEFAULT_FEELING_Q = 'كيف تشعر الشخصية في الصورة؟';

/* ISO ← قيمة حقل datetime-local بتوقيت الجهاز، والعكس */
function toLocalInput(iso) {
  const t = Date.parse(iso || '');
  if (!Number.isFinite(t)) return '';
  const d = new Date(t);
  return new Date(t - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
const fromLocalInput = (v) => (v ? new Date(v).toISOString() : '');

function formFrom(scene) {
  const s = scene || {};
  return {
    title: s.title || '',
    image_url: s.image_url || '',
    prompt: s.prompt || '',
    prompt_audio_url: s.prompt_audio_url || null,
    words: Array.isArray(s.words) ? s.words : [],
    tiles: (Array.isArray(s.tiles) ? s.tiles : []).join(' '),
    starters: Array.isArray(s.starters) ? s.starters : [],
    what_if: Array.isArray(s.what_if) ? s.what_if : [],
    hotspots: Array.isArray(s.hotspots) ? s.hotspots : [],
    feeling_on: scene ? !!s.feeling_q : true,
    feeling_q: s.feeling_q || DEFAULT_FEELING_Q,
    modes: Array.isArray(s.modes) && s.modes.length ? s.modes : [...SCENE_MODES],
    band: s.band || 'auto',
    audience: s.audience || 'all',
    publish_at: toLocalInput(s.publish_at),
    is_active: scene ? s.is_active !== false : true,
    sort_order: Number(s.sort_order) || 0,
  };
}

/* قائمة نصوص قصيرة: شرائح بزر حذف + حقل إضافة */
function ListEditor({ items, onChange, placeholder, max, maxLen = 80, defaults }) {
  const [v, setV] = useState('');
  const add = () => {
    const t = v.replace(/\s+/g, ' ').trim().slice(0, maxLen);
    if (!t || items.includes(t) || items.length >= max) return;
    onChange([...items, t]);
    setV('');
  };
  return (
    <div className="sm-list">
      {items.length > 0 ? (
        <div className="sm-chips">
          {items.map(x => (
            <span key={x} className="sm-chip">
              {x}
              <button type="button" onClick={() => onChange(items.filter(y => y !== x))} aria-label={`حذف ${x}`}>✕</button>
            </span>
          ))}
        </div>
      ) : defaults && (
        <p className="wa-sub">فارغة = نستعمل الجاهزة: {defaults.join(' · ')}</p>
      )}
      {items.length < max && (
        <div className="sm-add">
          <input className="wa-input" value={v} maxLength={maxLen} placeholder={placeholder}
            onChange={e => setV(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
          <button type="button" className="wa-btn ghost sm" onClick={add} disabled={!v.trim()}>➕ أضف</button>
        </div>
      )}
    </div>
  );
}

export default function SceneEditor({ initial, isAdmin, onClose, onSaved }) {
  const [form, setForm]       = useState(() => formFrom(initial));
  const [wordIn, setWordIn]   = useState('');
  const [lensMode, setLensMode] = useState(false);
  const [imgBusy, setImgBusy] = useState(null);   // نسبة رفع الصورة
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState(null);
  const start = useRef(JSON.stringify(formFrom(initial)));
  const lensInputs = useRef({});
  const editing = !!initial?.id;
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const dirty = JSON.stringify(form) !== start.current;
  const tilesPreview = useMemo(() => form.tiles.split(/\s+/).filter(Boolean).slice(0, LIMITS.tiles), [form.tiles]);

  const close = () => {
    if (dirty && !saving && !confirm('لديك تعديلات لم تُحفظ — هل تغلق المحرر؟')) return;
    onClose();
  };

  /* ── الصورة ── */
  const pickImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setImgBusy(0);
    try {
      const blob = await resizeImageToWebp(file, 1600, 0.85);
      const url = await uploadSceneFile('image', blob, { onProgress: setImgBusy });
      set('image_url', url);
    } catch (err) {
      setError(err.message || 'تعذّر رفع الصورة');
    }
    setImgBusy(null);
  };

  /* ── عدسات المحقّق: لمسة على الصورة تضع عدسة في مكانها ── */
  const placeLens = (e) => {
    if (!lensMode || form.hotspots.length >= LIMITS.hotspots) return;
    const r = (e.currentTarget.querySelector('img') || e.currentTarget).getBoundingClientRect();
    const x = Math.round(((e.clientX - r.left) / r.width) * 1000) / 10;
    const y = Math.round(((e.clientY - r.top) / r.height) * 1000) / 10;
    const i = form.hotspots.length;
    set('hotspots', [...form.hotspots, { x, y, q: '' }]);
    setLensMode(false);
    setTimeout(() => lensInputs.current[i]?.focus(), 50);
  };
  const setLens = (i, q) => set('hotspots', form.hotspots.map((h, j) => (j === i ? { ...h, q } : h)));
  const dropLens = (i) => set('hotspots', form.hotspots.filter((_, j) => j !== i));

  /* ── سلّة الكلمات ── */
  const addWords = () => {
    const fresh = wordIn.split(/[,،\n]+/).map(w => w.replace(/\s+/g, ' ').trim().slice(0, LIMITS.word)).filter(Boolean);
    const have = new Set(form.words.map(w => w.w));
    const next = [...form.words];
    for (const w of fresh) if (!have.has(w) && next.length < LIMITS.words) { next.push({ w, gold: false }); have.add(w); }
    set('words', next);
    setWordIn('');
  };
  const toggleGold = (w) => set('words', form.words.map(x => (x.w === w ? { ...x, gold: !x.gold } : x)));
  const dropWord = (w) => set('words', form.words.filter(x => x.w !== w));

  const toggleMode = (m) => {
    const on = form.modes.includes(m);
    if (on && form.modes.length === 1) return;
    set('modes', SCENE_MODES.filter(x => (x === m ? !on : form.modes.includes(x))));
  };

  /* ── الحفظ ── */
  const save = async () => {
    if (!form.image_url) return setError('ارفع صورة المشهد أولاً 🖼️');
    if (!form.title.trim()) return setError('اكتب عنواناً للمشهد');
    if (!form.prompt.trim()) return setError('اكتب سؤال المشهد للطفل');
    const emptyLens = form.hotspots.findIndex(h => !h.q.trim());
    if (emptyLens >= 0) { lensInputs.current[emptyLens]?.focus(); return setError(`اكتب سؤال العدسة رقم ${emptyLens + 1} أو احذفها`); }
    setSaving(true);
    setError(null);
    const body = {
      title: form.title, image_url: form.image_url, prompt: form.prompt, prompt_audio_url: form.prompt_audio_url,
      words: form.words, tiles: tilesPreview, starters: form.starters, what_if: form.what_if, hotspots: form.hotspots,
      feeling_q: form.feeling_on ? (form.feeling_q.trim() || DEFAULT_FEELING_Q) : '',
      modes: form.modes, band: form.band, is_active: form.is_active, sort_order: form.sort_order,
      publish_at: fromLocalInput(form.publish_at),
      ...(isAdmin ? { audience: form.audience } : {}),
    };
    const { ok, data } = await sceneApi(editing ? `/api/scenes/manage/${initial.id}` : '/api/scenes/manage', { method: editing ? 'PUT' : 'POST', body });
    setSaving(false);
    if (!ok) { setError(data.error || 'تعذّر الحفظ — حاول مرة أخرى'); return; }
    onSaved({ ...data.scene, counts: initial?.counts || { total: 0, pending: 0 } }, { created: !editing });
  };

  return (
    <Modal wide title={editing ? `✏️ تعديل «${initial.title}»` : '➕ مشهد جديد'} onClose={close}
      footer={(
        <>
          <button type="button" className="wa-btn" onClick={save} disabled={saving || imgBusy !== null}>
            {saving ? '⏳ نحفظ…' : editing ? '💾 احفظ التعديلات' : '🚀 انشر المشهد'}
          </button>
          <button type="button" className="wa-btn ghost" onClick={close} disabled={saving}>إلغاء</button>
        </>
      )}>
      {error && <Notice tone="error">{error}</Notice>}

      <section className="wa-section">
        <h4>🖼️ الصورة والسؤال</h4>
        {form.image_url ? (
          <div className="sm-editor-img">
            <div className={`sm-img-wrap${lensMode ? ' placing' : ''}`} onClick={placeLens}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.image_url} alt="صورة المشهد" />
              {form.hotspots.map((h, i) => (
                <span key={i} className="sm-lens" style={{ left: `${h.x}%`, top: `${h.y}%` }}>{i + 1}</span>
              ))}
              {lensMode && <div className="sm-lens-hint">👆 المس مكان العدسة على الصورة</div>}
            </div>
            <div className="wa-row">
              <label className="wa-btn ghost sm sm-file-btn">
                🔄 تغيير الصورة
                <input type="file" accept="image/*" onChange={pickImage} className="sm-file" disabled={imgBusy !== null} />
              </label>
              <button type="button" className={`wa-btn sm ${lensMode ? 'navy' : 'ghost'}`} onClick={() => setLensMode(m => !m)}
                disabled={form.hotspots.length >= LIMITS.hotspots && !lensMode}>
                {lensMode ? '✖ إلغاء وضع العدسة' : `🔍 ضع عدسة محقّق (${form.hotspots.length}/${LIMITS.hotspots})`}
              </button>
            </div>
          </div>
        ) : (
          <label className="sm-drop">
            <span aria-hidden="true">🖼️</span>
            <b>{imgBusy !== null ? `⏳ نرفع الصورة ${imgBusy}%` : 'ارفع صورة المشهد'}</b>
            <small>صورة واضحة فيها حكاية: أشخاص، مكان، حدث. تُصغَّر تلقائياً قبل الرفع</small>
            <input type="file" accept="image/*" onChange={pickImage} className="sm-file" disabled={imgBusy !== null} />
          </label>
        )}
        {imgBusy !== null && form.image_url && <div className="wa-progress"><div style={{ width: `${imgBusy}%` }} /></div>}

        <label className="wa-field">
          <span className="wa-label">عنوان المشهد</span>
          <input className="wa-input" value={form.title} maxLength={LIMITS.title} placeholder="مثل: يومٌ على التلّة" onChange={e => set('title', e.target.value)} />
        </label>
        <label className="wa-field">
          <span className="wa-label">سؤال المشهد للطفل <small style={{ fontWeight: 600, color: '#64748B' }}>— يسمعه الطفل عند لمس 🔊 تحت عنوان «اسْتَمِعْ وَعَبِّرْ»، ويظهر وصفاً للمشهد في قائمة المشاهد</small></span>
          <textarea className="wa-textarea" value={form.prompt} maxLength={LIMITS.prompt} placeholder="ماذا يحدث في هذه الصورة؟ احكِ لنا الحكاية!" onChange={e => set('prompt', e.target.value)} />
          <span className="wa-count">{form.prompt.length}/{LIMITS.prompt}</span>
        </label>
        <AudioClipField
          audioUrl={form.prompt_audio_url}
          onChange={url => set('prompt_audio_url', url)}
          upload={(blob, onProgress) => uploadSceneFile('prompt_audio', blob, { onProgress })}
          maxSecs={90}
          maxMb={10}
          texts={{
            title: '🔊 السؤال بصوتك (اختياري)', has: '✓ مسجَّل', record: 'سجّل السؤال بصوتك', rerecord: 'أعد التسجيل',
            clipName: 'صوت السؤال', recordingHint: 'اقرأ سؤال المشهد بصوت واضح ومشجّع',
            added: '✅ حُفظ الصوت — يُربط بالمشهد عند «احفظ»', removeConfirm: 'إزالة صوت السؤال؟', removed: 'أُزيل الصوت — احفظ المشهد لتثبيت ذلك',
            footer: 'بلا تسجيل: يقرأ الجهاز السؤال للطفل عند لمس 🔊',
          }}
        />
      </section>

      {form.hotspots.length > 0 && (
        <section className="wa-section">
          <h4>🔍 عدسات المحقّق <small>سؤال صغير يظهر حين يلمس الطفل العدسة</small></h4>
          {form.hotspots.map((h, i) => (
            <div key={i} className="sm-lens-row">
              <span className="sm-lens static">{i + 1}</span>
              <input ref={el => { lensInputs.current[i] = el; }} className="wa-input" value={h.q} maxLength={LIMITS.q}
                placeholder="مثل: ما لونُ الطائرة؟ وإلى أين تطير؟" onChange={e => setLens(i, e.target.value)} />
              <button type="button" className="wa-icon-btn del" onClick={() => dropLens(i)} aria-label={`حذف العدسة ${i + 1}`}>🗑</button>
            </div>
          ))}
        </section>
      )}

      <section className="wa-section">
        <h4>😊 الشعور قبل الكتابة</h4>
        <Toggle checked={form.feeling_on} onChange={v => set('feeling_on', v)} label="وجوه المشاعر" hint="يختار الطفل شعور الشخصية — خطوة صغيرة تجعله يفكّر في المشهد" />
        {form.feeling_on && (
          <input className="wa-input" value={form.feeling_q} maxLength={LIMITS.feelingQ} placeholder={DEFAULT_FEELING_Q} onChange={e => set('feeling_q', e.target.value)} />
        )}
      </section>

      <section className="wa-section">
        <h4>🧺 سلّة الكلمات <small>اكتبها مشكولة · المس ⭐ لتصبح ذهبية (نجمة إضافية لمن يستعملها)</small></h4>
        {form.words.length > 0 && (
          <div className="sm-chips">
            {form.words.map(w => (
              <span key={w.w} className={`sm-chip word${w.gold ? ' gold' : ''}`}>
                <button type="button" onClick={() => toggleGold(w.w)} aria-pressed={w.gold} aria-label={w.gold ? 'إلغاء الذهبية' : 'اجعلها ذهبية'}>{w.gold ? '⭐' : '☆'}</button>
                {w.w}
                <button type="button" onClick={() => dropWord(w.w)} aria-label={`حذف ${w.w}`}>✕</button>
              </span>
            ))}
          </div>
        )}
        {form.words.length < LIMITS.words && (
          <div className="sm-add">
            <input className="wa-input" value={wordIn} placeholder="الرِّيحُ، فَرِحَ، طَائِرَةٌ — افصل بفاصلة"
              onChange={e => setWordIn(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addWords(); } }} />
            <button type="button" className="wa-btn ghost sm" onClick={addWords} disabled={!wordIn.trim()}>➕ أضف</button>
          </div>
        )}
      </section>

      <section className="wa-section">
        <h4>✍️ مساعدة الكتابة حسب العمر</h4>
        <Choice value={form.band} onChange={v => set('band', v)} options={[
          { value: 'auto', label: '🎯 حسب صف الطالب', hint: 'كل طفل يرى مساعدة عمره' },
          ...Object.entries(BAND_INFO).map(([k, b]) => ({ value: k, label: `${b.icon} ${b.label} فقط`, hint: `هدف ${b.goal} ${wordNoun(b.goal)}` })),
        ]} />
        {(form.band === 'auto' || form.band === '1') && (
          <label className="wa-field">
            <span className="wa-label">🧩 بطاقات جملة الصغار (الصف 1–2) — اكتب الجملة وسنقسمها بطاقات</span>
            <input className="wa-input" value={form.tiles} placeholder="فهيم يُطَيِّرُ طائرةً على التلّة" onChange={e => set('tiles', e.target.value)} />
            {tilesPreview.length > 0
              ? <div className="sm-chips">{tilesPreview.map((t, i) => <span key={i} className="sm-chip tile">{t}</span>)}</div>
              : <span className="wa-sub">فارغة = نستعمل كلمات السلّة بطاقاتٍ</span>}
          </label>
        )}
        {(form.band === 'auto' || form.band === '2') && (
          <div className="wa-field">
            <span className="wa-label">🌿 بدايات جمل (الصف 3–4)</span>
            <ListEditor items={form.starters} onChange={v => set('starters', v)} max={LIMITS.starters} maxLen={60}
              placeholder="مثل: شعرَ فهيم بـ…" defaults={DEFAULT_STARTERS} />
          </div>
        )}
        {(form.band === 'auto' || form.band === '3') && (
          <p className="wa-sub">🌳 الصف 5–7: خريطة الحكاية (من؟ أين ومتى؟ ماذا حدث؟ كيف انتهت؟) تظهر تلقائياً.</p>
        )}
        <div className="wa-field">
          <span className="wa-label">🎲 بطاقات «ماذا لو؟» للطفل المحتار</span>
          <ListEditor items={form.what_if} onChange={v => set('what_if', v)} max={LIMITS.whatIf} maxLen={LIMITS.q}
            placeholder="مثل: ماذا لو انقطعَ خيطُ الطائرة؟" defaults={DEFAULT_WHAT_IF.slice(0, 2)} />
        </div>
      </section>

      <section className="wa-section">
        <h4>📣 التعبير والنشر</h4>
        <div className="wa-field">
          <span className="wa-label">طرق التعبير المسموحة</span>
          <div className="sm-modes">
            {SCENE_MODES.map(m => (
              <button key={m} type="button" className={`wa-chipbtn${form.modes.includes(m) ? ' on' : ''}`} aria-pressed={form.modes.includes(m)} onClick={() => toggleMode(m)}>
                {MODE_INFO[m].icon} {MODE_INFO[m].label}
              </button>
            ))}
          </div>
        </div>
        {isAdmin ? (
          <div className="wa-field">
            <span className="wa-label">لمن يظهر؟</span>
            <Choice value={form.audience} onChange={v => set('audience', v)} options={[
              { value: 'all', label: '🌍 لكل الطلاب' },
              { value: 'mine', label: '👥 لطلاب منشئ المشهد فقط' },
            ]} />
          </div>
        ) : (
          <p className="wa-sub">👥 يظهر هذا المشهد لطلابك فقط.</p>
        )}
        <label className="wa-field">
          <span className="wa-label">موعد الظهور للطلاب (فارغ = الآن)</span>
          <input type="datetime-local" className="wa-input" value={form.publish_at} onChange={e => set('publish_at', e.target.value)} />
        </label>
        <Toggle checked={form.is_active} onChange={v => set('is_active', v)} label="👁️ ظاهر للطلاب" hint="أوقفه لإخفاء المشهد دون حذفه" />
        <div className="wa-field wa-field-row">
          <span className="wa-toggle-text"><b>ترتيب الظهور</b><small>الأصغر أولاً</small></span>
          <Stepper value={form.sort_order} onChange={v => set('sort_order', v)} min={0} max={999} />
        </div>
      </section>
    </Modal>
  );
}
