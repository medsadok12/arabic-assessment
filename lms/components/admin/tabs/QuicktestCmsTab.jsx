'use client';
import { useState, useEffect } from 'react';

/*
  لوحة إدارة "اختبار تحديد المستوى" التسويقي — ذاتية الاكتفاء (بلا props)،
  بنفس نمط LeadsTab.jsx/AnalyticsTab.jsx (حالتها الخاصة، جلبها الخاص).
  خمسة أقسام داخلية: الأسئلة (CRUD + ترتيب بأزرار ▲▼ + رفع وسائط حقيقي)،
  المستويات (حدود النقاط والنصوص الوصفية)، رسالة واتساب، تمرين الحروف
  الافتتاحي (تفعيل/عنوان/نص فرعي + إدارة الحروف الـ28 نفسها)، وتدريبا
  المطابقة (تفعيل/عنوان/نص فرعي + أزواج الصور-الكلمات لكل تدريب على حدة).
  عند أي فشل في القراءة هنا، الموقع العام (assessment.aarem.net/?quick=1)
  يسقط تلقائياً لمحتوى blueprint.js/matchingData.js الثابت — راجع
  fetchQuicktestData.js.
*/

async function uploadMedia(file, kind) {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`/api/bogga/quicktest-questions/upload?kind=${kind}`, { method: 'POST', body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'فشل رفع الملف');
  return data.url;
}

const EMPTY_QUESTION = {
  question_text: '', image_url: null, audio_url: null, prompt_emoji: '', audio_prompt: '',
  reading_text: '', parent_read_hint: false, skill_tag: '',
  options: [{ text: '', correct: true }, { text: '', correct: false }, { text: '', correct: false }],
  enabled: true,
};

export default function QuicktestCmsTab() {
  const [subTab, setSubTab] = useState('questions'); // questions | levels | settings

  const [questions, setQuestions] = useState(null);
  const [levels,    setLevels]    = useState(null);
  const [settings,  setSettings]  = useState(null);
  const [error,     setError]     = useState(null);

  const [editingQ, setEditingQ] = useState(null); // { id?, ...EMPTY_QUESTION } أو null
  const [previewQ, setPreviewQ] = useState(null); // معاينة سؤال واحد فقط، بلا تعديل
  const [qSaving,  setQSaving]  = useState(false);
  const [qMsg,     setQMsg]     = useState(null);
  const [uploading, setUploading] = useState(null); // 'image' | 'audio' | null

  const [editingLevel, setEditingLevel] = useState(null);
  const [lSaving, setLSaving] = useState(false);
  const [lMsg,    setLMsg]    = useState(null);

  const [waTemplate, setWaTemplate] = useState('');
  const [waSaving,   setWaSaving]   = useState(false);
  const [waMsg,      setWaMsg]      = useState(null);

  const [letters, setLetters] = useState(null);
  const [alphaEnabled,  setAlphaEnabled]  = useState(true);
  const [alphaTitle,    setAlphaTitle]    = useState('');
  const [alphaSubtitle, setAlphaSubtitle] = useState('');
  const [alphaSaving,   setAlphaSaving]   = useState(false);
  const [alphaMsg,      setAlphaMsg]      = useState(null);
  const [newLetter,     setNewLetter]     = useState('');
  const [letterSaving,  setLetterSaving]  = useState(null); // id الحرف الجاري حفظه/حذفه

  const [matchingSettings, setMatchingSettings] = useState(null); // [{exercise_key,...}, ...]
  const [matchingPairs,    setMatchingPairs]    = useState(null); // كل الأزواج، كلا التدريبين معاً
  const [pairSaving,       setPairSaving]       = useState(null); // id الزوج الجاري حفظه/حذفه، أو 'new:<exercise_key>'
  const [newPairInputs,    setNewPairInputs]    = useState({ 'matching-1': { emoji: '', word: '' }, 'matching-2': { emoji: '', word: '' } });

  function loadAll() {
    Promise.all([
      fetch('/api/bogga/quicktest-questions').then(r => r.json()),
      fetch('/api/bogga/quicktest-levels').then(r => r.json()),
      fetch('/api/bogga/quicktest-settings').then(r => r.json()),
      fetch('/api/bogga/quicktest-alphabet').then(r => r.json()),
      fetch('/api/bogga/quicktest-matching-settings').then(r => r.json()),
      fetch('/api/bogga/quicktest-matching').then(r => r.json()),
    ]).then(([q, l, s, a, ms, mp]) => {
      if (q.error || l.error || s.error || a.error || ms.error || mp.error) {
        setError(q.error || l.error || s.error || a.error || ms.error || mp.error); return;
      }
      setQuestions(q.questions);
      setLevels(l.levels);
      setSettings(s.settings);
      setWaTemplate(s.settings?.whatsapp_template ?? '');
      setAlphaEnabled(s.settings?.alphabet_enabled ?? true);
      setAlphaTitle(s.settings?.alphabet_title ?? '');
      setAlphaSubtitle(s.settings?.alphabet_subtitle ?? '');
      setLetters(a.letters);
      setMatchingSettings(ms.settings);
      setMatchingPairs(mp.pairs);
    }).catch(() => setError('تعذّر تحميل بيانات لوحة الاختبار الترويجي'));
  }

  useEffect(loadAll, []);

  // ── الأسئلة ────────────────────────────────────────────────────────────
  async function moveQuestion(q, dir) {
    const idx = questions.findIndex(x => x.id === q.id);
    const j = idx + dir;
    if (j < 0 || j >= questions.length) return;
    const other = questions[j];
    const res = await fetch('/api/bogga/quicktest-questions/reorder', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ id: q.id, order_index: other.order_index }, { id: other.id, order_index: q.order_index }] }),
    });
    if (res.ok) {
      const next = [...questions];
      [next[idx], next[j]] = [next[j], next[idx]];
      const tmp = next[idx].order_index; next[idx].order_index = next[j].order_index; next[j].order_index = tmp;
      setQuestions(next.sort((a, b) => a.order_index - b.order_index));
    }
  }

  async function toggleEnabled(q) {
    const res = await fetch(`/api/bogga/quicktest-questions/${q.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !q.enabled }),
    });
    if (res.ok) setQuestions(prev => prev.map(x => x.id === q.id ? { ...x, enabled: !q.enabled } : x));
  }

  async function deleteQuestion(id) {
    if (!confirm('هل تريد حذف هذا السؤال نهائياً؟')) return;
    const res = await fetch(`/api/bogga/quicktest-questions/${id}`, { method: 'DELETE' });
    if (res.ok) setQuestions(prev => prev.filter(x => x.id !== id));
  }

  async function saveQuestion(e) {
    e.preventDefault();
    setQSaving(true); setQMsg(null);
    try {
      const isEdit = !!editingQ.id;
      const body = { ...editingQ };
      delete body.id;
      const res = await fetch(isEdit ? `/api/bogga/quicktest-questions/${editingQ.id}` : '/api/bogga/quicktest-questions', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل الحفظ');
      if (isEdit) setQuestions(prev => prev.map(x => x.id === editingQ.id ? data.question : x));
      else setQuestions(prev => [...prev, data.question]);
      setEditingQ(null);
    } catch (err) {
      setQMsg({ ok: false, text: '❌ ' + err.message });
    }
    setQSaving(false);
  }

  async function handleMediaUpload(file, kind) {
    setUploading(kind); setQMsg(null);
    try {
      const url = await uploadMedia(file, kind);
      setEditingQ(prev => ({ ...prev, [kind === 'image' ? 'image_url' : 'audio_url']: url }));
    } catch (err) {
      setQMsg({ ok: false, text: '❌ ' + err.message });
    }
    setUploading(null);
  }

  // ── المستويات ──────────────────────────────────────────────────────────
  async function saveLevel(e) {
    e.preventDefault();
    setLSaving(true); setLMsg(null);
    try {
      const res = await fetch('/api/bogga/quicktest-levels', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingLevel),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل الحفظ');
      setLevels(prev => prev.map(x => x.id === editingLevel.id ? data.level : x));
      setEditingLevel(null);
    } catch (err) {
      setLMsg({ ok: false, text: '❌ ' + err.message });
    }
    setLSaving(false);
  }

  // ── الإعدادات ──────────────────────────────────────────────────────────
  async function saveSettings() {
    setWaSaving(true); setWaMsg(null);
    try {
      const res = await fetch('/api/bogga/quicktest-settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp_template: waTemplate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل الحفظ');
      setWaMsg({ ok: true, text: '✅ تم الحفظ' });
    } catch (err) {
      setWaMsg({ ok: false, text: '❌ ' + err.message });
    }
    setWaSaving(false);
  }

  // ── تمرين الحروف الافتتاحي ────────────────────────────────────────────
  async function saveAlphabetSettings() {
    setAlphaSaving(true); setAlphaMsg(null);
    try {
      const res = await fetch('/api/bogga/quicktest-settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alphabet_enabled: alphaEnabled, alphabet_title: alphaTitle, alphabet_subtitle: alphaSubtitle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل الحفظ');
      setAlphaMsg({ ok: true, text: '✅ تم الحفظ' });
    } catch (err) {
      setAlphaMsg({ ok: false, text: '❌ ' + err.message });
    }
    setAlphaSaving(false);
  }

  async function moveLetter(letter, dir) {
    const idx = letters.findIndex(x => x.id === letter.id);
    const j = idx + dir;
    if (j < 0 || j >= letters.length) return;
    const other = letters[j];
    const res = await fetch('/api/bogga/quicktest-alphabet/reorder', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ id: letter.id, order_index: other.order_index }, { id: other.id, order_index: letter.order_index }] }),
    });
    if (res.ok) {
      const next = [...letters];
      [next[idx], next[j]] = [next[j], next[idx]];
      const tmp = next[idx].order_index; next[idx].order_index = next[j].order_index; next[j].order_index = tmp;
      setLetters(next.sort((a, b) => a.order_index - b.order_index));
    }
  }

  async function updateLetterText(id, text) {
    setLetterSaving(id);
    const res = await fetch(`/api/bogga/quicktest-alphabet/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ letter: text }),
    });
    if (res.ok) {
      const data = await res.json();
      setLetters(prev => prev.map(x => x.id === id ? data.letter : x));
    }
    setLetterSaving(null);
  }

  async function toggleLetterEnabled(letter) {
    const res = await fetch(`/api/bogga/quicktest-alphabet/${letter.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !letter.enabled }),
    });
    if (res.ok) setLetters(prev => prev.map(x => x.id === letter.id ? { ...x, enabled: !letter.enabled } : x));
  }

  async function deleteLetter(id) {
    if (!confirm('هل تريد حذف هذا الحرف نهائياً؟')) return;
    setLetterSaving(id);
    const res = await fetch(`/api/bogga/quicktest-alphabet/${id}`, { method: 'DELETE' });
    if (res.ok) setLetters(prev => prev.filter(x => x.id !== id));
    setLetterSaving(null);
  }

  async function addLetter(e) {
    e.preventDefault();
    if (!newLetter.trim()) return;
    setLetterSaving('new');
    try {
      const res = await fetch('/api/bogga/quicktest-alphabet', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ letter: newLetter.trim() }),
      });
      const data = await res.json();
      if (res.ok) { setLetters(prev => [...prev, data.letter]); setNewLetter(''); }
    } finally {
      setLetterSaving(null);
    }
  }

  // ── تدريبا المطابقة ────────────────────────────────────────────────────
  async function saveMatchingSettings(exercise_key, patch) {
    const res = await fetch('/api/bogga/quicktest-matching-settings', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exercise_key, ...patch }),
    });
    const data = await res.json();
    if (res.ok) setMatchingSettings(prev => prev.map(s => s.exercise_key === exercise_key ? data.settings : s));
    return { ok: res.ok, error: data.error };
  }

  async function moveMatchingPair(pair, dir) {
    const siblings = matchingPairs.filter(p => p.exercise_key === pair.exercise_key);
    const idx = siblings.findIndex(x => x.id === pair.id);
    const j = idx + dir;
    if (j < 0 || j >= siblings.length) return;
    const other = siblings[j];
    const res = await fetch('/api/bogga/quicktest-matching/reorder', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ id: pair.id, order_index: other.order_index }, { id: other.id, order_index: pair.order_index }] }),
    });
    if (res.ok) {
      setMatchingPairs(prev => prev.map(p => {
        if (p.id === pair.id) return { ...p, order_index: other.order_index };
        if (p.id === other.id) return { ...p, order_index: pair.order_index };
        return p;
      }));
    }
  }

  async function updateMatchingPair(id, patch) {
    setPairSaving(id);
    const res = await fetch(`/api/bogga/quicktest-matching/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const data = await res.json();
      setMatchingPairs(prev => prev.map(p => p.id === id ? data.pair : p));
    }
    setPairSaving(null);
  }

  async function deleteMatchingPair(id) {
    if (!confirm('هل تريد حذف هذا الزوج نهائياً؟')) return;
    setPairSaving(id);
    const res = await fetch(`/api/bogga/quicktest-matching/${id}`, { method: 'DELETE' });
    if (res.ok) setMatchingPairs(prev => prev.filter(p => p.id !== id));
    setPairSaving(null);
  }

  async function addMatchingPair(exercise_key) {
    const input = newPairInputs[exercise_key];
    if (!input.emoji.trim() || !input.word.trim()) return;
    setPairSaving(`new:${exercise_key}`);
    try {
      const res = await fetch('/api/bogga/quicktest-matching', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exercise_key, emoji: input.emoji.trim(), word: input.word.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setMatchingPairs(prev => [...prev, data.pair]);
        setNewPairInputs(prev => ({ ...prev, [exercise_key]: { emoji: '', word: '' } }));
      }
    } finally {
      setPairSaving(null);
    }
  }

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!questions || !levels || !letters || !matchingSettings || !matchingPairs) return <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 6 }}>
        <h2 style={{ fontWeight: 800, color: 'var(--primary)' }}>🛠️ إدارة الاختبار الترويجي</h2>
        <a
          href="https://assessment.aarem.net/?quick=1&admin_preview=1"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary btn-sm"
          style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}
        >
          🚀 جرّب الاختبار فعلياً
        </a>
      </div>
      <p style={{ color: 'var(--muted)', fontSize: '.85rem', marginBottom: 6 }}>
        يتحكم هذا التبويب باختبار "تحديد المستوى" المجاني المنشور على assessment.aarem.net/?quick=1 — عند أي فشل هنا، يعرض الموقع العام تلقائياً نسخة احتياطية ثابتة، فلا يتعطل أمام الزوار.
      </p>
      <p style={{ color: 'var(--muted)', fontSize: '.78rem', marginBottom: 20 }}>
        يفتح زر "🚀 جرّب الاختبار فعلياً" التطبيق الحيّ مباشرة على الأسئلة (بلا نموذج بيانات ولا بوابة تواصل) — لا يُحفَظ أو يُرسَل أي شيء منه، تجربة معاينة بحتة.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 22, borderBottom: '1.5px solid var(--border)', paddingBottom: 4 }}>
        {[
          { id: 'questions', label: `📝 الأسئلة (${questions.length})` },
          { id: 'levels',    label: '⚙️ المستويات' },
          { id: 'settings',  label: '📱 رسالة واتساب' },
          { id: 'alphabet',  label: `🔤 تمرين الحروف (${letters.length})` },
          { id: 'matching',  label: `🔗 تدريبا المطابقة (${matchingPairs.length})` },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className="btn btn-sm"
            style={{
              background: subTab === t.id ? 'var(--primary)' : 'transparent',
              color: subTab === t.id ? '#fff' : 'var(--text)',
              border: 'none', fontWeight: 700,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'questions' && (
        <QuestionsSection
          questions={questions}
          moveQuestion={moveQuestion}
          toggleEnabled={toggleEnabled}
          deleteQuestion={deleteQuestion}
          onAdd={() => { setEditingQ({ ...EMPTY_QUESTION }); setQMsg(null); }}
          onEdit={q => { setEditingQ({ ...q, options: q.options?.length ? q.options : EMPTY_QUESTION.options }); setQMsg(null); }}
          onPreview={q => setPreviewQ(q)}
        />
      )}

      {subTab === 'levels' && (
        <LevelsSection levels={levels} onEdit={l => { setEditingLevel({ ...l }); setLMsg(null); }} />
      )}

      {subTab === 'settings' && (
        <div className="card" style={{ maxWidth: 620, padding: 22 }}>
          <div className="form-group">
            <label className="form-label">قالب رسالة واتساب</label>
            <textarea
              className="form-input" rows={3} value={waTemplate}
              onChange={e => setWaTemplate(e.target.value)}
            />
            <p style={{ fontSize: '.78rem', color: 'var(--muted)', marginTop: 6 }}>
              يمكن استخدام <code>{'{childName}'}</code> (اسم الطفل) و<code>{'{program}'}</code> (اسم البرنامج الموصى به) — تُستبدَل تلقائياً عند إرسال الرسالة.
            </p>
          </div>
          {waMsg && <div className={`alert alert-${waMsg.ok ? 'success' : 'error'}`}>{waMsg.text}</div>}
          <button className="btn btn-primary" onClick={saveSettings} disabled={waSaving}>
            {waSaving ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> جارٍ الحفظ...</> : '✅ حفظ'}
          </button>
        </div>
      )}

      {subTab === 'alphabet' && (
        <AlphabetSection
          alphaEnabled={alphaEnabled} setAlphaEnabled={setAlphaEnabled}
          alphaTitle={alphaTitle} setAlphaTitle={setAlphaTitle}
          alphaSubtitle={alphaSubtitle} setAlphaSubtitle={setAlphaSubtitle}
          alphaSaving={alphaSaving} alphaMsg={alphaMsg} onSaveSettings={saveAlphabetSettings}
          letters={letters} letterSaving={letterSaving}
          onMoveLetter={moveLetter} onUpdateLetterText={updateLetterText}
          onToggleLetterEnabled={toggleLetterEnabled} onDeleteLetter={deleteLetter}
          newLetter={newLetter} setNewLetter={setNewLetter} onAddLetter={addLetter}
        />
      )}

      {subTab === 'matching' && (
        <MatchingSection
          matchingSettings={matchingSettings}
          matchingPairs={matchingPairs}
          onSaveSettings={saveMatchingSettings}
          pairSaving={pairSaving}
          onMovePair={moveMatchingPair}
          onUpdatePair={updateMatchingPair}
          onDeletePair={deleteMatchingPair}
          newPairInputs={newPairInputs}
          setNewPairInputs={setNewPairInputs}
          onAddPair={addMatchingPair}
        />
      )}

      {editingQ && (
        <QuestionModal
          value={editingQ} setValue={setEditingQ}
          onSubmit={saveQuestion} onClose={() => setEditingQ(null)}
          saving={qSaving} msg={qMsg} uploading={uploading}
          onUpload={handleMediaUpload}
        />
      )}

      {editingLevel && (
        <LevelModal
          value={editingLevel} setValue={setEditingLevel}
          onSubmit={saveLevel} onClose={() => setEditingLevel(null)}
          saving={lSaving} msg={lMsg}
        />
      )}

      {previewQ && (
        <QuestionPreviewModal question={previewQ} onClose={() => setPreviewQ(null)} />
      )}
    </div>
  );
}

function QuestionsSection({ questions, moveQuestion, toggleEnabled, deleteQuestion, onAdd, onEdit, onPreview }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button className="btn btn-primary btn-sm" onClick={onAdd}>+ سؤال جديد</button>
      </div>
      <div className="card table-scroll-wrapper" style={{ padding: 0 }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.87rem' }}>
          <thead>
            <tr>
              {['#', 'السؤال', 'المهارة', 'الوسائط', 'الحالة', 'إجراءات'].map(h => (
                <th key={h} style={{ background: 'var(--primary)', color: '#fff', padding: '9px 14px', textAlign: 'right', fontWeight: 700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {questions.map((q, i) => (
              <tr key={q.id} style={{ background: i % 2 === 0 ? '#fff' : '#f9fbff', opacity: q.enabled ? 1 : .5 }}>
                <td style={{ padding: '8px 14px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <button className="btn btn-sm" style={{ padding: '1px 8px' }} disabled={i === 0} onClick={() => moveQuestion(q, -1)}>▲</button>
                    <button className="btn btn-sm" style={{ padding: '1px 8px' }} disabled={i === questions.length - 1} onClick={() => moveQuestion(q, 1)}>▼</button>
                  </div>
                </td>
                <td style={{ padding: '8px 14px', maxWidth: 320 }}>{q.question_text}</td>
                <td style={{ padding: '8px 14px' }}>{q.skill_tag ? <span className="badge badge-blue">{q.skill_tag}</span> : '—'}</td>
                <td style={{ padding: '8px 14px', whiteSpace: 'nowrap' }}>
                  {q.image_url ? '🖼️' : q.prompt_emoji ? q.prompt_emoji : ''}{' '}
                  {q.audio_url ? '🔊' : q.audio_prompt ? '🗣️(TTS)' : ''}{' '}
                  {q.reading_text ? '📖' : ''}{' '}
                  {q.parent_read_hint ? '👨‍👧' : ''}
                </td>
                <td style={{ padding: '8px 14px' }}>
                  <button
                    onClick={() => toggleEnabled(q)}
                    className="btn btn-sm"
                    style={{ background: q.enabled ? '#f0fdf4' : '#f1f5f9', color: q.enabled ? '#16a34a' : '#64748b', border: 'none' }}
                  >
                    {q.enabled ? '✅ مفعّل' : '⏸ معطّل'}
                  </button>
                </td>
                <td style={{ padding: '8px 14px', whiteSpace: 'nowrap' }}>
                  <button className="btn btn-sm btn-outline" onClick={() => onPreview(q)} title="معاينة سريعة" style={{ marginLeft: 6 }}>👁️</button>
                  <button className="btn btn-sm btn-outline" onClick={() => onEdit(q)} style={{ marginLeft: 6 }}>✏️</button>
                  <button className="btn btn-sm btn-danger" onClick={() => deleteQuestion(q.id)}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LevelsSection({ levels, onEdit }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
      {levels.map(l => (
        <div key={l.id} className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: '1.6rem' }}>{l.icon}</span>
            <strong style={{ color: 'var(--primary)' }}>{l.label}</strong>
          </div>
          <div style={{ fontSize: '.85rem', color: 'var(--muted)', marginBottom: 6 }}>
            النطاق: من {l.min_correct} إلى {l.max_correct} إجابة صحيحة
          </div>
          <div style={{ fontSize: '.82rem', color: 'var(--text)', marginBottom: 10, lineHeight: 1.7 }}>{l.strengths_text}</div>
          <div style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--primary)' }}>{l.program_name}</div>
          <button className="btn btn-sm btn-outline" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }} onClick={() => onEdit(l)}>✏️ تعديل</button>
        </div>
      ))}
    </div>
  );
}

/**
 * قسم "تمرين الحروف الافتتاحي" — بطاقة إعدادات (تفعيل/عنوان/نص فرعي)
 * + جدول الحروف الـ28 نفسها (نص/تفعيل/ترتيب ▲▼/حذف) + إضافة حرف جديد.
 * الحفظ فوري لكل حرف على حدة (onBlur للنص، فوري للتفعيل/الحذف/الترتيب) —
 * لا زر "حفظ" جماعي هنا، بخلاف بطاقة الإعدادات التي تُحفَظ دفعة واحدة.
 */
function AlphabetSection({
  alphaEnabled, setAlphaEnabled, alphaTitle, setAlphaTitle, alphaSubtitle, setAlphaSubtitle,
  alphaSaving, alphaMsg, onSaveSettings,
  letters, letterSaving, onMoveLetter, onUpdateLetterText, onToggleLetterEnabled, onDeleteLetter,
  newLetter, setNewLetter, onAddLetter,
}) {
  return (
    <div>
      <div className="card" style={{ maxWidth: 620, padding: 22, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <input type="checkbox" id="alpha-enabled" checked={alphaEnabled} onChange={e => setAlphaEnabled(e.target.checked)} />
          <label htmlFor="alpha-enabled" style={{ fontWeight: 700, cursor: 'pointer' }}>تفعيل تمرين الحروف الافتتاحي (يظهر للزوار قبل الأسئلة الـ15)</label>
        </div>
        <div className="form-group">
          <label className="form-label">العنوان</label>
          <input className="form-input" value={alphaTitle} onChange={e => setAlphaTitle(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">النص الفرعي (تعليمات للطفل/ولي الأمر)</label>
          <textarea className="form-input" rows={2} value={alphaSubtitle} onChange={e => setAlphaSubtitle(e.target.value)} />
        </div>
        {alphaMsg && <div className={`alert alert-${alphaMsg.ok ? 'success' : 'error'}`}>{alphaMsg.text}</div>}
        <button className="btn btn-primary" onClick={onSaveSettings} disabled={alphaSaving}>
          {alphaSaving ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> جارٍ الحفظ...</> : '✅ حفظ'}
        </button>
      </div>

      <form onSubmit={onAddLetter} style={{ display: 'flex', gap: 8, marginBottom: 14, maxWidth: 300 }}>
        <input className="form-input" placeholder="حرف جديد" value={newLetter} onChange={e => setNewLetter(e.target.value)} style={{ flex: 1 }} />
        <button type="submit" className="btn btn-primary btn-sm" disabled={letterSaving === 'new' || !newLetter.trim()}>+ إضافة</button>
      </form>

      <div className="card table-scroll-wrapper" style={{ padding: 0 }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.87rem' }}>
          <thead>
            <tr>
              {['#', 'الحرف', 'الحالة', 'إجراءات'].map(h => (
                <th key={h} style={{ background: 'var(--primary)', color: '#fff', padding: '9px 14px', textAlign: 'right', fontWeight: 700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {letters.map((l, i) => (
              <LetterRow
                key={l.id} letter={l} index={i} total={letters.length}
                saving={letterSaving === l.id}
                onMove={dir => onMoveLetter(l, dir)}
                onUpdateText={text => onUpdateLetterText(l.id, text)}
                onToggleEnabled={() => onToggleLetterEnabled(l)}
                onDelete={() => onDeleteLetter(l.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LetterRow({ letter, index, total, saving, onMove, onUpdateText, onToggleEnabled, onDelete }) {
  const [text, setText] = useState(letter.letter);

  return (
    <tr style={{ background: index % 2 === 0 ? '#fff' : '#f9fbff', opacity: letter.enabled ? 1 : .5 }}>
      <td style={{ padding: '8px 14px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <button className="btn btn-sm" style={{ padding: '1px 8px' }} disabled={index === 0} onClick={() => onMove(-1)}>▲</button>
          <button className="btn btn-sm" style={{ padding: '1px 8px' }} disabled={index === total - 1} onClick={() => onMove(1)}>▼</button>
        </div>
      </td>
      <td style={{ padding: '8px 14px' }}>
        <input
          className="form-input" style={{ width: 70, textAlign: 'center', fontSize: '1.1rem', fontWeight: 700 }}
          value={text} disabled={saving}
          onChange={e => setText(e.target.value)}
          onBlur={() => { if (text.trim() && text !== letter.letter) onUpdateText(text); else setText(letter.letter); }}
        />
      </td>
      <td style={{ padding: '8px 14px' }}>
        <button
          onClick={onToggleEnabled}
          className="btn btn-sm"
          style={{ background: letter.enabled ? '#f0fdf4' : '#f1f5f9', color: letter.enabled ? '#16a34a' : '#64748b', border: 'none' }}
        >
          {letter.enabled ? '✅ مفعّل' : '⏸ معطّل'}
        </button>
      </td>
      <td style={{ padding: '8px 14px' }}>
        <button className="btn btn-sm btn-danger" onClick={onDelete} disabled={saving}>🗑️</button>
      </td>
    </tr>
  );
}

/**
 * قسم "تدريبا المطابقة" — بطاقة إعدادات مستقلة لكل تدريب (تفعيل/عنوان/
 * نص فرعي/تسمية) + جدول أزواج (إيموجي/كلمة) قابل للتعديل، بنفس أسلوب
 * قسم تمرين الحروف تماماً (حفظ فوري للأزواج، حفظ دفعة واحدة للإعدادات).
 */
function MatchingSection({
  matchingSettings, matchingPairs, onSaveSettings,
  pairSaving, onMovePair, onUpdatePair, onDeletePair,
  newPairInputs, setNewPairInputs, onAddPair,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {matchingSettings.map(settings => (
        <MatchingExerciseCard
          key={settings.exercise_key}
          settings={settings}
          pairs={matchingPairs.filter(p => p.exercise_key === settings.exercise_key).sort((a, b) => a.order_index - b.order_index)}
          onSaveSettings={patch => onSaveSettings(settings.exercise_key, patch)}
          pairSaving={pairSaving}
          onMovePair={onMovePair}
          onUpdatePair={onUpdatePair}
          onDeletePair={onDeletePair}
          newPair={newPairInputs[settings.exercise_key]}
          setNewPair={val => setNewPairInputs(prev => ({ ...prev, [settings.exercise_key]: val }))}
          onAddPair={() => onAddPair(settings.exercise_key)}
        />
      ))}
    </div>
  );
}

function MatchingExerciseCard({ settings, pairs, onSaveSettings, pairSaving, onMovePair, onUpdatePair, onDeletePair, newPair, setNewPair, onAddPair }) {
  const [enabled,  setEnabled]  = useState(settings.enabled);
  const [title,    setTitle]    = useState(settings.title);
  const [subtitle, setSubtitle] = useState(settings.subtitle);
  const [label,    setLabel]    = useState(settings.label);
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState(null);

  async function handleSave() {
    setSaving(true); setMsg(null);
    const res = await onSaveSettings({ enabled, title, subtitle, label });
    setMsg(res.ok ? { ok: true, text: '✅ تم الحفظ' } : { ok: false, text: '❌ ' + (res.error || 'فشل الحفظ') });
    setSaving(false);
  }

  return (
    <div>
      <div className="card" style={{ maxWidth: 620, padding: 22, marginBottom: 16 }}>
        <div style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 14 }}>{label || settings.exercise_key}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <input type="checkbox" id={`match-enabled-${settings.exercise_key}`} checked={enabled} onChange={e => setEnabled(e.target.checked)} />
          <label htmlFor={`match-enabled-${settings.exercise_key}`} style={{ fontWeight: 700, cursor: 'pointer' }}>تفعيل هذا التدريب (يظهر للزوار)</label>
        </div>
        <div className="form-group">
          <label className="form-label">التسمية (تظهر أعلى العنوان، مثال: "التدريب الثاني")</label>
          <input className="form-input" value={label} onChange={e => setLabel(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">العنوان</label>
          <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">النص الفرعي (تعليمات الربط)</label>
          <textarea className="form-input" rows={2} value={subtitle} onChange={e => setSubtitle(e.target.value)} />
        </div>
        {msg && <div className={`alert alert-${msg.ok ? 'success' : 'error'}`}>{msg.text}</div>}
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> جارٍ الحفظ...</> : '✅ حفظ'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, maxWidth: 340 }}>
        <input className="form-input" placeholder="إيموجي" style={{ width: 70, textAlign: 'center' }} value={newPair.emoji} onChange={e => setNewPair({ ...newPair, emoji: e.target.value })} />
        <input className="form-input" placeholder="الكلمة" style={{ flex: 1 }} value={newPair.word} onChange={e => setNewPair({ ...newPair, word: e.target.value })} />
        <button className="btn btn-primary btn-sm" onClick={onAddPair} disabled={pairSaving === `new:${settings.exercise_key}` || !newPair.emoji.trim() || !newPair.word.trim()}>+ إضافة</button>
      </div>

      <div className="card table-scroll-wrapper" style={{ padding: 0 }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.87rem' }}>
          <thead>
            <tr>
              {['#', 'الصورة', 'الكلمة', 'الحالة', 'إجراءات'].map(h => (
                <th key={h} style={{ background: 'var(--primary)', color: '#fff', padding: '9px 14px', textAlign: 'right', fontWeight: 700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pairs.map((p, i) => (
              <MatchingPairRow
                key={p.id} pair={p} index={i} total={pairs.length}
                saving={pairSaving === p.id}
                onMove={dir => onMovePair(p, dir)}
                onUpdate={patch => onUpdatePair(p.id, patch)}
                onDelete={() => onDeletePair(p.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MatchingPairRow({ pair, index, total, saving, onMove, onUpdate, onDelete }) {
  const [emoji, setEmoji] = useState(pair.emoji);
  const [word,  setWord]  = useState(pair.word);

  return (
    <tr style={{ background: index % 2 === 0 ? '#fff' : '#f9fbff', opacity: pair.enabled ? 1 : .5 }}>
      <td style={{ padding: '8px 14px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <button className="btn btn-sm" style={{ padding: '1px 8px' }} disabled={index === 0} onClick={() => onMove(-1)}>▲</button>
          <button className="btn btn-sm" style={{ padding: '1px 8px' }} disabled={index === total - 1} onClick={() => onMove(1)}>▼</button>
        </div>
      </td>
      <td style={{ padding: '8px 14px' }}>
        <input
          className="form-input" style={{ width: 64, textAlign: 'center', fontSize: '1.3rem' }}
          value={emoji} disabled={saving}
          onChange={e => setEmoji(e.target.value)}
          onBlur={() => { if (emoji.trim() && emoji !== pair.emoji) onUpdate({ emoji }); else setEmoji(pair.emoji); }}
        />
      </td>
      <td style={{ padding: '8px 14px' }}>
        <input
          className="form-input" style={{ width: 140, fontWeight: 700 }}
          value={word} disabled={saving}
          onChange={e => setWord(e.target.value)}
          onBlur={() => { if (word.trim() && word !== pair.word) onUpdate({ word }); else setWord(pair.word); }}
        />
      </td>
      <td style={{ padding: '8px 14px' }}>
        <button
          onClick={() => onUpdate({ enabled: !pair.enabled })}
          className="btn btn-sm"
          style={{ background: pair.enabled ? '#f0fdf4' : '#f1f5f9', color: pair.enabled ? '#16a34a' : '#64748b', border: 'none' }}
        >
          {pair.enabled ? '✅ مفعّل' : '⏸ معطّل'}
        </button>
      </td>
      <td style={{ padding: '8px 14px' }}>
        <button className="btn btn-sm btn-danger" onClick={onDelete} disabled={saving}>🗑️</button>
      </td>
    </tr>
  );
}

function QuestionModal({ value, setValue, onSubmit, onClose, saving, msg, uploading, onUpload }) {
  const set = patch => setValue(prev => ({ ...prev, ...patch }));

  function updateOption(i, patch) {
    set({ options: value.options.map((o, idx) => idx === i ? { ...o, ...patch } : o) });
  }
  function setCorrect(i) {
    set({ options: value.options.map((o, idx) => ({ ...o, correct: idx === i })) });
  }
  function removeOption(i) {
    if (value.options.length <= 2) return;
    set({ options: value.options.filter((_, idx) => idx !== i) });
  }
  function addOption() {
    set({ options: [...value.options, { text: '', emoji: '', correct: false }] });
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 700, padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 20, padding: '26px 22px', width: '100%', maxWidth: 560, direction: 'rtl', maxHeight: '92vh', overflowY: 'auto' }}>
        <h3 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 18 }}>{value.id ? '✏️ تعديل السؤال' : '+ سؤال جديد'}</h3>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">نص السؤال *</label>
            <textarea className="form-input" rows={2} required value={value.question_text} onChange={e => set({ question_text: e.target.value })} />
          </div>

          <div className="form-group">
            <label className="form-label">فقرة قراءة (اختياري — لأسئلة الاستيعاب القرائي)</label>
            <textarea className="form-input" rows={2} value={value.reading_text || ''} onChange={e => set({ reading_text: e.target.value })} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">صورة السؤال (اختياري)</label>
              {value.image_url ? (
                <div>
                  <img src={value.image_url} alt="" style={{ maxHeight: 80, borderRadius: 8, marginBottom: 6 }} />
                  <button type="button" className="btn btn-sm" onClick={() => set({ image_url: null })}>✕ إزالة</button>
                </div>
              ) : (
                <>
                  <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && onUpload(e.target.files[0], 'image')} disabled={uploading === 'image'} />
                  <p style={{ fontSize: '.75rem', color: 'var(--muted)', marginTop: 4 }}>أو استخدم إيموجي كصورة سريعة أدناه (بلا رفع)</p>
                  <input className="form-input" placeholder="إيموجي — مثال: 🐱🌳" value={value.prompt_emoji || ''} onChange={e => set({ prompt_emoji: e.target.value })} style={{ marginTop: 4 }} />
                </>
              )}
              {uploading === 'image' && <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />}
            </div>
            <div className="form-group">
              <label className="form-label">صوت السؤال (اختياري)</label>
              {value.audio_url ? (
                <div>
                  <audio controls src={value.audio_url} style={{ maxWidth: '100%', height: 32 }} />
                  <button type="button" className="btn btn-sm" onClick={() => set({ audio_url: null })} style={{ display: 'block', marginTop: 6 }}>✕ إزالة</button>
                </div>
              ) : (
                <>
                  <input type="file" accept="audio/*" onChange={e => e.target.files?.[0] && onUpload(e.target.files[0], 'audio')} disabled={uploading === 'audio'} />
                  <p style={{ fontSize: '.75rem', color: 'var(--muted)', marginTop: 4 }}>أو نص يُنطَق آلياً (بلا رفع)</p>
                  <input className="form-input" placeholder="مثال: بَ — أو جملة كاملة" value={value.audio_prompt || ''} onChange={e => set({ audio_prompt: e.target.value })} style={{ marginTop: 4 }} />
                </>
              )}
              {uploading === 'audio' && <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" id="q-parent-read" checked={!!value.parent_read_hint} onChange={e => set({ parent_read_hint: e.target.checked })} />
            <label htmlFor="q-parent-read" style={{ fontWeight: 600, cursor: 'pointer', fontSize: '.88rem' }}>يُطلَب من ولي الأمر قراءة السؤال بصوت مرتفع (بدل صوت مسجَّل)</label>
          </div>

          <div className="form-group">
            <label className="form-label">تصنيف المهارة (تنظيمي فقط)</label>
            <input className="form-input" placeholder="مثال: تمييز سمعي" value={value.skill_tag || ''} onChange={e => set({ skill_tag: e.target.value })} />
          </div>

          <div className="form-group">
            <label className="form-label">الخيارات * (حدّد الإجابة الصحيحة بالزر الدائري)</label>
            {value.options.map((opt, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, background: '#f8fafc', padding: '8px 10px', borderRadius: 8 }}>
                <input type="radio" name="qt-correct" checked={!!opt.correct} onChange={() => setCorrect(i)} title="الإجابة الصحيحة" />
                <input className="form-input" style={{ width: 56, textAlign: 'center' }} placeholder="🙂" value={opt.emoji || ''} onChange={e => updateOption(i, { emoji: e.target.value })} />
                <input className="form-input" style={{ flex: 1 }} placeholder="نص الخيار" required value={opt.text || ''} onChange={e => updateOption(i, { text: e.target.value })} />
                <button type="button" className="btn btn-sm btn-danger" onClick={() => removeOption(i)} disabled={value.options.length <= 2}>✕</button>
              </div>
            ))}
            <button type="button" className="btn btn-sm btn-outline" onClick={addOption}>+ خيار جديد</button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" id="q-enabled" checked={!!value.enabled} onChange={e => set({ enabled: e.target.checked })} />
            <label htmlFor="q-enabled" style={{ fontWeight: 600, cursor: 'pointer', fontSize: '.88rem' }}>سؤال مفعّل (يظهر للزوار)</label>
          </div>

          {msg && <div className={`alert alert-${msg.ok ? 'success' : 'error'}`}>{msg.text}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary" disabled={saving || uploading} style={{ flex: 1, justifyContent: 'center' }}>
              {saving ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> جارٍ الحفظ...</> : '✅ حفظ'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LevelModal({ value, setValue, onSubmit, onClose, saving, msg }) {
  const set = patch => setValue(prev => ({ ...prev, ...patch }));
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 700, padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 20, padding: '26px 22px', width: '100%', maxWidth: 480, direction: 'rtl', maxHeight: '92vh', overflowY: 'auto' }}>
        <h3 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 18 }}>✏️ تعديل مستوى: {value.label}</h3>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">من (إجابات صحيحة)</label>
              <input type="number" min="0" className="form-input" value={value.min_correct} onChange={e => set({ min_correct: Number(e.target.value) })} />
            </div>
            <div className="form-group">
              <label className="form-label">إلى</label>
              <input type="number" min="0" className="form-input" value={value.max_correct} onChange={e => set({ max_correct: Number(e.target.value) })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">النتيجة الوصفية (نقاط القوة)</label>
            <textarea className="form-input" rows={2} value={value.strengths_text} onChange={e => set({ strengths_text: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">التوصية التربوية</label>
            <textarea className="form-input" rows={3} value={value.recommendation} onChange={e => set({ recommendation: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">اسم البرنامج الموصى به</label>
            <input className="form-input" value={value.program_name} onChange={e => set({ program_name: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">جملة ترويجية قصيرة للبرنامج</label>
            <input className="form-input" value={value.program_pitch} onChange={e => set({ program_pitch: e.target.value })} />
          </div>
          {msg && <div className={`alert alert-${msg.ok ? 'success' : 'error'}`}>{msg.text}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1, justifyContent: 'center' }}>
              {saving ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> جارٍ الحفظ...</> : '✅ حفظ'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * معاينة سؤال واحد بلا مغادرة الصفحة — لا يعيد استخدام QuickQuestion.jsx
 * (تطبيق Vite منفصل تماماً، بنيته الخاصة وCSS الخاص به لا يعملان هنا) بل
 * عرض تقديمي خفيف مستقل: نص السؤال ووسائطه وخياراته مع تمييز الإجابة
 * الصحيحة — يكفي تماماً لمراجعة المحتوى دون تجربة الاختبار الحقيقي.
 */
function QuestionPreviewModal({ question: q, onClose }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 700, padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: '#fff', borderRadius: 20, padding: '26px 22px', width: '100%', maxWidth: 480, direction: 'rtl', maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <h3 style={{ fontWeight: 800, color: 'var(--primary)' }}>👁️ معاينة السؤال</h3>
          <button className="btn btn-sm btn-ghost" onClick={onClose}>✕</button>
        </div>

        {q.reading_text && (
          <div style={{ background: '#f4f1fb', border: '1px solid #d9d0ee', borderRadius: 10, padding: '12px 14px', marginBottom: 14, fontSize: '.9rem', lineHeight: 1.8 }}>
            📖 {q.reading_text}
          </div>
        )}

        {q.image_url ? (
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <img src={q.image_url} alt="" style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 10 }} />
          </div>
        ) : q.prompt_emoji && (
          <div style={{ textAlign: 'center', fontSize: '2.6rem', marginBottom: 12 }}>{q.prompt_emoji}</div>
        )}

        {q.audio_url ? (
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <audio controls src={q.audio_url} style={{ maxWidth: '100%' }} />
          </div>
        ) : q.audio_prompt && (
          <div style={{ background: '#eef5ff', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: '.85rem', color: '#1a3a5c' }}>
            🔊 يُنطَق آلياً: «{q.audio_prompt}»
          </div>
        )}

        {q.parent_read_hint && (
          <div style={{ background: '#fff8e8', border: '1px solid #f3d78a', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: '.82rem', color: '#7a5a10' }}>
            🗣️ يُطلَب من ولي الأمر قراءة السؤال بصوت مرتفع
          </div>
        )}

        <p style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: 14 }}>{q.question_text}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(q.options ?? []).map((opt, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8,
              border: `1.5px solid ${opt.correct ? '#86efac' : 'var(--border)'}`,
              background: opt.correct ? '#f0fdf4' : '#fff',
            }}>
              {opt.emoji && <span style={{ fontSize: '1.3rem' }}>{opt.emoji}</span>}
              <span style={{ flex: 1, fontWeight: opt.correct ? 700 : 400 }}>{opt.text}</span>
              {opt.correct && <span title="الإجابة الصحيحة">✅</span>}
            </div>
          ))}
        </div>

        {q.skill_tag && (
          <div style={{ marginTop: 14 }}>
            <span className="badge badge-blue">{q.skill_tag}</span>
          </div>
        )}
      </div>
    </div>
  );
}
