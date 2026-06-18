'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

/* ─── helpers ─── */
function speak(text) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ar-SA'; u.rate = 0.82;
  function go() {
    const v = window.speechSynthesis.getVoices();
    const ar = v.find(x => x.lang.startsWith('ar'));
    if (ar) u.voice = ar;
    window.speechSynthesis.speak(u);
  }
  if (window.speechSynthesis.getVoices().length > 0) go();
  else { window.speechSynthesis.addEventListener('voiceschanged', go, { once: true }); setTimeout(go, 500); }
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatSegs(segs) {
  if (!Array.isArray(segs) || segs.length === 0) return '—';
  return segs.filter(Boolean).join(' ▪ ');
}

/* Arabic letters that cannot extend a connecting arm to the left */
const NON_CONN = new Set('اأإآءودرذزوىة');
/* Add Tatweel (ـ) arm at end of a segment when it connects to the next */
function addArm(seg, isLast) {
  if (isLast || !seg) return seg;
  const stripped = seg.replace(/[ً-ْٰ]/g, '');
  const last = stripped[stripped.length - 1] || '';
  return NON_CONN.has(last) ? seg : seg + 'ـ';
}

const TOPICS = ['الحيوانات', 'المدرسة', 'الأسرة', 'الطبيعة', 'الفواكه', 'الألوان', 'المهن', 'الأدوات'];

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

/* ─── Word Manager (admin/teacher panel) ─── */
function WordManager({ dbWords, onRefresh }) {
  const [editId,  setEditId]  = useState(null);
  const [word,    setWord]    = useState('');
  const [correct, setCorrect] = useState('');
  const [wrong1,  setWrong1]  = useState('');
  const [wrong2,  setWrong2]  = useState('');
  const [rule,    setRule]    = useState('');
  const [topic,   setTopic]   = useState('');
  const [grade,   setGrade]   = useState(0);
  const [imgUrl,  setImgUrl]  = useState('');
  const [imgPrev, setImgPrev] = useState('');
  const [saving,  setSaving]  = useState(false);
  const [delId,   setDelId]   = useState(null);
  const [msg,     setMsg]     = useState(null);

  const parseSegs = s => s.split(/[،,]/).map(x => x.trim()).filter(Boolean);

  const reset = () => {
    setEditId(null); setWord(''); setCorrect(''); setWrong1(''); setWrong2('');
    setRule(''); setTopic(''); setGrade(0); setImgUrl(''); setImgPrev(''); setMsg(null);
  };

  const startEdit = item => {
    setEditId(item.id);
    setWord(item.word_text);
    setCorrect((item.correct_segments || []).join('، '));
    const wo = item.wrong_options || [[], []];
    setWrong1((wo[0] || []).join('، '));
    setWrong2((wo[1] || []).join('، '));
    setRule(item.rule_text || '');
    setTopic(item.topic || '');
    setGrade(item.grade_level || 0);
    setImgUrl(item.image_url || '');
    setImgPrev(item.image_url || '');
    setMsg(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImgFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const b = await fileToBase64(f);
    setImgUrl(b); setImgPrev(b);
  };

  const handleSave = async () => {
    if (!word.trim())   { setMsg({ ok: false, text: 'الكلمة مطلوبة' }); return; }
    const cs = parseSegs(correct);
    const w1 = parseSegs(wrong1);
    const w2 = parseSegs(wrong2);
    if (!cs.length)              { setMsg({ ok: false, text: 'أدخل المقاطع الصحيحة' }); return; }
    if (!w1.length || !w2.length){ setMsg({ ok: false, text: 'أدخل خيارين خاطئين' }); return; }
    if (!rule.trim())            { setMsg({ ok: false, text: 'أدخل نص القاعدة' }); return; }

    setSaving(true); setMsg(null);
    try {
      const body = {
        word_text: word.trim(),
        correct_segments: cs,
        wrong_options: [w1, w2],
        rule_text: rule.trim(),
        topic: topic || null,
        grade_level: grade || null,
        image_url: imgUrl || null,
      };
      const url    = editId ? `/api/games/word-smash?id=${editId}` : '/api/games/word-smash';
      const method = editId ? 'PUT' : 'POST';
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json   = await res.json();
      if (json.error) throw new Error(json.error);
      setMsg({ ok: true, text: editId ? 'تم التعديل ✅' : 'أُضيفت الكلمة ✅' });
      reset(); onRefresh();
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    }
    setSaving(false);
  };

  const handleDelete = async (id, w) => {
    if (!confirm(`حذف "${w}"؟`)) return;
    setDelId(id);
    try {
      const res  = await fetch(`/api/games/word-smash?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      if (editId === id) reset();
      onRefresh();
    } catch (e) { alert(e.message); }
    setDelId(null);
  };

  const cs = parseSegs(correct);

  return (
    <div style={{ border: '1.5px solid #d1fae5', borderRadius: 14, background: '#fff', overflow: 'hidden', marginBottom: 20 }}>
      <div style={{ background: '#ecfdf5', borderBottom: '1px solid #d1fae5', padding: '12px 16px', fontWeight: 700, color: '#065f46', fontFamily: 'Cairo, sans-serif', fontSize: '.95rem' }}>
        🔨 إدارة كلمات مطرقة التفكيك {editId ? '— (تعديل)' : ''}
      </div>

      <div style={{ padding: 16, borderBottom: '1px solid #f1f5f9' }}>
        {/* Word */}
        <div style={{ marginBottom: 10 }}>
          <label style={S.label}>الكلمة المُشكَّلة</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={word} onChange={e => setWord(e.target.value)}
              placeholder="مثال: مَدْرَسَةٌ" style={{ ...S.input, flex: 1 }} dir="rtl" />
            <button onClick={() => word && speak(word)}
              title="استمع" style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #d1d5db', background: '#f0fdf4', cursor: 'pointer', fontSize: '1.1rem' }}>🔊</button>
          </div>
        </div>

        {/* Correct segments */}
        <div style={{ marginBottom: 10 }}>
          <label style={S.label}>المقاطع الصحيحة — افصل بفاصلة (مثال: مَدْ، رَ، سَةٌ)</label>
          <input value={correct} onChange={e => setCorrect(e.target.value)}
            placeholder="مَدْ، رَ، سَةٌ" style={S.input} dir="rtl" />
          {cs.length > 0 && (
            <div style={{ marginTop: 5, display: 'flex', gap: 6, flexWrap: 'wrap', direction: 'rtl' }}>
              {cs.map((s, i) => (
                <span key={i} style={{ background: '#d1fae5', color: '#065f46', borderRadius: 8, padding: '3px 10px', fontWeight: 700, fontSize: '.88rem', fontFamily: 'Cairo, sans-serif' }}>{s}</span>
              ))}
            </div>
          )}
        </div>

        {/* Wrong options */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <label style={S.label}>خيار خاطئ 1 (افصل بفاصلة)</label>
            <input value={wrong1} onChange={e => setWrong1(e.target.value)}
              placeholder="مَدْرَ، سَةٌ" style={S.input} dir="rtl" />
          </div>
          <div>
            <label style={S.label}>خيار خاطئ 2 (افصل بفاصلة)</label>
            <input value={wrong2} onChange={e => setWrong2(e.target.value)}
              placeholder="مَ، دَرْ، سَةٌ" style={S.input} dir="rtl" />
          </div>
        </div>

        {/* Rule */}
        <div style={{ marginBottom: 10 }}>
          <label style={S.label}>القاعدة النحوية / التعليمية</label>
          <textarea value={rule} onChange={e => setRule(e.target.value)} rows={2}
            placeholder="مثال: الكلمة مَدْرَسَةٌ مكوّنة من ثلاثة مقاطع: مَدْ + رَ + سَةٌ"
            style={{ ...S.input, resize: 'vertical', minHeight: 64 }} dir="rtl" />
        </div>

        {/* Image upload */}
        <div style={{ marginBottom: 10 }}>
          <label style={S.label}>صورة الكلمة (اختياري)</label>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <label style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 8,
              border: '1.5px dashed #86efac', borderRadius: 8, padding: '8px 12px',
              background: '#f0fdf4', cursor: 'pointer', fontFamily: 'Cairo, sans-serif',
              fontSize: '.85rem', color: '#15803d', fontWeight: 600,
            }}>
              📷 {imgPrev ? 'تغيير الصورة' : 'رفع صورة'}
              <input type="file" accept="image/*" onChange={handleImgFile} style={{ display: 'none' }} />
            </label>
            {imgPrev && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <img src={imgPrev} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, border: '1.5px solid #d1fae5' }} />
                <button onClick={() => { setImgUrl(''); setImgPrev(''); }} style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: '.78rem', color: '#dc2626', fontFamily: 'Cairo, sans-serif' }}>🗑️</button>
              </div>
            )}
          </div>
        </div>

        {/* Topic & Grade */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div>
            <label style={S.label}>الموضوع</label>
            <input
              list="ws-topics-list"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="اكتب أو اختر..."
              style={S.input}
              dir="rtl"
            />
            <datalist id="ws-topics-list">
              {TOPICS.map(t => <option key={t} value={t} />)}
            </datalist>
          </div>
          <div>
            <label style={S.label}>الصف</label>
            <select value={grade} onChange={e => setGrade(Number(e.target.value))} style={S.input}>
              <option value={0}>— الكل —</option>
              {[1,2,3,4,5,6,7,8,9].map(g => <option key={g} value={g}>الصف {g}</option>)}
            </select>
          </div>
        </div>

        {msg && (
          <div style={{ padding: '8px 12px', borderRadius: 8, marginBottom: 10, background: msg.ok ? '#f0fdf4' : '#fef2f2', color: msg.ok ? '#15803d' : '#dc2626', fontFamily: 'Cairo, sans-serif', fontSize: '.88rem', fontWeight: 600 }}>
            {msg.text}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleSave} disabled={saving} style={{ ...S.btnPrimary, flex: 1, opacity: saving ? .7 : 1 }}>
            {saving ? '⏳ جارٍ الحفظ...' : editId ? '💾 حفظ التعديل' : '➕ إضافة كلمة'}
          </button>
          {editId && <button onClick={reset} style={S.btnSm}>✕ إلغاء</button>}
        </div>
      </div>

      {/* List */}
      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
        {dbWords.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontFamily: 'Cairo, sans-serif' }}>لا توجد كلمات بعد</div>
        ) : dbWords.map(item => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid #f1f5f9', background: editId === item.id ? '#f0fdf4' : 'transparent', direction: 'rtl' }}>
            {item.image_url
              ? <img src={item.image_url} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 7, border: '1.5px solid #d1fae5', flexShrink: 0 }} />
              : <button onClick={() => speak(item.word_text)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', flexShrink: 0, padding: '2px 4px' }}>🔊</button>
            }
            <div style={{ flex: 1, fontFamily: 'Cairo, sans-serif', textAlign: 'right' }}>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>{item.word_text}</div>
              <div style={{ fontSize: '.75rem', color: '#64748b' }}>
                ✓ {formatSegs(item.correct_segments)}
                {item.topic && ` · ${item.topic}`}
                {item.grade_level ? ` · ص${item.grade_level}` : ''}
              </div>
            </div>
            <button onClick={() => startEdit(item)} style={{ ...S.btnSm, color: '#065f46', borderColor: '#6ee7b7', background: '#f0fdf4' }}>✏️</button>
            <button onClick={() => handleDelete(item.id, item.word_text)} disabled={delId === item.id}
              style={{ ...S.btnSm, color: '#dc2626', borderColor: '#fca5a5', background: '#fef2f2' }}>
              {delId === item.id ? '…' : '🗑️'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── confetti burst (preset positions — no Math.random in render) ─── */
const CONFETTI_DOTS = [
  { tx:-80,  ty:-100, c:'#fbbf24', sz:11, dl:0   },
  { tx:0,    ty:-120, c:'#10b981', sz:13, dl:40  },
  { tx:80,   ty:-100, c:'#3b82f6', sz:9,  dl:80  },
  { tx:115,  ty:0,    c:'#ec4899', sz:12, dl:120 },
  { tx:80,   ty:90,   c:'#f97316', sz:10, dl:160 },
  { tx:0,    ty:115,  c:'#8b5cf6', sz:11, dl:200 },
  { tx:-80,  ty:90,   c:'#fbbf24', sz:9,  dl:240 },
  { tx:-115, ty:0,    c:'#10b981', sz:13, dl:280 },
  { tx:-55,  ty:-110, c:'#ef4444', sz:8,  dl:20  },
  { tx:55,   ty:-110, c:'#3b82f6', sz:10, dl:60  },
  { tx:110,  ty:-55,  c:'#8b5cf6', sz:9,  dl:100 },
  { tx:110,  ty:55,   c:'#fbbf24', sz:11, dl:140 },
  { tx:55,   ty:110,  c:'#ec4899', sz:8,  dl:180 },
  { tx:-55,  ty:110,  c:'#10b981', sz:12, dl:220 },
  { tx:-110, ty:55,   c:'#f97316', sz:9,  dl:260 },
  { tx:-110, ty:-55,  c:'#3b82f6', sz:10, dl:300 },
];
function ConfettiBurst() {
  return (
    <div style={{ position:'absolute', left:'50%', top:'50%', pointerEvents:'none', zIndex:50 }}>
      {CONFETTI_DOTS.map((d, i) => (
        <div key={i} style={{
          position:'absolute',
          width:d.sz, height:d.sz,
          background:d.c,
          borderRadius:'50%',
          left:-d.sz/2, top:-d.sz/2,
          animation:`confettiBurst .75s ${d.dl}ms cubic-bezier(0,.9,.57,1) both`,
          '--tx':`${d.tx}px`, '--ty':`${d.ty}px`,
        }} />
      ))}
    </div>
  );
}

/* ─── shared styles ─── */
const S = {
  label:      { display: 'block', fontSize: '.8rem', fontWeight: 600, color: '#475569', marginBottom: 4, fontFamily: 'Cairo, sans-serif' },
  input:      { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #d1d5db', fontFamily: 'Cairo, sans-serif', fontSize: '.9rem', boxSizing: 'border-box', direction: 'rtl', outline: 'none' },
  btnPrimary: { background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: '.9rem' },
  btnSm:      { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7, padding: '6px 10px', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontSize: '.82rem' },
};

/* ═══════════════════ MAIN PAGE ═══════════════════ */
export default function WordSmashGame() {
  const [phase,     setPhase]     = useState('start');
  const [dbWords,   setDbWords]   = useState([]);
  const [gameWords, setGameWords] = useState([]);
  const [queue,     setQueue]     = useState([]);
  const [cur,       setCur]       = useState(0);
  const [score,     setScore]     = useState(0);
  const [chosen,    setChosen]    = useState(null);
  const [isRight,   setIsRight]   = useState(null);
  const [charAnim,    setCharAnim]    = useState('idle');
  const [wordAnim,    setWordAnim]    = useState('idle');    // 'idle' | 'shake'
  const [showConfetti,setShowConfetti]= useState(false);
  const [confettiKey, setConfettiKey] = useState(0);        // increment → remount burst
  const [isTeacher, setIsTeacher] = useState(false);
  const [showMgr,   setShowMgr]   = useState(false);
  const [cfg,       setCfg]       = useState({ topic: '', grade: 0, questionsPerRound: 10 });
  const [loadingWords, setLoadingWords] = useState(true);

  /* role detection */
  useEffect(() => {
    import('../../../../lib/supabase').then(({ createClient }) => {
      const sb = createClient();
      sb.auth.getUser().then(({ data: { user } }) => {
        const role = user?.user_metadata?.role ?? '';
        setIsTeacher(['super_admin', 'admin', 'teacher'].includes(role));
      }).catch(() => {});
    }).catch(() => {});
  }, []);

  /* load all words (teacher only, for manager) */
  const loadDbWords = useCallback(async () => {
    if (!isTeacher) return;
    const res  = await fetch('/api/games/word-smash');
    const json = await res.json().catch(() => ({ words: [] }));
    setDbWords(json.words || []);
  }, [isTeacher]);

  /* load game words with filters */
  const loadGameWords = useCallback(async () => {
    setLoadingWords(true);
    const p = new URLSearchParams();
    if (cfg.topic)    p.set('topic', cfg.topic);
    if (cfg.grade > 0) p.set('grade', String(cfg.grade));
    const res  = await fetch(`/api/games/word-smash?${p}`);
    const json = await res.json().catch(() => ({ words: [] }));
    setGameWords(json.words || []);
    setLoadingWords(false);
  }, [cfg.topic, cfg.grade]);

  useEffect(() => { loadDbWords(); },   [loadDbWords]);
  useEffect(() => { loadGameWords(); }, [loadGameWords]);

  /* build queue */
  const buildQueue = useCallback((words, count) => {
    let pool = shuffle([...words]);
    while (pool.length < count) pool = [...pool, ...shuffle([...words])];
    return pool.slice(0, count).map(w => ({
      ...w,
      opts: shuffle([
        { segs: w.correct_segments,          isCorrect: true  },
        { segs: (w.wrong_options || [])[0] || [], isCorrect: false },
        { segs: (w.wrong_options || [])[1] || [], isCorrect: false },
      ]),
    }));
  }, []);

  const startGame = useCallback(() => {
    if (gameWords.length === 0) return;
    const count = isTeacher ? cfg.questionsPerRound : Math.min(gameWords.length, 15);
    setQueue(buildQueue(gameWords, count));
    setCur(0); setScore(0); setChosen(null); setIsRight(null); setCharAnim('idle');
    setPhase('playing');
  }, [gameWords, cfg, isTeacher, buildQueue]);

  const pick = useCallback((idx) => {
    if (chosen !== null) return;
    const w     = queue[cur];
    const right = w.opts[idx].isCorrect;
    setChosen(idx);
    setIsRight(right);
    setCharAnim(right ? 'smash' : 'wrong');
    if (right) {
      setScore(s => s + 1);
      speak(w.word_text);
      setWordAnim('shake');
      setConfettiKey(k => k + 1);
      setShowConfetti(true);
      setTimeout(() => { setWordAnim('idle'); setShowConfetti(false); }, 900);
    }
  }, [chosen, cur, queue]);

  const next = useCallback(() => {
    const n = cur + 1;
    if (n >= queue.length) setPhase('finished');
    else { setCur(n); setChosen(null); setIsRight(null); setCharAnim('idle'); setWordAnim('idle'); }
  }, [cur, queue.length]);

  const restart = () => {
    setPhase('start'); setQueue([]); setCur(0); setScore(0);
    setChosen(null); setIsRight(null); setCharAnim('idle'); setWordAnim('idle'); setShowConfetti(false);
  };

  /* ══════ RENDER ══════ */
  return (
    <>
      <style>{`
        /* ── hammer animations ── */
        @keyframes hammerSmash {
          0%   { transform: rotate(-42deg) translateY(-12px); }
          35%  { transform: rotate(28deg)  translateY(26px); }
          55%  { transform: rotate(-14deg) translateY(12px); }
          72%  { transform: rotate(10deg)  translateY(18px); }
          87%  { transform: rotate(-5deg)  translateY(8px); }
          100% { transform: rotate(-5deg)  translateY(0); }
        }
        @keyframes hammerWrong {
          0%,100% { transform: translateX(0) rotate(0); }
          15%     { transform: translateX(-12px) rotate(-8deg); }
          35%     { transform: translateX(12px)  rotate(8deg); }
          55%     { transform: translateX(-8px)  rotate(-5deg); }
          75%     { transform: translateX(8px)   rotate(5deg); }
          90%     { transform: translateX(-3px)  rotate(-2deg); }
        }
        /* ── word shake on correct ── */
        @keyframes wordShake {
          0%   { transform: scale(1) rotate(0deg); }
          12%  { transform: scale(1.14) rotate(-4deg); }
          28%  { transform: scale(0.9)  rotate(4deg); }
          44%  { transform: scale(1.08) rotate(-3deg); }
          60%  { transform: scale(0.96) rotate(2deg); }
          78%  { transform: scale(1.03) rotate(-1deg); }
          100% { transform: scale(1)    rotate(0deg); }
        }
        /* ── fahim gentle float ── */
        @keyframes fahimFloat {
          0%,100% { transform: translateY(0px); }
          50%     { transform: translateY(-8px); }
        }
        /* ── card entrance ── */
        @keyframes cardPop {
          0%   { transform: scale(.86); opacity: 0; }
          60%  { transform: scale(1.03); opacity: 1; }
          100% { transform: scale(1);   opacity: 1; }
        }
        /* ── correct badge wave (cascades via animation-delay) ── */
        @keyframes badgeWave {
          0%,100% { transform: translateY(0)   scale(1); }
          30%     { transform: translateY(-10px) scale(1.14); }
          60%     { transform: translateY(4px)   scale(0.94); }
          80%     { transform: translateY(-3px)  scale(1.04); }
        }
        /* ── feedback slide-up bounce ── */
        @keyframes slideUpBounce {
          0%   { transform: translateY(32px); opacity: 0; }
          55%  { transform: translateY(-6px); opacity: 1; }
          75%  { transform: translateY(3px); }
          100% { transform: translateY(0);   opacity: 1; }
        }
        /* ── confetti particle (uses CSS custom props set inline) ── */
        @keyframes confettiBurst {
          from { transform: translate(0,0) scale(1);   opacity: 1; }
          to   { transform: translate(var(--tx),var(--ty)) scale(.15); opacity: 0; }
        }
        /* ── start screen hammer pulse ── */
        @keyframes hammerPulse {
          0%,100% { transform: scale(1) rotate(0deg); }
          40%     { transform: scale(1.2) rotate(-15deg); }
          60%     { transform: scale(1.1) rotate(10deg); }
        }
        /* ── card ring on correct ── */
        @keyframes correctRing {
          0%   { box-shadow: 0 0 0 0 rgba(16,185,129,.55); }
          60%  { box-shadow: 0 0 0 18px rgba(16,185,129,0); }
          100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
        }

        /* ── base card ── */
        .ws-card {
          border-radius: 16px;
          padding: 16px 12px;
          cursor: pointer;
          transition: transform .18s, box-shadow .18s;
          user-select: none;
          animation: cardPop .32s both;
          border: 2.5px solid #e2e8f0;
          background: #fff;
          min-height: 68px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          position: relative;
          overflow: visible;
        }
        /* hover lift — only when interactive class is present */
        .ws-card-interactive:hover {
          transform: translateY(-4px) scale(1.03);
          box-shadow: 0 14px 36px rgba(0,0,0,.16);
        }
        .ws-card-interactive:active {
          transform: scale(0.97);
          box-shadow: 0 3px 10px rgba(0,0,0,.1);
        }
        /* green ring on correct reveal */
        .ws-card-correct-ring {
          animation: correctRing .7s ease forwards;
        }
        @media (max-width: 480px) {
          .ws-card { padding: 12px 8px; }
        }
      `}</style>

      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#065f46 0%,#10b981 50%,#34d399 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 12px', fontFamily: "'Cairo','Tajawal',sans-serif", direction: 'rtl' }}>

        {/* ── START ── */}
        {phase === 'start' && (
          <div style={{ background: '#fff', borderRadius: 24, padding: '36px 28px', maxWidth: 440, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, textAlign: 'center' }}>

            {/* teacher buttons */}
            {isTeacher && (
              <div style={{ display: 'flex', gap: 8, width: '100%', justifyContent: 'flex-end', marginBottom: -8 }}>
                <button onClick={() => setShowMgr(s => !s)} style={{ ...S.btnSm, color: showMgr ? '#065f46' : undefined, fontSize: '.85rem' }}>
                  {showMgr ? '✕ إغلاق الإدارة' : '⚙️ إدارة الكلمات'}
                </button>
              </div>
            )}

            {isTeacher && showMgr && (
              <div style={{ width: '100%', textAlign: 'right' }}>
                <WordManager dbWords={dbWords} onRefresh={() => { loadDbWords(); loadGameWords(); }} />
              </div>
            )}

            {/* header */}
            <div style={{ fontSize: '3.8rem', lineHeight: 1, display: 'inline-block', animation: 'hammerPulse 1.8s ease-in-out infinite' }}>🔨</div>
            <h1 style={{ fontSize: '1.9rem', fontWeight: 900, color: '#1a1a2e', margin: 0 }}>مطرقة التفكيك!</h1>
            <p style={{ fontSize: '.97rem', color: '#6b7280', lineHeight: 1.8, margin: 0 }}>
              سأريك كلمة مُشكَّلة.<br />
              اختر الطريقة الصحيحة لتقطيعها إلى مقاطع!
            </p>

            {/* teacher cfg */}
            {isTeacher && (
              <div style={{ background: '#f0fdf4', border: '1.5px solid #d1fae5', borderRadius: 12, padding: '14px 16px', width: '100%', textAlign: 'right' }}>
                <div style={{ fontWeight: 700, color: '#065f46', marginBottom: 10, fontSize: '.9rem' }}>⚙️ إعدادات اللعبة</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={{ ...S.label, fontSize: '.75rem' }}>الموضوع</label>
                    <select value={cfg.topic} onChange={e => setCfg(c => ({ ...c, topic: e.target.value }))} style={{ ...S.input, fontSize: '.8rem' }}>
                      <option value="">الكل</option>
                      {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ ...S.label, fontSize: '.75rem' }}>الصف</label>
                    <select value={cfg.grade} onChange={e => setCfg(c => ({ ...c, grade: Number(e.target.value) }))} style={{ ...S.input, fontSize: '.8rem' }}>
                      <option value={0}>الكل</option>
                      {[1,2,3,4,5,6,7,8,9].map(g => <option key={g} value={g}>ص{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ ...S.label, fontSize: '.75rem' }}>أسئلة ({cfg.questionsPerRound})</label>
                    <input type="range" min={3} max={20} value={cfg.questionsPerRound}
                      onChange={e => setCfg(c => ({ ...c, questionsPerRound: Number(e.target.value) }))}
                      style={{ width: '100%', accentColor: '#10b981' }} />
                  </div>
                </div>
              </div>
            )}

            {/* stats & start */}
            {loadingWords ? (
              <div style={{ color: '#94a3b8', fontSize: '.9rem' }}>⏳ جارٍ التحميل...</div>
            ) : gameWords.length === 0 ? (
              <div style={{ background: '#fef9c3', border: '1.5px solid #fde68a', borderRadius: 12, padding: '14px 20px', color: '#92400e', fontSize: '.9rem', width: '100%', textAlign: 'center' }}>
                {isTeacher ? '⚠️ لا توجد كلمات — أضف كلمات من إدارة الكلمات أعلاه.' : '⚠️ اللعبة غير متاحة حالياً. تواصل مع معلمك.'}
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', background: '#f9fafb', borderRadius: 12, padding: '12px 20px', width: '100%', justifyContent: 'space-around' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>{gameWords.length}</div>
                    <div style={{ fontSize: '.78rem', color: '#9ca3af' }}>كلمة متاحة</div>
                  </div>
                  <div style={{ width: 1, height: 36, background: '#e5e7eb' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>
                      {isTeacher ? cfg.questionsPerRound : Math.min(gameWords.length, 15)}
                    </div>
                    <div style={{ fontSize: '.78rem', color: '#9ca3af' }}>سؤال في الجولة</div>
                  </div>
                  <div style={{ width: 1, height: 36, background: '#e5e7eb' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>3</div>
                    <div style={{ fontSize: '.78rem', color: '#9ca3af' }}>خيارات</div>
                  </div>
                </div>

                <button onClick={startGame} style={{
                  background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none',
                  borderRadius: 14, padding: '14px 0', fontSize: '1.1rem', fontWeight: 800,
                  cursor: 'pointer', width: '100%', boxShadow: '0 4px 16px rgba(16,185,129,.4)',
                }}>
                  🔨 ابدأ التفكيك!
                </button>
              </>
            )}

            <Link href="/library" style={{ color: '#9ca3af', fontSize: '.87rem', textDecoration: 'none' }}>← العودة للمكتبة</Link>
          </div>
        )}

        {/* ── PLAYING ── */}
        {phase === 'playing' && (() => {
          const w    = queue[cur];
          const opts = w?.opts || [];
          return (
            <>
              {/* top bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', maxWidth: 540, marginBottom: 16, color: '#fff' }}>
                <span style={{ fontSize: '1rem', fontWeight: 700, flexShrink: 0, background: 'rgba(255,255,255,.2)', borderRadius: 20, padding: '4px 14px' }}>
                  ✨ {score}
                </span>
                <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,.25)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#fbbf24', borderRadius: 4, width: `${((cur + 1) / queue.length) * 100}%`, transition: 'width .4s' }} />
                </div>
                <span style={{ fontSize: '.88rem', opacity: .85, flexShrink: 0 }}>{cur + 1} / {queue.length}</span>
              </div>

              {/* main card */}
              <div style={{ background: '#fff', borderRadius: 24, padding: '28px 20px', width: '100%', maxWidth: 540, boxShadow: '0 24px 64px rgba(0,0,0,.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>

                {/* ── word display ── */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '.8rem', color: '#94a3b8', marginBottom: 10, fontWeight: 600 }}>قطّع هذه الكلمة إلى مقاطع:</div>

                  {/* 🔨 hammer + image side-by-side (or hammer alone) */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{
                      fontSize: w.image_url ? '2.2rem' : '2.8rem',
                      transformOrigin: 'bottom right',
                      display: 'inline-block',
                      animation: charAnim === 'smash' ? 'hammerSmash .6s ease both'
                               : charAnim === 'wrong'  ? 'hammerWrong .55s ease both'
                               : 'none',
                    }}>🔨</div>
                    {w.image_url && (
                      <img
                        src={w.image_url}
                        alt={w.word_text}
                        style={{
                          width: 96, height: 96,
                          objectFit: 'contain',
                          borderRadius: 18,
                          border: '3px solid #d1fae5',
                          background: '#f0fdf4',
                          boxShadow: '0 6px 20px rgba(16,185,129,.22)',
                        }}
                      />
                    )}
                  </div>

                  {/* word + listen button in one flex row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{
                      fontSize: '2.8rem', fontWeight: 900, color: '#1a1a2e', lineHeight: 1.3, letterSpacing: 2,
                      display: 'inline-block',
                      animation: wordAnim === 'shake' ? 'wordShake .65s ease both' : 'none',
                    }}>
                      {w.word_text}
                    </div>
                    <button onClick={() => speak(w.word_text)} title="استمع" style={{
                      background: '#f0fdf4', border: '1.5px solid #86efac',
                      borderRadius: 20, padding: '6px 14px',
                      cursor: 'pointer', fontSize: '.85rem',
                      color: '#065f46', fontWeight: 700, flexShrink: 0,
                    }}>
                      🔊 استمع
                    </button>
                  </div>
                </div>

                {/* 3 choice cards — stacked vertically so each has full width for the syllable row */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
                  {opts.map((opt, idx) => {
                    const segs   = (opt.segs || []).filter(Boolean);
                    const picked = chosen === idx;
                    const rev    = chosen !== null;
                    const cardBorder = !rev ? '#d1d5db' : opt.isCorrect ? '#10b981' : picked ? '#ef4444' : '#e5e7eb';
                    const cardBg    = !rev ? '#fff'     : opt.isCorrect ? '#ecfdf5' : picked ? '#fef2f2' : '#f9fafb';
                    const opacity   = rev && !opt.isCorrect && !picked ? 0.28 : 1;
                    const badgeBg   = !rev ? '#eef2ff'  : opt.isCorrect ? '#d1fae5' : picked ? '#fee2e2' : '#f1f5f9';
                    const badgeClr  = !rev ? '#1e3a5f'  : opt.isCorrect ? '#065f46' : picked ? '#991b1b' : '#9ca3af';
                    /* card classes: add hover/tap class only when not yet answered */
                    const cardClass = [
                      'ws-card',
                      !rev ? 'ws-card-interactive' : '',
                      rev && opt.isCorrect ? 'ws-card-correct-ring' : '',
                    ].filter(Boolean).join(' ');
                    return (
                      <div
                        key={idx}
                        className={cardClass}
                        onClick={() => pick(idx)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '14px 18px',
                          minHeight: 68,
                          width: '100%',
                          boxSizing: 'border-box',
                          borderColor: cardBorder,
                          background: cardBg,
                          opacity,
                          cursor: rev ? 'default' : 'pointer',
                          animationDelay: `${idx * .09}s`,
                          gap: 10,
                        }}
                      >
                        {/* confetti burst — anchored to card centre on correct */}
                        {rev && opt.isCorrect && showConfetti && (
                          <ConfettiBurst key={confettiKey} />
                        )}

                        {/* ── syllables: single strict RTL horizontal row, never wrap ── */}
                        <div style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'row',
                          direction: 'rtl',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexWrap: 'nowrap',
                          gap: 8,
                          overflow: 'hidden',
                        }}>
                          {segs.length === 0 ? (
                            <span style={{ color: '#9ca3af', fontSize: '.9rem' }}>—</span>
                          ) : segs.map((seg, si) => (
                            <span
                              key={si}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: badgeBg,
                                borderRadius: 12,
                                padding: '5px 16px',
                                fontSize: '1.45rem',
                                fontWeight: 800,
                                color: badgeClr,
                                minWidth: 52,
                                flexShrink: 0,
                                whiteSpace: 'nowrap',
                                fontFamily: "'Cairo','Tajawal',sans-serif",
                                direction: 'rtl',
                                lineHeight: 1.4,
                                /* wave animation on each correct badge with cascade delay */
                                animation: rev && opt.isCorrect
                                  ? `badgeWave .55s ${si * 80}ms ease both`
                                  : 'none',
                              }}
                            >
                              {addArm(seg, si === segs.length - 1)}
                            </span>
                          ))}
                        </div>

                        {/* status icon */}
                        {rev && (
                          <span style={{
                            fontSize: '1.25rem', fontWeight: 800, flexShrink: 0,
                            color: opt.isCorrect ? '#10b981' : picked ? '#ef4444' : 'transparent',
                            animation: rev && (opt.isCorrect || picked) ? 'cardPop .3s ease both' : 'none',
                          }}>
                            {opt.isCorrect ? '✅' : picked ? '❌' : '✗'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* feedback & rule — slide-up bounce entrance */}
                {chosen !== null && (
                  <>
                    {/* status banner */}
                    <div style={{
                      padding: '11px 18px',
                      borderRadius: 12,
                      width: '100%',
                      textAlign: 'center',
                      fontWeight: 800,
                      fontSize: '1.05rem',
                      background: isRight ? '#d1fae5' : '#fee2e2',
                      color:      isRight ? '#065f46' : '#991b1b',
                      animation: 'slideUpBounce .42s ease both',
                      border: `1.5px solid ${isRight ? '#6ee7b7' : '#fca5a5'}`,
                    }}>
                      {isRight ? '✅ أحسنت! إجابة صحيحة 🎉' : `❌ الإجابة الصحيحة: ${formatSegs(queue[cur].correct_segments)}`}
                    </div>

                    {/* rule box */}
                    <div style={{
                      background: '#fffbeb',
                      border: '1.5px solid #fde68a',
                      borderRadius: 14,
                      padding: '13px 16px',
                      width: '100%',
                      animation: 'slideUpBounce .45s .08s ease both',
                      direction: 'rtl',
                      textAlign: 'right',
                    }}>
                      <div style={{ fontWeight: 800, color: '#92400e', marginBottom: 5, fontSize: '.84rem' }}>📌 القاعدة:</div>
                      <div style={{ color: '#78350f', fontSize: '.93rem', lineHeight: 1.75 }}>{queue[cur].rule_text}</div>
                    </div>

                    {/* next button — pops in */}
                    <button onClick={next} style={{
                      background: 'linear-gradient(135deg,#10b981,#059669)',
                      color: '#fff', border: 'none', borderRadius: 14,
                      padding: '13px 0', fontSize: '1.08rem', fontWeight: 800,
                      cursor: 'pointer', width: '100%', maxWidth: 300,
                      animation: 'cardPop .35s .2s ease both',
                      boxShadow: '0 6px 20px rgba(16,185,129,.4)',
                      transition: 'transform .15s, box-shadow .15s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.transform='scale(1.04)'; e.currentTarget.style.boxShadow='0 10px 28px rgba(16,185,129,.5)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform='scale(1)';    e.currentTarget.style.boxShadow='0 6px 20px rgba(16,185,129,.4)'; }}
                    >
                      {cur + 1 >= queue.length ? '🏁 النتيجة النهائية' : 'التالي ←'}
                    </button>
                  </>
                )}
              </div>

              <button onClick={() => setPhase('start')} style={{ color: 'rgba(255,255,255,.65)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 16, fontSize: '.87rem' }}>
                ✕ إنهاء اللعبة
              </button>
            </>
          );
        })()}

        {/* ── FINISHED ── */}
        {phase === 'finished' && (() => {
          const pct   = queue.length > 0 ? Math.round((score / queue.length) * 100) : 0;
          const stars = pct >= 80 ? 3 : pct >= 50 ? 2 : 1;
          const msg   = pct >= 80 ? 'ممتاز! أنت مفكّك ماهر 🏆'
                      : pct >= 50 ? 'جيد! يمكنك التحسّن أكثر 💪'
                      : 'لا تيأس! المحاولة مفتاح النجاح 🌟';
          return (
            <div style={{ background: '#fff', borderRadius: 24, padding: '40px 28px', maxWidth: 440, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,.3)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
              <div style={{ fontSize: '2.8rem' }}>{'⭐'.repeat(stars)}</div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#1a1a2e', margin: 0 }}>أحسنت!</h2>
              <div style={{ fontSize: '3.2rem', fontWeight: 800, color: '#10b981' }}>{score} / {queue.length}</div>
              <div style={{ color: '#6b7280', fontSize: '1rem', fontWeight: 600 }}>{msg}</div>

              {/* score bar */}
              <div style={{ width: '100%', background: '#f1f5f9', borderRadius: 8, height: 12, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'linear-gradient(90deg,#10b981,#34d399)', width: `${pct}%`, borderRadius: 8, transition: 'width 1s ease' }} />
              </div>
              <div style={{ fontSize: '.85rem', color: '#64748b' }}>{pct}% إجابات صحيحة</div>

              <button onClick={startGame} style={{
                background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none',
                borderRadius: 14, padding: '14px 0', fontSize: '1.05rem', fontWeight: 800,
                cursor: 'pointer', width: '100%', boxShadow: '0 4px 16px rgba(16,185,129,.35)',
              }}>
                🔄 العب مرة أخرى
              </button>
              <Link href="/library" style={{ color: '#9ca3af', fontSize: '.87rem', textDecoration: 'none' }}>← العودة للمكتبة</Link>
            </div>
          );
        })()}

      </div>
    </>
  );
}
