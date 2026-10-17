'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '../../../../../lib/supabase';
import { getRole } from '../../../../../lib/auth-role';
import { wwApi } from '../../../../../lib/word-wheel-client';
import {
  WW_MODES, MODE_INFO, CHALLENGE_LEVELS, normalizeGlobalConfig, normalizeWheelWords, parseLetters,
  wordProblem, resolveTheme, sortWheels, stripWheel,
} from '../../../../../lib/word-wheel';
import WheelSVG from '../../../../../components/WordWheelSVG';
import { WW_CSS } from '../_ui';
import { ADMIN_CSS, MODE_COLORS, SETTING_GROUPS, SettingsFields, Notice, Modal } from './_admin-ui';
import ThemeEditor from './_theme-editor';
import WheelEditor from './_wheel-editor';
import WordEditor from './_word-editor';
import { TRY_CSS } from './_try-wheel';

/* ════════════════════════════════════════════════════════════════
   لوحة إدارة «عجلة الكلمات» — للمعلم والمشرف والمدير، تحكم كامل بلا كود:
   🎡 العجلات بأنماطها الثلاثة · 📚 بطاقات الكلمات (صورة، نطق، شرح، تلميح)
   🎨 المظهر العام (ثيمات جاهزة أو Hex لكل عنصر) · 💡 المساعدة والمكافآت.
   الحالة المشتركة (العجلات، بنك الكلمات، الإعدادات) هنا، والتبويبات تقرؤها.
════════════════════════════════════════════════════════════════ */

const STAFF = ['teacher', 'admin', 'super_admin'];
const TABS = [
  { id: 'wheels', label: '🎡 العجلات' },
  { id: 'words', label: '📚 بطاقات الكلمات' },
  { id: 'theme', label: '🎨 المظهر' },
  { id: 'rules', label: '💡 المساعدة والمكافآت' },
];
const SETTING_KEYS = SETTING_GROUPS.flatMap(g => g.keys);
const wordsOf = (row) => normalizeWheelWords(row?.valid_words).map(w => w.word);

export default function WordWheelAdmin() {
  const [auth, setAuth]       = useState({ loading: true, role: null });
  const [tab, setTab]         = useState('wheels');
  const [configs, setConfigs] = useState(null);
  const [words, setWords]     = useState(null);
  const [saved, setSaved]     = useState(null);   // الإعدادات العامة المحفوظة
  const [draft, setDraft]     = useState(null);   // مسودة تبويبَي المظهر والمساعدة
  const [needSql, setNeedSql] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [toast, setToast]     = useState(null);
  const [filter, setFilter]   = useState('all');
  const [search, setSearch]   = useState('');
  const [allMissing, setAllMissing] = useState(false);
  const [wheelEdit, setWheelEdit] = useState(null); // { initial, mode, copy }
  const [wordEdit, setWordEdit]   = useState(null); // { initial, layer }
  const [confirmDel, setConfirmDel] = useState(null);
  const [busyId, setBusyId]   = useState(null);
  const [savingGlobal, setSavingGlobal] = useState(false);

  const say = useCallback((text, tone = 'ok') => {
    setToast({ text, tone });
    setTimeout(() => setToast(t => (t?.text === text ? null : t)), 3200);
  }, []);

  const load = useCallback(async () => {
    setLoadError(null);
    const [c, w, s] = await Promise.all([
      wwApi('/api/word-wheel/configs'), wwApi('/api/word-wheel/words'), wwApi('/api/word-wheel/settings'),
    ]);
    const sql = [c, w].some(r => r.data?.need_sql);
    setNeedSql(sql);
    // قبل تحديث القاعدة: اللوحة تفتح فارغة مع تنبيه واضح بدل خطأ
    const failed = [c, w].find(r => !r.ok && !r.data?.need_sql);
    if (failed) { setLoadError(failed.data.error || 'تعذّر تحميل اللوحة'); return; }
    setConfigs(c.ok ? c.data.configs || [] : []);
    setWords(w.ok ? w.data.words || [] : []);
    const g = normalizeGlobalConfig(s.ok ? s.data.config : null);
    setSaved(g);
    setDraft(g);
  }, []);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      const role = getRole(data?.user) || null;
      setAuth({ loading: false, role, user: data?.user || null });
      if (STAFF.includes(role)) load();
    }).catch(() => setAuth({ loading: false, role: null }));
  }, [load]);

  const globalDirty = useMemo(() => saved && draft && JSON.stringify(saved) !== JSON.stringify(draft), [saved, draft]);
  useEffect(() => {
    if (!globalDirty) return;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [globalDirty]);

  const bank = useMemo(() => Object.fromEntries((words || []).map(r => [r.word, r])), [words]);
  const usage = useMemo(() => {
    const u = {};
    for (const c of configs || []) for (const w of wordsOf(c)) (u[w] = u[w] || []).push(c.name);
    return u;
  }, [configs]);

  /* ── العجلات ── */
  const onWheelSaved = (row, { created }) => {
    setConfigs(list => sortWheels(created ? [...(list || []), row] : (list || []).map(c => (c.id === row.id ? row : c))));
    setWheelEdit(null);
    say(created ? `✅ أُضيفت «${row.name}»` : `✅ حُفظت «${row.name}»`);
  };
  const toggleActive = async (c) => {
    setBusyId(c.id);
    const { ok, data } = await wwApi(`/api/word-wheel/configs/${c.id}`, { method: 'PUT', body: { is_active: !c.is_active } });
    setBusyId(null);
    if (!ok) { if (data.need_sql) setNeedSql(true); say(data.error || 'تعذّر الحفظ', 'error'); return; }
    setConfigs(list => list.map(x => (x.id === c.id ? data.config : x)));
    say(data.config.is_active ? `👁️ «${c.name}» ظاهرة للطلاب الآن` : `🙈 أُخفيت «${c.name}» عن الطلاب`);
  };
  const deleteWheel = async (c) => {
    setBusyId(c.id);
    const { ok, data } = await wwApi(`/api/word-wheel/configs/${c.id}`, { method: 'DELETE' });
    setBusyId(null);
    setConfirmDel(null);
    if (!ok) { say(data.error || 'تعذّر الحذف', 'error'); return; }
    setConfigs(list => list.filter(x => x.id !== c.id));
    say(`🗑 حُذفت «${c.name}»`);
  };

  /* ── بطاقات الكلمات ── */
  const openWord = (word, layer = 0) => setWordEdit({ initial: bank[word] || { word }, layer });
  const onWordSaved = (row, { stay, created } = {}) => {
    setWords(list => {
      const l = list || [];
      return l.some(r => r.id === row.id) ? l.map(r => (r.id === row.id ? row : r)) : [...l, row].sort((a, b) => a.word.localeCompare(b.word, 'ar'));
    });
    if (!stay) { setWordEdit(null); say(created ? `✅ أُضيفت بطاقة «${row.vocalized || row.word}»` : `✅ حُفظت بطاقة «${row.vocalized || row.word}»`); }
  };
  const onWordDeleted = (row) => {
    setWords(list => (list || []).filter(r => r.id !== row.id));
    setWordEdit(null);
    say(`🗑 حُذفت بطاقة «${row.vocalized || row.word}»`);
  };

  /* ── الإعدادات العامة: كل تبويب يحفظ جزءه فقط فوق المحفوظ ── */
  const saveGlobal = async (part) => {
    const next = part === 'theme' ? { ...saved, theme: draft.theme } : { ...draft, theme: saved.theme };
    setSavingGlobal(true);
    const { ok, data } = await wwApi('/api/word-wheel/settings', { method: 'PUT', body: next });
    setSavingGlobal(false);
    if (!ok) { say(data.error || 'تعذّر حفظ الإعدادات', 'error'); return; }
    const g = normalizeGlobalConfig(data.config);
    setSaved(g);
    setDraft(d => (part === 'theme' ? { ...d, theme: g.theme } : { ...g, theme: d.theme }));
    say(part === 'theme' ? '🎨 حُفظ المظهر — يراه الطلاب عند فتح اللعبة' : '✅ حُفظت إعدادات المساعدة والمكافآت');
  };

  /* ── الحماية ── */
  if (auth.loading) {
    return <div className="wa" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><style dangerouslySetInnerHTML={{ __html: ADMIN_CSS }} /><p style={{ fontWeight: 800 }}>🎡 جارٍ التحميل…</p></div>;
  }
  if (!STAFF.includes(auth.role)) {
    return (
      <div className="wa" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS }} />
        <div className="wa-card" style={{ textAlign: 'center', maxWidth: 420 }}>
          <div style={{ fontSize: 48 }}>🔒</div>
          <h3>إدارة اللعبة للمعلمين والمشرفين</h3>
          <p className="wa-sub">سجّل الدخول بحساب معلم لتعديل العجلات وبطاقات الكلمات.</p>
          <Link href="/library/games/word-wheel" className="wa-btn" style={{ marginTop: 14, textDecoration: 'none' }}>→ العودة للعبة</Link>
        </div>
      </div>
    );
  }

  const ready = configs && words && draft;
  const shown = (configs || []).filter(c => filter === 'all' || (c.mode || 'challenge') === filter);
  const missingCards = Object.keys(usage).filter(w => !bank[w]).sort((a, b) => a.localeCompare(b, 'ar'));
  const q = stripWheel(search).trim();
  const bankShown = (words || []).filter(r => !q || r.word.includes(q) || (r.definition || '').includes(q));

  return (
    <div className="wa">
      <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS + WW_CSS + TRY_CSS }} />
      <header className="wa-head">
        <div className="wa-head-in">
          <div className="wa-head-row">
            <Link href="/library/games/word-wheel" className="wa-link">→ اللعبة</Link>
            <h1>⚙️ إدارة «عجلة الكلمات»</h1>
            <Link href="/library/games/word-wheel" className="wa-link gold" target="_blank">▶️ افتح اللعبة كطالب</Link>
          </div>
          <p>كل ما يراه الطفل تتحكم فيه من هنا: العجلات وأنماطها، بطاقات الكلمات، الألوان، والمساعدة والنقاط.</p>
          <nav className="wa-tabs" role="tablist">
            {TABS.map(t => (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`wa-tab${tab === t.id ? ' on' : ''}`} onClick={() => setTab(t.id)}>
                {t.label}{t.id === 'words' && missingCards.length ? ` ✨${missingCards.length}` : ''}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="wa-main">
        {needSql && (
          <Notice tone="warn">
            🛠️ قاعدة البيانات تحتاج تحديث «عجلة الكلمات» قبل الحفظ: نفّذ الملف <code dir="ltr">lms/supabase/word_wheel_v2.sql</code> في Supabase مرة واحدة.
            اللعبة تعمل للطلاب بعجلات التحدي الأصلية حتى ذلك الحين.
          </Notice>
        )}
        {loadError && <Notice tone="error">{loadError} <button type="button" className="wa-btn sm ghost" onClick={load}>🔄 أعد المحاولة</button></Notice>}
        {!ready && !loadError && <div className="wa-card"><p className="wa-sub">🎡 نجهّز العجلات وبطاقات الكلمات…</p></div>}

        {ready && tab === 'wheels' && (
          <>
            <div className="wa-row">
              <div className="wa-filters">
                <button type="button" className={`wa-chipbtn${filter === 'all' ? ' on' : ''}`} onClick={() => setFilter('all')}>الكل ({configs.length})</button>
                {WW_MODES.map(m => (
                  <button key={m} type="button" className={`wa-chipbtn${filter === m ? ' on' : ''}`} onClick={() => setFilter(m)}>
                    {MODE_INFO[m].icon} {MODE_INFO[m].stage} ({configs.filter(c => (c.mode || 'challenge') === m).length})
                  </button>
                ))}
              </div>
              <span className="wa-spacer" />
              <button type="button" className="wa-btn" onClick={() => setWheelEdit({ initial: null, mode: filter === 'all' ? 'picture' : filter })} disabled={needSql}>＋ عجلة جديدة</button>
            </div>

            {shown.length === 0 && (
              <div className="wa-card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48 }}>🎡</div>
                <p className="wa-sub">لا عجلات في هذا النمط بعد — أضف أول عجلة!</p>
              </div>
            )}

            {WW_MODES.filter(m => filter === 'all' || filter === m).map(m => {
              const list = shown.filter(c => (c.mode || 'challenge') === m);
              if (!list.length) return null;
              const groups = m === 'challenge'
                ? CHALLENGE_LEVELS.map(l => ({ key: l.id, title: `${l.icon} ${l.label}`, items: list.filter(c => (c.level || 1) === l.id) })).filter(x => x.items.length)
                : [{ key: 'all', title: null, items: list }];
              return (
                <section key={m} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <h2 className="wa-group-title" style={{ color: MODE_COLORS[m] }}>
                    {MODE_INFO[m].icon} {MODE_INFO[m].stage}: {MODE_INFO[m].title} <span>{list.length} عجلة</span>
                  </h2>
                  {groups.map(gr => (
                    <div key={gr.key} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {gr.title && <h3 className="wa-group-title" style={{ fontSize: '.92rem' }}>{gr.title}</h3>}
                      <div className="wa-grid">
                        {gr.items.map(c => (
                          <WheelCard key={c.id} c={c} bank={bank} global={saved} busy={busyId === c.id}
                            onEdit={() => setWheelEdit({ initial: c })}
                            onCopy={() => setWheelEdit({ initial: c, copy: true })}
                            onToggle={() => toggleActive(c)}
                            onDelete={() => setConfirmDel(c)} />
                        ))}
                      </div>
                    </div>
                  ))}
                </section>
              );
            })}
          </>
        )}

        {ready && tab === 'words' && (
          <>
            <div className="wa-card">
              <h3>📚 بطاقات التعلّم</h3>
              <p className="wa-sub">
                تظهر البطاقة للطفل عند اكتشاف الكلمة في أي عجلة: الصورة، الكلمة مشكولة، نطقها المسجَّل، وشرح بسيط.
                البطاقة الواحدة تخدم الكلمة في كل العجلات.
              </p>
            </div>
            {missingCards.length > 0 && (
              <div className="wa-card">
                <h3>✨ كلمات في العجلات تنتظر بطاقتها ({missingCards.length})</h3>
                <p className="wa-sub" style={{ marginBottom: 10 }}>تظهر للطفل الآن بالكلمة وحدها — المس الكلمة لتضيف صورتها ونطقها وشرحها.</p>
                <div className="wa-words">
                  {(allMissing ? missingCards : missingCards.slice(0, 24)).map(w => (
                    <button key={w} type="button" className="wa-chipbtn" onClick={() => openWord(w)} disabled={needSql}>＋ {w}</button>
                  ))}
                  {missingCards.length > 24 && (
                    <button type="button" className="wa-chipbtn on" onClick={() => setAllMissing(v => !v)}>
                      {allMissing ? 'عرض أقل' : `عرض الكل (${missingCards.length})`}
                    </button>
                  )}
                </div>
              </div>
            )}
            <div className="wa-row">
              <input className="wa-input" style={{ flex: '1 1 220px', maxWidth: 380 }} value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 ابحث عن كلمة…" dir="rtl" />
              <span className="wa-spacer" />
              <button type="button" className="wa-btn" onClick={() => setWordEdit({ initial: {}, layer: 0 })} disabled={needSql}>＋ بطاقة جديدة</button>
            </div>
            {bankShown.length === 0 ? (
              <div className="wa-card" style={{ textAlign: 'center' }}><p className="wa-sub">{q ? 'لا نتائج لهذا البحث' : 'لا بطاقات بعد — أضف أول بطاقة!'}</p></div>
            ) : (
              <div className="wa-grid">
                {bankShown.map(r => (
                  <button key={r.id} type="button" className="wa-bank-card" onClick={() => setWordEdit({ initial: r, layer: 0 })}>
                    <span className="wa-thumb">{r.image_url ? <img src={r.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : r.emoji || '🔤'}</span>
                    <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <b style={{ fontSize: '1.25rem' }} lang="ar">{r.vocalized || r.word}</b>
                      <span className="wa-badges">
                        <span className={`wa-badge ${r.audio_url ? 'ok' : 'muted'}`}>{r.audio_url ? '🔊 نطق' : 'بلا نطق'}</span>
                        <span className={`wa-badge ${r.definition ? 'ok' : 'muted'}`}>{r.definition ? '📝 شرح' : 'بلا شرح'}</span>
                        {r.hint && <span className="wa-badge ok">💡 تلميح</span>}
                        {usage[r.word] && <span className="wa-badge">🎡 {usage[r.word].length}</span>}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {ready && tab === 'theme' && (
          <div className="wa-card">
            <h3>🎨 المظهر العام للعبة</h3>
            <p className="wa-sub" style={{ marginBottom: 14 }}>ألوان العجلة والخلفية والأزرار لكل العجلات — ويمكن تخصيص أي عجلة بألوانها من محررها.</p>
            <ThemeEditor value={draft.theme} onChange={(theme) => setDraft(d => ({ ...d, theme }))} />
            <div className="wa-row" style={{ marginTop: 16 }}>
              <button type="button" className="wa-btn" onClick={() => saveGlobal('theme')} disabled={savingGlobal || JSON.stringify(draft.theme) === JSON.stringify(saved.theme)}>
                {savingGlobal ? 'جارٍ الحفظ…' : '💾 حفظ المظهر'}
              </button>
              {JSON.stringify(draft.theme) !== JSON.stringify(saved.theme) && (
                <button type="button" className="wa-btn ghost" onClick={() => setDraft(d => ({ ...d, theme: saved.theme }))}>↺ تراجع عن التعديلات</button>
              )}
            </div>
          </div>
        )}

        {ready && tab === 'rules' && (
          <>
            {SETTING_GROUPS.map(gr => (
              <div key={gr.title} className="wa-card">
                <h3>{gr.title}</h3>
                <SettingsFields keys={gr.keys} value={draft} onChange={(v) => setDraft(d => ({ ...d, ...Object.fromEntries(gr.keys.map(k => [k, v[k]])) }))} />
              </div>
            ))}
            <Notice tone="info">
              تُطبَّق هذه الإعدادات على كل العجلات، إلا عجلة لها «مساعدة خاصة» من محررها.
              النقاط يحسبها الخادم من هنا مباشرة — 0 يوقف النقاط.
            </Notice>
            <div className="wa-row">
              <button type="button" className="wa-btn" onClick={() => saveGlobal('rules')}
                disabled={savingGlobal || SETTING_KEYS.every(k => draft[k] === saved[k])}>
                {savingGlobal ? 'جارٍ الحفظ…' : '💾 حفظ المساعدة والمكافآت'}
              </button>
              {SETTING_KEYS.some(k => draft[k] !== saved[k]) && (
                <button type="button" className="wa-btn ghost" onClick={() => setDraft(d => ({ ...saved, theme: d.theme }))}>↺ تراجع عن التعديلات</button>
              )}
            </div>
          </>
        )}
      </main>

      {wheelEdit && (
        <WheelEditor
          key={`${wheelEdit.initial?.id || 'new'}-${wheelEdit.copy ? 'copy' : ''}`}
          initial={wheelEdit.initial} defaultMode={wheelEdit.mode} copy={wheelEdit.copy}
          bank={bank} global={saved}
          onSaved={onWheelSaved} onClose={() => setWheelEdit(null)}
          onOpenWord={(w) => openWord(w, 1)} onNeedSql={() => setNeedSql(true)}
        />
      )}
      {wordEdit && (
        <WordEditor
          key={wordEdit.initial?.id || wordEdit.initial?.word || 'new'}
          initial={wordEdit.initial} layer={wordEdit.layer + 1}
          theme={resolveTheme(saved?.theme)}
          usedIn={usage[wordEdit.initial?.word] || []}
          onSaved={onWordSaved} onDeleted={onWordDeleted} onClose={() => setWordEdit(null)}
        />
      )}
      {confirmDel && (
        <Modal title="🗑 حذف العجلة" layer={2} onClose={() => setConfirmDel(null)}
          footer={<>
            <button type="button" className="wa-btn soft-red" onClick={() => deleteWheel(confirmDel)} disabled={busyId === confirmDel.id}>
              {busyId === confirmDel.id ? 'جارٍ الحذف…' : 'نعم، احذفها نهائياً'}
            </button>
            {confirmDel.is_active && <button type="button" className="wa-btn ghost" onClick={() => { const c = confirmDel; setConfirmDel(null); toggleActive(c); }}>🙈 إخفاؤها فقط</button>}
            <button type="button" className="wa-btn ghost" onClick={() => setConfirmDel(null)}>إلغاء</button>
          </>}>
          <p style={{ margin: 0, lineHeight: 1.9 }}>حذف «<b>{confirmDel.name}</b>» نهائياً؟ بطاقات كلماتها تبقى في بنك الكلمات.
            إن أردت إيقافها مؤقتاً فالأفضل إخفاؤها.</p>
        </Modal>
      )}
      {toast && <div className="wa-toast"><Notice tone={toast.tone}>{toast.text}</Notice></div>}
    </div>
  );
}

/* بطاقة عجلة في القائمة: معاينة صغيرة + الكلمات + الإجراءات */
function WheelCard({ c, bank, global, busy, onEdit, onCopy, onToggle, onDelete }) {
  const mode = c.mode || 'challenge';
  const center = parseLetters(c.center_letter)[0] || '';
  const outer = parseLetters(c.outer_letters);
  const list = wordsOf(c);
  const bad = list.filter(w => wordProblem(w, { mode, center, letters: outer }));
  const noCard = list.filter(w => !bank[w]);
  const theme = resolveTheme(c.theme || global?.theme);
  const color = MODE_COLORS[mode];
  return (
    <div className={`wa-wheel${c.is_active ? '' : ' hidden'}`}>
      <div className="wa-wheel-top" style={{ background: `linear-gradient(150deg,${theme.bg1},${theme.bg2})` }}>
        <div className="wa-mini">{center && outer.length >= 2 ? <WheelSVG letters={outer} center={center} theme={theme} centerLabel={null} disabled /> : null}</div>
        <div style={{ minWidth: 0 }}>
          <div className="wa-wheel-name">{c.name}</div>
          <div className="wa-wheel-meta">{MODE_INFO[mode].icon} {MODE_INFO[mode].title}{mode === 'challenge' ? ` · ${c.time_seconds ? `${c.time_seconds}ث` : 'بلا وقت'}` : ''}</div>
        </div>
      </div>
      <div className="wa-wheel-body">
        <div className="wa-words">
          {list.slice(0, 8).map(w => <span key={w} className={`wa-word${bad.includes(w) ? ' bad' : ''}`}>{bank[w]?.emoji || ''}{w}</span>)}
          {list.length > 8 && <span className="wa-sub">+{list.length - 8}</span>}
          {!list.length && <span className="wa-sub">لا كلمات بعد</span>}
        </div>
        <div className="wa-badges">
          <span className="wa-badge" style={{ background: `${color}18`, color }}>{list.length - bad.length} كلمة صالحة</span>
          {bad.length > 0 && <span className="wa-badge warn">⚠️ {bad.length} تحتاج مراجعة</span>}
          {noCard.length > 0 && <span className="wa-badge muted">🃏 {noCard.length} بلا بطاقة</span>}
          {!c.is_active && <span className="wa-badge muted">🙈 مخفية</span>}
          {(c.theme || c.settings) && <span className="wa-badge">✨ مخصّصة</span>}
        </div>
      </div>
      <div className="wa-wheel-actions">
        <button type="button" className="wa-btn sm" onClick={onEdit}>{c.can_edit === false ? '👀 عرض' : '✏️ تعديل'}</button>
        <button type="button" className="wa-btn ghost sm" onClick={onCopy} title="نسخة جديدة منها">📋 نسخ</button>
        {c.can_edit !== false && (
          <button type="button" className="wa-btn ghost sm" onClick={onToggle} disabled={busy}>{c.is_active ? '🙈 إخفاء' : '👁️ إظهار'}</button>
        )}
        {c.can_delete && <button type="button" className="wa-btn ghost sm" onClick={onDelete} disabled={busy} aria-label={`حذف ${c.name}`}>🗑</button>}
      </div>
    </div>
  );
}
