'use client';
import { useMemo, useRef, useState } from 'react';
import WheelSVG from '../../../../../components/WordWheelSVG';
import {
  MODE_INFO, WW_MODES, CHALLENGE_LEVELS, WHEEL_TIME_OPTIONS, MAX_OUTER_LETTERS,
  parseLetters, normalizeWheelWords, wordProblem, suggestWheelLetters, shuffled,
  resolveTheme, effectiveSettings, wheelForPlay, cardFor,
} from '../../../../../lib/word-wheel';
import { wwApi } from '../../../../../lib/word-wheel-client';
import ThemeEditor from './_theme-editor';
import TryWheel from './_try-wheel';
import { Modal, Notice, Toggle, Choice, Stepper, SettingsFields, MODE_COLORS } from './_admin-ui';

/* ════════════════════════════════════════════════════════════════
   محرر العجلة: النمط، الكلمات المقبولة (مع بطاقة كل كلمة)، الحرف الأوسط
   والحروف الخارجية، الوقت والمرحلة (للتحدي)، أسلوب الإكمال، ألوان ومساعدة
   خاصة بهذه العجلة — مع معاينة حيّة و«▶️ جرّب العجلة» قبل الحفظ.
════════════════════════════════════════════════════════════════ */

const KEYS = ['ا', 'أ', 'إ', 'آ', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ',
  'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي', 'ى', 'ة', 'ء', 'ؤ', 'ئ'];

// مفاتيح المساعدة التي يستعملها كل نمط فعلاً
const HELP_KEYS = {
  picture:   ['hints_enabled', 'hints_limit', 'max_attempts', 'instant_check', 'shuffle_words', 'show_card', 'card_seconds'],
  complete:  ['hints_enabled', 'hints_limit', 'max_attempts', 'instant_check', 'shuffle_words', 'show_card', 'card_seconds'],
  challenge: ['hints_enabled', 'hints_limit', 'show_card', 'card_seconds'],
};
const NAME_HINT = { picture: '🐾 حيوانات الغابة', complete: '🧩 أكمل الحرف الناقص', challenge: '🟢 مبتدئ ٦' };

const pick = (obj, keys) => Object.fromEntries(keys.filter(k => obj[k] !== undefined).map(k => [k, obj[k]]));

function fromRow(row, mode) {
  return {
    name: row?.name || '',
    mode: row?.mode || mode || 'picture',
    level: row?.level || 1,
    sort_order: row?.sort_order ?? 0,
    time_seconds: row?.time_seconds ?? 90,
    is_active: row?.is_active ?? true,
    center: parseLetters(row?.center_letter)[0] || '',
    outer: parseLetters(row?.outer_letters),
    words: normalizeWheelWords(row?.valid_words).map(w => w.word),
    theme: row?.theme || null,
    settings: row?.settings || null,
  };
}

/* الإعدادات المحفوظة للعجلة: مفاتيح نمطها فقط (وأسلوب الإكمال لنمطه) أو null */
function cleanSettings(settings, mode) {
  if (!settings) return null;
  const keys = mode === 'complete' ? [...HELP_KEYS.complete, 'complete_style'] : HELP_KEYS[mode];
  const s = pick(settings, keys);
  return Object.keys(s).length ? s : null;
}

export default function WheelEditor({ initial, defaultMode, copy = false, bank, global, onSaved, onClose, onOpenWord, onNeedSql }) {
  const isNew = !initial?.id || copy;
  const readOnly = !isNew && initial.can_edit === false;
  const start = useMemo(() => {
    const f = fromRow(initial, defaultMode);
    if (copy) f.name = `${f.name} (نسخة)`.slice(0, 60);
    return f;
  }, [initial, defaultMode, copy]);
  const [f, setF]           = useState(start);
  const [target, setTarget] = useState(start.center ? 'outer' : 'center');
  const [newWords, setNewWords] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState(null);
  const [trying, setTrying] = useState(false);
  const wordRef = useRef(null);

  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const dirty = JSON.stringify(f) !== JSON.stringify(start);
  const g = global;
  const eff = effectiveSettings(g, f.settings);
  const themeSpec = f.theme || g.theme;
  const theme = resolveTheme(themeSpec);
  const color = MODE_COLORS[f.mode];

  const wheelBase = { mode: f.mode, center: f.center, letters: f.outer };
  const problems = Object.fromEntries(f.words.map(w => [w, f.center ? wordProblem(w, wheelBase) : 'اختر الحرف الأوسط أولاً']));
  const validCount = f.words.filter(w => !problems[w]).length;
  const needsVisual = f.mode === 'picture' ? f.words.filter(w => !bank[w]?.image_url && !bank[w]?.emoji) : [];
  const withoutCard = f.words.filter(w => !bank[w]);
  const customHelp = !!f.settings && Object.keys(f.settings).some(k => k !== 'complete_style');

  const close = () => {
    if (dirty && !readOnly && !confirm('لم تُحفظ تعديلات العجلة — هل تريد الخروج دون حفظ؟')) return;
    onClose();
  };

  /* ── الكلمات ── */
  const addWords = () => {
    const parts = newWords.split(/[\s,،؛;]+/).filter(Boolean);
    const list = normalizeWheelWords(parts).map(w => w.word);
    const fresh = list.filter(w => !f.words.includes(w));
    const ignored = parts.length - list.length;
    if (fresh.length) set('words', [...f.words, ...fresh].slice(0, 80));
    setNewWords('');
    setMsg(ignored > 0 ? { tone: 'warn', text: 'تُقبل الحروف العربية فقط — تجاهلنا ما سواها' }
      : list.length && !fresh.length ? { tone: 'info', text: 'هذه الكلمات موجودة في العجلة بالفعل' } : null);
    wordRef.current?.focus();
  };
  const removeWord = (w) => set('words', f.words.filter(x => x !== w));
  const moveUp = (i) => {
    if (i <= 0) return;
    const a = [...f.words];
    [a[i - 1], a[i]] = [a[i], a[i - 1]];
    set('words', a);
  };

  /* ── الحروف ── */
  const tapKey = (k) => {
    if (target === 'center') { set('center', k); setTarget('outer'); return; }
    if (f.outer.length >= MAX_OUTER_LETTERS) { setMsg({ tone: 'warn', text: `الحروف الخارجية ${MAX_OUTER_LETTERS} على الأكثر` }); return; }
    set('outer', [...f.outer, k]);
  };
  const suggest = () => {
    if (!f.words.length) { setMsg({ tone: 'info', text: 'أضف الكلمات أولاً، ثم نقترح لك الحروف المناسبة ✨' }); return; }
    const s = suggestWheelLetters(f.words);
    let { center, letters } = s;
    if (f.mode === 'challenge') {
      // الأوسط إلزامي في التحدي: حرف تشترك فيه كل الكلمات إن وُجد
      const common = [...new Set(f.words[0])].find(ch => f.words.every(w => w.includes(ch)));
      if (common && common !== center) {
        letters = [...letters, center];
        letters.splice(letters.indexOf(common), 1);
        center = common;
      }
    }
    if (letters.length > MAX_OUTER_LETTERS) {
      setMsg({ tone: 'warn', text: `هذه الكلمات تحتاج حرفاً أوسط + ${letters.length} حروف حوله، والعجلة تتسع لـ${MAX_OUTER_LETTERS} — احذف بعض الكلمات أو وزّعها على عجلتين` });
      return;
    }
    setF(p => ({ ...p, center, outer: shuffled(letters) }));
    setTarget('outer');
    setMsg({ tone: 'ok', text: '✨ اخترنا الحروف التي تكفي لكل الكلمات — أضف حرفاً أو حرفين للتمويه إن شئت' });
  };

  /* ── الإعدادات الخاصة ── */
  const setCompleteStyle = (v) => set('settings', { ...(f.settings || {}), complete_style: v });
  const toggleHelp = (on) => {
    if (on) set('settings', { ...pick(effectiveSettings(g, null), HELP_KEYS[f.mode]), ...(f.settings || {}) });
    else set('settings', f.settings?.complete_style ? { complete_style: f.settings.complete_style } : null);
  };

  /* ── الحفظ ── */
  const payload = () => ({
    name: f.name, mode: f.mode, level: f.level, sort_order: f.sort_order, time_seconds: f.time_seconds, is_active: f.is_active,
    center_letter: f.center, outer_letters: f.outer, valid_words: f.words,
    theme: f.theme, settings: cleanSettings(f.settings, f.mode),
  });
  const problem = !f.name.trim() ? 'اكتب اسماً للعجلة'
    : !f.center ? 'اختر الحرف الأوسط'
    : f.outer.length < 2 ? 'أضف حرفين خارجيين على الأقل'
    : !validCount ? 'أضف كلمة واحدة على الأقل تُكوَّن من حروف العجلة'
    : null;

  const save = async () => {
    if (problem) { setMsg({ tone: 'warn', text: problem }); return; }
    setSaving(true); setMsg(null);
    const res = isNew
      ? await wwApi('/api/word-wheel/configs', { method: 'POST', body: payload() })
      : await wwApi(`/api/word-wheel/configs/${initial.id}`, { method: 'PUT', body: payload() });
    setSaving(false);
    if (!res.ok) {
      if (res.data.need_sql) onNeedSql?.();
      setMsg({ tone: 'error', text: res.data.error || 'تعذّر حفظ العجلة' });
      return;
    }
    onSaved(res.data.config, { created: isNew });
  };

  // نفس شكل العجلة في اللعبة: كلماتها نصوص (كما يرسلها loadGamePayload)
  const playable = useMemo(() => {
    const w = wheelForPlay({ id: 'try', ...payload(), name: f.name || 'تجربة' }, g);
    return w && { ...w, words: w.words.map(x => x.word) };
  }, [f, g]); // eslint-disable-line react-hooks/exhaustive-deps
  const tryCards = useMemo(() => {
    const c = {};
    for (const w of playable?.words || []) c[w] = cardFor(w, bank);
    return c;
  }, [playable, bank]);

  return (
    <Modal wide onClose={close}
      title={readOnly ? `👀 ${initial.name}` : isNew ? (copy ? '📋 نسخة جديدة من العجلة' : '✨ عجلة جديدة') : `✏️ ${initial.name}`}
      footer={<>
        {!readOnly && (
          <button type="button" className="wa-btn" onClick={save} disabled={saving}>
            {saving ? 'جارٍ الحفظ…' : `💾 حفظ العجلة (${validCount} كلمة)`}
          </button>
        )}
        <button type="button" className="wa-btn navy" onClick={() => setTrying(true)} disabled={!playable}>▶️ جرّب العجلة</button>
        <button type="button" className="wa-btn ghost" onClick={close}>{readOnly ? 'إغلاق' : 'إلغاء'}</button>
      </>}>

      {readOnly && <Notice tone="info">هذه العجلة أنشأها معلم آخر — يعدّلها هو أو المشرف. يمكنك تجربتها أو نسخها كعجلة جديدة لك.</Notice>}

      <div className="wa-editor">
        <fieldset disabled={readOnly} style={{ border: 'none', padding: 0, margin: 0, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* النمط والاسم */}
          <div className="wa-section">
            <h4>🎮 نمط اللعب</h4>
            <Choice value={f.mode} onChange={(v) => set('mode', v)}
              options={WW_MODES.map(m => ({ value: m, color: MODE_COLORS[m], label: `${MODE_INFO[m].icon} ${MODE_INFO[m].stage}`, hint: MODE_INFO[m].title }))} />
            <div className="wa-field">
              <span className="wa-label">اسم العجلة (يراه الطفل)</span>
              <input className="wa-input" value={f.name} onChange={e => set('name', e.target.value)} maxLength={60} placeholder={NAME_HINT[f.mode]} dir="rtl" />
            </div>
            {f.mode === 'complete' && (
              <div className="wa-field">
                <span className="wa-label">أسلوب الإكمال</span>
                <Choice value={eff.complete_style} onChange={setCompleteStyle} options={[
                  { value: 'missing', label: '🧩 حرف مخفي', hint: 'مثل: مـ ؟ ـك — الطفل يلمس الحرف الناقص' },
                  { value: 'hint', label: '💡 تلميح نصي', hint: 'مثل: حيوان أليف من 3 حروف' },
                ]} />
              </div>
            )}
            {f.mode === 'challenge' && (
              <>
                <div className="wa-field">
                  <span className="wa-label">المرحلة</span>
                  <Choice value={f.level} onChange={(v) => set('level', v)} options={CHALLENGE_LEVELS.map(l => ({ value: l.id, label: `${l.icon} ${l.label}` }))} />
                </div>
                <div className="wa-field">
                  <span className="wa-label">وقت التحدي</span>
                  <div className="wa-filters">
                    {WHEEL_TIME_OPTIONS.map(t => (
                      <button key={t} type="button" className={`wa-chipbtn${f.time_seconds === t ? ' on' : ''}`} onClick={() => set('time_seconds', t)}>
                        {t ? `⏱️ ${t}ث` : '♾️ بلا وقت'}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* الكلمات */}
          <div className="wa-section">
            <h4>📝 الكلمات المقبولة <small>{validCount} صالحة من {f.words.length}{f.mode === 'challenge' ? ' — كل كلمة تحوي الحرف الأوسط' : ''}</small></h4>
            <div className="wa-row">
              <input ref={wordRef} className="wa-input" style={{ flex: '1 1 200px' }} value={newWords} dir="rtl" lang="ar"
                onChange={e => setNewWords(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addWords(); } }}
                placeholder="اكتب كلمة أو عدة كلمات بينها مسافة: سمك نمر جمل" />
              <button type="button" className="wa-btn" onClick={addWords} disabled={!newWords.trim()}>＋ أضف</button>
            </div>
            {f.words.length === 0 ? (
              <p className="wa-sub">لا كلمات بعد — ابدأ بالكلمات، ثم اضغط «✨ اقترح الحروف» لتُبنى العجلة منها.</p>
            ) : (
              <div className="wa-wordlist">
                {f.words.map((w, i) => {
                  const b = bank[w];
                  const p = problems[w];
                  const noVisual = f.mode === 'picture' && !b?.image_url && !b?.emoji;
                  return (
                    <div key={w} className={`wa-wordrow${p ? ' bad' : ''}`}>
                      <span className="wa-thumb">{b?.image_url ? <img src={b.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : b?.emoji || '🔤'}</span>
                      <div className="wa-wordrow-main">
                        <b lang="ar">{b?.vocalized || w}</b>
                        {p ? <small className="bad">⚠️ {p}</small>
                          : noVisual ? <small className="bad">🖼️ تحتاج صورة أو رمزاً لنمط الصورة</small>
                          : <small>✓ {b ? [b.audio_url && '🔊 نطق', b.definition && '📝 شرح', b.hint && '💡 تلميح'].filter(Boolean).join(' · ') || 'بطاقة بلا نطق ولا شرح' : 'بلا بطاقة تعلّم بعد'}</small>}
                      </div>
                      <button type="button" className="wa-icon-btn" onClick={() => onOpenWord(w)} title="صورة الكلمة ونطقها وشرحها">🃏 {b ? 'البطاقة' : 'أضف بطاقة'}</button>
                      {!eff.shuffle_words && f.mode !== 'challenge' && i > 0 && (
                        <button type="button" className="wa-icon-btn" onClick={() => moveUp(i)} aria-label={`قدّم ${w}`}>▲</button>
                      )}
                      <button type="button" className="wa-icon-btn del" onClick={() => removeWord(w)} aria-label={`احذف ${w}`}>✕</button>
                    </div>
                  );
                })}
              </div>
            )}
            {needsVisual.length > 0 && <Notice tone="warn">في نمط «الصورة» يرى الطفل صورة الكلمة — أضف صورة أو رمزاً لـ: {needsVisual.join('، ')}</Notice>}
            {withoutCard.length > 0 && needsVisual.length === 0 && <p className="wa-sub">💡 {withoutCard.length} كلمة بلا بطاقة تعلّم — أضف لها صورة ونطقاً وشرحاً من زر «🃏».</p>}
          </div>

          {/* الحروف */}
          <div className="wa-section">
            <h4>🔤 حروف العجلة <small>المس الحرف من اللوحة لإضافته</small></h4>
            <div className="wa-row">
              <button type="button" className="wa-btn sm" onClick={suggest}>✨ اقترح الحروف من الكلمات</button>
              <button type="button" className="wa-btn ghost sm" onClick={() => set('outer', shuffled(f.outer))} disabled={f.outer.length < 2}>🔀 خلط الترتيب</button>
              <button type="button" className="wa-btn ghost sm" onClick={() => { setF(p => ({ ...p, center: '', outer: [] })); setTarget('center'); }} disabled={!f.center && !f.outer.length}>🧹 مسح الحروف</button>
            </div>
            <div className="wa-center-slot">
              <button type="button" className={`wa-center-circle${f.center ? ' set' : ''}${target === 'center' ? ' target' : ''}`}
                onClick={() => setTarget('center')} aria-label="الحرف الأوسط">{f.center || '?'}</button>
              <div style={{ flex: 1, minWidth: 160 }}>
                <b style={{ fontSize: '.92rem' }}>👑 الحرف الأوسط {f.mode === 'challenge' ? '(إلزامي في كل كلمة)' : ''}</b>
                <p className="wa-sub">{target === 'center' ? 'المس حرفاً من اللوحة ليصير الأوسط' : 'المس الدائرة لتغييره'}</p>
              </div>
            </div>
            <div className={`wa-outer${target === 'outer' ? ' target' : ''}`} onClick={() => setTarget('outer')} role="group" aria-label="الحروف الخارجية">
              {f.outer.length === 0 && <span className="wa-sub">⭕ الحروف الخارجية تظهر هنا ({MAX_OUTER_LETTERS} على الأكثر)</span>}
              {f.outer.map((l, i) => (
                <span key={`${l}${i}`} className="wa-letter">{l}
                  <button type="button" onClick={(e) => { e.stopPropagation(); set('outer', f.outer.filter((_, j) => j !== i)); }} aria-label={`احذف ${l}`}>✕</button>
                </span>
              ))}
            </div>
            <div className="wa-keys">
              {KEYS.map(k => (
                <button key={k} type="button" className={`wa-key${f.center === k || f.outer.includes(k) ? ' used' : ''}`} onClick={() => tapKey(k)}>{k}</button>
              ))}
            </div>
            <p className="wa-sub">إن تكرّر حرف في كلمة (مثل «ب» في «بابا») أضِفه مرتين — {f.outer.length}/{MAX_OUTER_LETTERS} حروف خارجية.</p>
          </div>

          {/* الظهور والترتيب */}
          <div className="wa-section">
            <h4>👁️ الظهور والترتيب</h4>
            <Toggle checked={f.is_active} onChange={(v) => set('is_active', v)} label="ظاهرة للطلاب" hint="أخفِها مؤقتاً دون حذفها" />
            <div className="wa-field wa-field-row">
              <span className="wa-toggle-text"><b>ترتيب العجلة</b><small>الأصغر يظهر أولاً داخل {f.mode === 'challenge' ? 'مرحلتها' : 'نمطها'}</small></span>
              <Stepper value={f.sort_order} onChange={(v) => set('sort_order', v)} min={0} max={99} />
            </div>
          </div>

          {/* تخصيص */}
          <div className="wa-section">
            <h4>🎨 ألوان خاصة بهذه العجلة</h4>
            <Toggle checked={!!f.theme} onChange={(on) => set('theme', on ? { ...(g.theme || { preset: 'gold', colors: {} }) } : null)}
              label="ألوان مختلفة عن المظهر العام" hint="عند الإيقاف تتبع العجلة «المظهر العام» للعبة" />
            {f.theme && <ThemeEditor value={f.theme} onChange={(v) => set('theme', v)} />}
          </div>

          <div className="wa-section">
            <h4>💡 مساعدة خاصة بهذه العجلة</h4>
            <Toggle checked={customHelp} onChange={toggleHelp} label="إعدادات مساعدة مختلفة عن العامة" hint="مثل: تلميحات أكثر لعجلة صعبة، أو بلا تلميح لعجلة سهلة" />
            {customHelp && (
              <SettingsFields keys={HELP_KEYS[f.mode]} value={eff}
                onChange={(v) => set('settings', { ...(f.settings || {}), ...pick(v, HELP_KEYS[f.mode]) })} />
            )}
          </div>
        </fieldset>

        <div className="wa-preview">
          <span className="wa-label">👀 العجلة كما يراها الطفل</span>
          <div className="wa-preview-box" style={{ background: `linear-gradient(150deg,${theme.bg1},${theme.bg2})` }}>
            {f.center && f.outer.length ? (
              <div style={{ width: '100%', maxWidth: 260 }}>
                <WheelSVG letters={f.outer} center={f.center} theme={theme} centerLabel={f.mode === 'challenge' ? 'إلزامي' : null} />
              </div>
            ) : <p style={{ color: '#fff', fontWeight: 800, textAlign: 'center', margin: '40px 0' }}>اختر الحروف لتظهر العجلة 🎡</p>}
          </div>
          <div className="wa-badges">
            <span className="wa-badge" style={{ background: `${color}18`, color }}>{MODE_INFO[f.mode].icon} {MODE_INFO[f.mode].title}</span>
            <span className={`wa-badge ${validCount ? 'ok' : 'warn'}`}>{validCount} كلمة صالحة</span>
            {f.mode === 'challenge' && <span className="wa-badge muted">{f.time_seconds ? `⏱️ ${f.time_seconds}ث` : '♾️ بلا وقت'}</span>}
            {!f.is_active && <span className="wa-badge muted">🙈 مخفية</span>}
          </div>
          {problem && !readOnly && <Notice tone="warn">{problem}</Notice>}
        </div>
      </div>

      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      {trying && playable && <TryWheel wheel={playable} cards={tryCards} onClose={() => setTrying(false)} />}
    </Modal>
  );
}
