'use client';
import { useEffect, useState } from 'react';
import { HUROOF_COUNT, huroofTarget } from '../../../lib/huroof';
import { checkSpelling, SPELL_KIND_LABELS } from '../../../lib/huroof-spell';

/* ════════════════════════════════════════════════════════════════
   لوحة تحكم تحدّي «الحروف الهجائية» — للمعلم والمدير فقط (تُحمَّل عند فتحها)
   ⚙️ الإعدادات: الوضع، المسار، الخلط، القفل، «ساعدني»، «ال»، إظهار الكلمة بعد N محاولات،
      وإعادة ضبط مسار الجميع أو مسارك أنت.
   🧩 الألغاز والإملاء: الحروف الـ28 بألغازها وإجاباتها وقواعدها + مختبر المدقق.
   👧 تقدّم الطلاب: من بدأ الجولة وكم حلّ، وإعادة ضبط طالب.
════════════════════════════════════════════════════════════════ */

const GOLD = '#E8B84B', NAVY = '#1A2B4A', SAND = '#EDE5D8';
const BTN = { minHeight: 44, borderRadius: 12, padding: '8px 14px', fontFamily: 'inherit', fontWeight: 800, fontSize: '.88rem', cursor: 'pointer' };
const BTN_GOLD = { ...BTN, border: 'none', background: GOLD, color: NAVY };
const BTN_LIGHT = { ...BTN, border: `2px solid ${SAND}`, background: '#fff', color: NAVY };
const BTN_WARN = { ...BTN, border: '2px solid #F1DFB8', background: '#FFF6E7', color: '#8A6412' };
const CARD = { background: '#FAF7F2', border: `2px solid ${SAND}`, borderRadius: 14, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 };

const TOGGLES = [
  ['show_path', '🐘 إظهار مسار فهيم (28 محطة على يسار الشاشة)'],
  ['shuffle', '🔀 خلط البطاقات (ترتيب ثابت لكل طالب في الجولة)'],
  ['lock_current', '🔒 لا تُفتح بطاقة جديدة قبل حلّ اللغز المفتوح'],
  ['hints', '💡 زر «ساعدني»: الصورة ← أول حرف وعدد الحروف ← الكلمة كاملة'],
  ['accept_al', '✅ قبول الكلمة مع «ال» (الأسد = أسد)'],
];

function Switch({ on, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} style={{
      display: 'flex', alignItems: 'center', gap: 10, width: '100%', minHeight: 48, padding: '6px 10px', borderRadius: 12,
      border: `2px solid ${on ? '#BFE9D4' : SAND}`, background: on ? '#E9F8F1' : '#fff', cursor: 'pointer',
      fontFamily: 'inherit', fontWeight: 700, fontSize: '.88rem', color: NAVY, textAlign: 'right',
    }}>
      <span aria-hidden="true" style={{ width: 44, height: 26, borderRadius: 99, background: on ? '#2ABB7A' : '#CBD5E1', position: 'relative', flexShrink: 0, transition: 'background .2s' }}>
        <span style={{ position: 'absolute', top: 3, [on ? 'left' : 'right']: 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.25)' }} />
      </span>
      <span style={{ flex: 1 }}>{label}</span>
    </button>
  );
}

export default function HuroofAdmin({ letters, settings, onSettings, onEdit, onProgressChanged, onClose }) {
  const [tab, setTab] = useState('settings');
  const [form, setForm] = useState(settings);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [labIdx, setLabIdx] = useState(0);
  const [labText, setLabText] = useState('');
  const [students, setStudents] = useState(null);

  useEffect(() => { setForm(settings); }, [settings]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const loadStudents = () => fetch(`/api/huroof/progress?students=1&t=${Date.now()}`, { cache: 'no-store' })
    .then(r => r.json()).then(j => setStudents(j.students || [])).catch(() => setStudents([]));
  useEffect(() => { if (tab === 'students' && students === null) loadStudents(); }, [tab, students]);

  async function call(url, method, body, okText) {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'تعذّر الحفظ');
      if (j.settings) onSettings(j.settings);
      setMsg({ ok: true, text: okText });
      return j;
    } catch (e) {
      setMsg({ ok: false, text: `❌ ${e.message} — حاول مرة أخرى` });
      return null;
    } finally { setBusy(false); }
  }
  const dirty = ['mode', ...TOGGLES.map(t => t[0]), 'reveal_after'].some(k => form[k] !== settings[k]);
  const save = () => call('/api/huroof/settings', 'PUT', {
    mode: form.mode, show_path: form.show_path, shuffle: form.shuffle, lock_current: form.lock_current,
    hints: form.hints, accept_al: form.accept_al, reveal_after: form.reveal_after,
  }, '✅ حُفظت الإعدادات — يراها الطلاب فوراً');
  const resetAll = async () => {
    if (!confirm('بدء جولة جديدة: يرجع مسار كل الطلاب إلى أوله وتُغلق كل البطاقات من جديد. (النقاط التي كسبوها تبقى لهم.) متابعة؟')) return;
    if (await call('/api/huroof/settings', 'POST', { action: 'reset_all' }, '✅ بدأت جولة جديدة لكل الطلاب')) { setStudents(null); onProgressChanged(); }
  };
  const resetMe = async () => {
    if (!confirm('إعادة ضبط مسارك أنت (للتجربة)؟')) return;
    if (await call('/api/huroof/progress', 'DELETE', { scope: 'me' }, '✅ أُعيد ضبط مسارك')) onProgressChanged();
  };
  const resetStudent = async (s) => {
    if (!confirm(`إعادة ضبط مسار «${s.name}»؟ تُغلق بطاقاته ويبدأ من أول المسار.`)) return;
    if (await call('/api/huroof/progress', 'DELETE', { scope: 'user', user_id: s.user_id }, `✅ أُعيد ضبط مسار ${s.name}`)) { loadStudents(); onProgressChanged(); }
  };

  const lab = labText.trim() ? checkSpelling(labText, huroofTarget(letters[labIdx]), { allowAl: form.accept_al }) : null;
  const tabBtn = (id, label) => (
    <button key={id} type="button" onClick={() => setTab(id)} aria-pressed={tab === id} style={{
      ...BTN, flex: 1, border: 'none', background: tab === id ? NAVY : '#F1F5F9', color: tab === id ? '#fff' : NAVY,
    }}>{label}</button>
  );

  return (
    <div onClick={() => !busy && onClose()} style={{
      position: 'fixed', inset: 0, zIndex: 1300, background: 'rgba(15,23,42,.55)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 12, fontFamily: "'Cairo','Tajawal',sans-serif",
    }}>
      <div dir="rtl" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="لوحة تحكم تحدي الحروف" style={{
        background: '#fff', borderRadius: 22, width: '100%', maxWidth: 640, maxHeight: '92dvh', overflowY: 'auto', boxSizing: 'border-box',
        boxShadow: '0 16px 48px rgba(0,0,0,.3)', padding: '16px 16px calc(16px + env(safe-area-inset-bottom, 0px))',
        display: 'flex', flexDirection: 'column', gap: 12, color: NAVY,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900 }}>⚙️ لوحة تحكم تحدّي الحروف</h3>
          <button type="button" onClick={onClose} aria-label="إغلاق" style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', background: '#f1f5f9', fontSize: '1.1rem', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {tabBtn('settings', '⚙️ الإعدادات')}{tabBtn('puzzles', '🧩 الألغاز والإملاء')}{tabBtn('students', '👧 تقدّم الطلاب')}
        </div>

        {msg && (
          <div role="status" style={{
            borderRadius: 10, padding: '8px 12px', fontSize: '.85rem', fontWeight: 700,
            background: msg.ok ? '#ecfdf5' : '#FFF6E7', color: msg.ok ? '#065f46' : '#8A6412', border: `1.5px solid ${msg.ok ? '#86efac' : '#F1DFB8'}`,
          }}>{msg.text}</div>
        )}

        {tab === 'settings' && (
          <>
            <div style={CARD}>
              <b style={{ fontSize: '.9rem' }}>وضع التدريب</b>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[['challenge', '🧩 تحدّي فهيم', 'بطاقات مغلقة ومخلوطة، لغز وإملاء'], ['explore', '🔤 استكشاف', 'الحروف مكشوفة ومرتبة (القديم)']].map(([id, t, d]) => (
                  <button key={id} type="button" onClick={() => setForm(f => ({ ...f, mode: id }))} aria-pressed={form.mode === id} style={{
                    ...BTN, minHeight: 72, display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', justifyContent: 'center',
                    border: `2.5px solid ${form.mode === id ? '#7C5CD9' : SAND}`, background: form.mode === id ? '#F3EFFF' : '#fff', color: NAVY,
                  }}><span>{t}</span><small style={{ fontWeight: 600, fontSize: '.74rem', color: '#64748b' }}>{d}</small></button>
                ))}
              </div>
            </div>
            <div style={{ ...CARD, opacity: form.mode === 'challenge' ? 1 : .55 }}>
              {TOGGLES.map(([k, label]) => <Switch key={k} on={form[k]} label={label} onChange={v => setForm(f => ({ ...f, [k]: v }))} />)}
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: '.88rem', flexWrap: 'wrap' }}>
                👀 إظهار الكلمة كاملة لينسخها الطفل بعد
                <select value={form.reveal_after} onChange={e => setForm(f => ({ ...f, reveal_after: Number(e.target.value) }))}
                  style={{ minHeight: 44, borderRadius: 10, border: `2px solid ${SAND}`, fontFamily: 'inherit', fontWeight: 700, padding: '0 8px' }}>
                  <option value={0}>أبداً</option>
                  {[2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} محاولات خاطئة</option>)}
                </select>
              </label>
            </div>
            <button type="button" onClick={save} disabled={busy || !dirty} style={{ ...BTN_GOLD, minHeight: 52, fontSize: '1rem', opacity: busy || !dirty ? .6 : 1 }}>
              {busy ? '⏳ جارٍ الحفظ…' : dirty ? '💾 حفظ الإعدادات' : '✅ الإعدادات محفوظة'}
            </button>
            <div style={CARD}>
              <b style={{ fontSize: '.9rem' }}>إعادة ضبط المسار</b>
              <span style={{ fontSize: '.8rem', color: '#64748b', lineHeight: 1.8 }}>الجولة الحالية: {settings.epoch + 1}. النقاط التي كسبها الطلاب تبقى لهم، ولا تُمنح مرتين للحرف نفسه.</span>
              <button type="button" onClick={resetAll} disabled={busy} style={BTN_WARN}>🔄 جولة جديدة لجميع الطلاب (تُغلق كل البطاقات)</button>
              <button type="button" onClick={resetMe} disabled={busy} style={BTN_LIGHT}>↩️ إعادة ضبط مساري أنا (للتجربة)</button>
              <span style={{ fontSize: '.78rem', color: '#64748b' }}>ولإعادة ضبط طالب واحد: تبويب «تقدّم الطلاب».</span>
            </div>
          </>
        )}

        {tab === 'puzzles' && (
          <>
            <div style={CARD}>
              <b style={{ fontSize: '.9rem' }}>🧪 مختبر المدقق — جرّب ما قد يكتبه الطفل</b>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <select value={labIdx} onChange={e => setLabIdx(Number(e.target.value))} aria-label="الحرف"
                  style={{ minHeight: 46, maxWidth: '100%', borderRadius: 10, border: `2px solid ${SAND}`, fontFamily: 'inherit', fontWeight: 700, padding: '0 8px' }}>
                  {letters.map((l, i) => <option key={i} value={i}>{l.l} — {l.word}</option>)}
                </select>
                <input value={labText} onChange={e => setLabText(e.target.value)} placeholder="اكتب كما يكتب الطفل: اسد، تفاحه…" dir="rtl"
                  style={{ flex: '1 1 180px', minWidth: 0, width: '100%', boxSizing: 'border-box', minHeight: 46, borderRadius: 10, border: `2px solid ${SAND}`, fontFamily: 'var(--font-naskh), serif', fontSize: '1.2rem', padding: '0 10px' }} />
              </div>
              {lab && (
                <div style={{ borderRadius: 12, padding: '8px 12px', background: lab.ok ? '#E9F8F1' : '#F3EFFF', border: `2px solid ${lab.ok ? '#BFE9D4' : '#D9CCFF'}`, lineHeight: 1.8 }}>
                  {lab.ok ? <b>✅ مقبولة — يُكشف الحرف</b> : (
                    <>
                      <b style={{ fontSize: '.8rem', color: '#7C5CD9' }}>{SPELL_KIND_LABELS[lab.kind] || lab.kind}</b>
                      <div style={{ fontFamily: 'var(--font-naskh), serif', fontWeight: 700, fontSize: '1.05rem' }}>فهيم: {lab.msg}</div>
                      {lab.tip && <small style={{ color: '#52627E', fontWeight: 700 }}>💡 {lab.tip}</small>}
                    </>
                  )}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {letters.map((l, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, border: `2px solid ${SAND}`, borderRadius: 12, padding: '6px 10px' }}>
                  <span style={{ width: 38, height: 38, borderRadius: 10, background: NAVY, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: '1.3rem', flexShrink: 0 }}>{l.l}</span>
                  <div style={{ flex: 1, minWidth: 0, fontSize: '.8rem', lineHeight: 1.6 }}>
                    <div style={{ fontWeight: 900, fontSize: '.92rem' }}>
                      {l.answer} <span style={{ color: '#94a3b8', fontWeight: 600 }}>{l.accept.length ? `· يقبل أيضاً: ${l.accept.join('، ')}` : ''}</span>
                    </div>
                    <div style={{ color: '#52627E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {l.riddle || '— بلا لغز: يُسأل الطفل عن الصورة'}
                    </div>
                    <div style={{ color: '#94a3b8' }}>
                      {l.rules.length} قاعدة{l.riddle_audio_url ? ' · 🔊 لغز مسجّل' : ''}{(l.custom.riddle || l.custom.answer || l.custom.accept || l.custom.rules) ? ' · ✏️ معدّل' : ''}
                    </div>
                  </div>
                  <button type="button" onClick={() => onEdit(i)} style={{ ...BTN_LIGHT, flexShrink: 0 }}>✏️ تعديل</button>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'students' && (
          <>
            <span style={{ fontSize: '.82rem', color: '#64748b' }}>الطلاب الذين بدؤوا الجولة الحالية ({settings.epoch + 1}) — الأكثر تقدّماً أولاً.</span>
            {students === null ? <div style={{ textAlign: 'center', padding: 20, color: '#64748b' }}>⏳ جارٍ التحميل…</div>
              : !students.length ? <div style={{ textAlign: 'center', padding: 20, color: '#64748b', fontWeight: 700 }}>لم يحلّ أي طالب لغزاً في هذه الجولة بعد.</div>
                : students.map(s => (
                  <div key={s.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, border: `2px solid ${SAND}`, borderRadius: 12, padding: '8px 10px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 900 }}>{s.name}</div>
                      <div style={{ height: 8, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden', margin: '4px 0' }}>
                        <div style={{ height: '100%', width: `${(s.solved / HUROOF_COUNT) * 100}%`, background: 'linear-gradient(90deg,#E8B84B,#1a7c40)' }} />
                      </div>
                      <div style={{ fontSize: '.75rem', color: '#64748b' }}>{s.solved} / {HUROOF_COUNT} · آخر حلّ {new Date(s.last_at).toLocaleDateString('ar')}</div>
                    </div>
                    <button type="button" onClick={() => resetStudent(s)} disabled={busy} style={{ ...BTN_WARN, flexShrink: 0 }}>↺ إعادة ضبط</button>
                  </div>
                ))}
          </>
        )}
      </div>
    </div>
  );
}
