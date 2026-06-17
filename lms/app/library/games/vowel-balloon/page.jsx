'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '../../../../lib/supabase';
import Navbar from '../../../../components/Navbar';

/* ─── vowel config ─── */
const VOWELS = {
  fatha: { name: 'فَتحة', mark: 'َ', color: '#F59E0B', light: '#FFF8E1', dark: '#B45309', emoji: '☀️', hint: 'الفتحة نفتح فمنا عند النطق وتكون فوق الحرف!' },
  kasra: { name: 'كَسرة', mark: 'ِ', color: '#3B82F6', light: '#EFF6FF', dark: '#1D4ED8', emoji: '💧', hint: 'الكسرة نبتسم عند نطقها وتكون تحت الحرف!' },
  damma: { name: 'ضَمة',  mark: 'ُ', color: '#10B981', light: '#ECFDF5', dark: '#065F46', emoji: '🌙', hint: 'الضمة ندمّ شفاهنا وتكون فوق الحرف!' },
};
const VOWEL_KEYS = ['fatha', 'kasra', 'damma'];

/* ─── fallback demo words ─── */
const DEMO = [
  { id: 'd1', base_letter: 'ب', correct_vowel: 'fatha',  rule_text: 'الفتحة نفتح فمنا عند النطق وتكون فوق الحرف!' },
  { id: 'd2', base_letter: 'م', correct_vowel: 'kasra',  rule_text: 'الكسرة نبتسم عند نطقها وتكون تحت الحرف!' },
  { id: 'd3', base_letter: 'د', correct_vowel: 'damma',  rule_text: 'الضمة ندمّ شفاهنا وتكون فوق الحرف!' },
  { id: 'd4', base_letter: 'س', correct_vowel: 'fatha',  rule_text: 'الفتحة نفتح فمنا عند النطق وتكون فوق الحرف!' },
  { id: 'd5', base_letter: 'ك', correct_vowel: 'kasra',  rule_text: 'الكسرة نبتسم عند نطقها وتكون تحت الحرف!' },
  { id: 'd6', base_letter: 'ن', correct_vowel: 'damma',  rule_text: 'الضمة ندمّ شفاهنا وتكون فوق الحرف!' },
];

/* ─── TTS ─── */
function speak(text) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ar-SA'; u.rate = 0.85; u.pitch = 1.1;
  const voices = window.speechSynthesis.getVoices();
  const ar = voices.find(v => v.lang?.startsWith('ar'));
  if (ar) u.voice = ar;
  window.speechSynthesis.speak(u);
}

/* ─── confetti ─── */
const DOTS = [
  { tx:-90, ty:-110, c:'#fbbf24', sz:12, dl:0   },
  { tx:0,   ty:-130, c:'#10b981', sz:14, dl:30  },
  { tx:90,  ty:-110, c:'#3b82f6', sz:11, dl:60  },
  { tx:-60, ty:-140, c:'#ec4899', sz:10, dl:20  },
  { tx:60,  ty:-140, c:'#8b5cf6', sz:13, dl:50  },
  { tx:-110,ty:-70,  c:'#f97316', sz:10, dl:10  },
  { tx:110, ty:-70,  c:'#06b6d4', sz:12, dl:40  },
  { tx:-80, ty:-160, c:'#ef4444', sz:9,  dl:70  },
  { tx:80,  ty:-160, c:'#fbbf24', sz:10, dl:15  },
  { tx:0,   ty:-170, c:'#10b981', sz:11, dl:55  },
  { tx:-130,ty:-90,  c:'#3b82f6', sz:9,  dl:35  },
  { tx:130, ty:-90,  c:'#ec4899', sz:10, dl:25  },
  { tx:-50, ty:-180, c:'#8b5cf6', sz:8,  dl:80  },
  { tx:50,  ty:-180, c:'#f97316', sz:9,  dl:45  },
  { tx:-20, ty:-150, c:'#06b6d4', sz:11, dl:65  },
  { tx:20,  ty:-150, c:'#ef4444', sz:10, dl:5   },
];
function ConfettiBurst() {
  return (
    <div style={{ position:'absolute', left:'50%', top:'40%', pointerEvents:'none', zIndex:60 }}>
      {DOTS.map((d, i) => (
        <div key={i} style={{
          position:'absolute', width:d.sz, height:d.sz, borderRadius:'50%',
          background:d.c, left:-d.sz/2, top:-d.sz/2,
          animation:`vbConfetti .8s ${d.dl}ms cubic-bezier(0,.9,.57,1) both`,
          '--tx':`${d.tx}px`, '--ty':`${d.ty}px`,
        }} />
      ))}
    </div>
  );
}

/* ─── Balloon ─── */
function Balloon({ vowelKey, baseLetter, floatVariant, state, onClick }) {
  const v = VOWELS[vowelKey];
  const label = baseLetter + v.mark;
  const animMap = { idle: `vbFloat${floatVariant} 3.${floatVariant}s ease-in-out infinite`, fly: 'vbFly .65s cubic-bezier(0.22,1,0.36,1) forwards', shake: 'vbShake .5s ease both' };
  const anim = animMap[state] || animMap.idle;
  return (
    <div
      onClick={onClick}
      style={{
        display:'flex', flexDirection:'column', alignItems:'center', gap:0,
        cursor:'pointer', userSelect:'none', WebkitUserSelect:'none',
        animation: anim,
        willChange:'transform',
      }}
    >
      {/* balloon body */}
      <div style={{
        width:100, height:120,
        background:`radial-gradient(circle at 34% 30%, ${v.light} 0%, ${v.color} 55%, ${v.dark} 100%)`,
        borderRadius:'50% 50% 50% 50% / 60% 60% 40% 40%',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        gap:4, boxShadow:`0 8px 28px ${v.color}55, inset 0 -6px 18px rgba(0,0,0,.18)`,
        position:'relative', transition:'filter .1s',
      }}>
        {/* shine */}
        <div style={{
          position:'absolute', top:16, left:28, width:22, height:14,
          background:'rgba(255,255,255,.38)', borderRadius:'50%', transform:'rotate(-20deg)',
        }} />
        <span style={{ fontSize:'2.4rem', lineHeight:1, color:'#fff', textShadow:'0 2px 8px rgba(0,0,0,.35)', fontFamily:"'Cairo','Tajawal',sans-serif", fontWeight:900 }}>
          {label}
        </span>
        <span style={{ fontSize:'.72rem', color:'rgba(255,255,255,.92)', fontWeight:700, fontFamily:"'Cairo','Tajawal',sans-serif" }}>
          {v.name}
        </span>
      </div>
      {/* knot */}
      <div style={{ width:12, height:10, background:v.dark, borderRadius:'0 0 50% 50% / 0 0 8px 8px' }} />
      {/* string */}
      <svg width="2" height="55" style={{ display:'block' }}>
        <line x1="1" y1="0" x2="1" y2="55" stroke={v.dark} strokeWidth="2" strokeDasharray="4 3" />
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   WORD MANAGER (admin panel)
═══════════════════════════════════════════════════════ */
function WordManager({ user }) {
  const role = user?.user_metadata?.role ?? '';
  const allowed = ['super_admin','admin','teacher'].includes(role);
  const [items,    setItems]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState('');
  const [editId,   setEditId]   = useState(null);
  const [form,     setForm]     = useState({ base_letter:'', correct_vowel:'fatha', rule_text:'', topic:'', grade_level:'' });
  const [audioB64, setAudioB64] = useState('');
  const [recording, setRecording] = useState(false);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);

  const flash = (m, ok=true) => { setMsg({text:m,ok}); setTimeout(() => setMsg(''),3500); };

  useEffect(() => { fetchItems(); }, []);

  async function fetchItems() {
    setLoading(true);
    const r = await fetch('/api/games/vowel-balloon');
    const d = await r.json();
    setItems(d.items || []);
    setLoading(false);
  }

  function startEdit(it) {
    setEditId(it.id);
    setForm({ base_letter:it.base_letter, correct_vowel:it.correct_vowel, rule_text:it.rule_text, topic:it.topic||'', grade_level:it.grade_level||'' });
    setAudioB64(it.audio_url||'');
  }
  function cancelEdit() { setEditId(null); setForm({ base_letter:'', correct_vowel:'fatha', rule_text:'', topic:'', grade_level:'' }); setAudioB64(''); }

  async function save() {
    if (!form.base_letter.trim() || !form.rule_text.trim()) { flash('الحرف والقاعدة مطلوبان',false); return; }
    setSaving(true);
    const body = { ...form, audio_url: audioB64||null, grade_level: form.grade_level ? Number(form.grade_level) : null };
    const url  = editId ? `/api/games/vowel-balloon?id=${editId}` : '/api/games/vowel-balloon';
    const method = editId ? 'PUT' : 'POST';
    const r = await fetch(url, { method, headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    const d = await r.json();
    setSaving(false);
    if (d.error) { flash(d.error, false); return; }
    flash(editId ? 'تم التعديل ✅' : 'تمت الإضافة ✅');
    cancelEdit(); fetchItems();
  }

  async function del(id) {
    if (!confirm('حذف هذا العنصر؟')) return;
    const r = await fetch(`/api/games/vowel-balloon?id=${id}`, { method:'DELETE' });
    const d = await r.json();
    if (d.error) { flash(d.error, false); return; }
    flash('تم الحذف ✅'); fetchItems();
  }

  /* audio recording */
  async function toggleRecord() {
    if (recording) {
      mediaRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type:'audio/webm' });
        const reader = new FileReader();
        reader.onload = ev => setAudioB64(ev.target.result);
        reader.readAsDataURL(blob);
        setRecording(false);
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
    } catch { flash('تعذّر الوصول للميكروفون', false); }
  }

  function handleFileAudio(e) {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => setAudioB64(ev.target.result);
    reader.readAsDataURL(f);
  }

  if (!allowed) return null;

  const S = {
    box: { background:'#fff', borderRadius:18, padding:'24px 20px', boxShadow:'0 4px 20px rgba(0,0,0,.08)', marginTop:40 },
    h2:  { fontSize:'1.15rem', fontWeight:800, color:'#1e3a5f', marginBottom:16 },
    label: { fontSize:'.82rem', fontWeight:700, color:'#475569', marginBottom:4, display:'block' },
    input: { width:'100%', border:'1.5px solid #e2e8f0', borderRadius:10, padding:'9px 13px', fontSize:'.9rem', fontFamily:"'Cairo','Tajawal',sans-serif", outline:'none', boxSizing:'border-box', background:'#f8fafc' },
    select: { width:'100%', border:'1.5px solid #e2e8f0', borderRadius:10, padding:'9px 13px', fontSize:'.9rem', fontFamily:"'Cairo','Tajawal',sans-serif", outline:'none', boxSizing:'border-box', background:'#f8fafc' },
    row: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 },
    btn: (c) => ({ border:'none', borderRadius:10, padding:'10px 22px', fontWeight:700, fontSize:'.88rem', cursor:'pointer', fontFamily:"'Cairo','Tajawal',sans-serif", background:c==='green'?'linear-gradient(135deg,#10b981,#059669)':c==='red'?'#ef4444':c==='gray'?'#94a3b8':'linear-gradient(135deg,#3b82f6,#2563eb)', color:'#fff' }),
    table: { width:'100%', borderCollapse:'collapse', fontSize:'.85rem' },
    th: { padding:'8px 10px', background:'#f1f5f9', fontWeight:700, textAlign:'right', borderBottom:'2px solid #e2e8f0' },
    td: { padding:'8px 10px', borderBottom:'1px solid #f1f5f9', verticalAlign:'middle' },
  };

  return (
    <div style={S.box}>
      <h2 style={S.h2}>⚙️ لوحة تحكم منطاد الحركات</h2>

      {/* form */}
      <div style={{ background:'#f8fafc', borderRadius:14, padding:'18px 16px', marginBottom:20, border:'1.5px solid #e2e8f0' }}>
        <h3 style={{ fontSize:'.95rem', fontWeight:800, color:'#1e3a5f', marginBottom:12 }}>
          {editId ? '✏️ تعديل عنصر' : '➕ إضافة عنصر جديد'}
        </h3>
        <div style={S.row}>
          <div>
            <label style={S.label}>الحرف</label>
            <input style={S.input} maxLength={2} value={form.base_letter}
              onChange={e => setForm(f => ({...f, base_letter: e.target.value}))} placeholder="ب" />
          </div>
          <div>
            <label style={S.label}>الحركة الصحيحة</label>
            <select style={S.select} value={form.correct_vowel}
              onChange={e => setForm(f => ({...f, correct_vowel: e.target.value}))}>
              {VOWEL_KEYS.map(k => <option key={k} value={k}>{VOWELS[k].name} ({VOWELS[k].mark})</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom:12 }}>
          <label style={S.label}>نص القاعدة</label>
          <input style={S.input} value={form.rule_text}
            onChange={e => setForm(f => ({...f, rule_text: e.target.value}))} placeholder="الفتحة نفتح فمنا..." />
        </div>
        <div style={S.row}>
          <div>
            <label style={S.label}>الموضوع (اختياري)</label>
            <input style={S.input} value={form.topic}
              onChange={e => setForm(f => ({...f, topic: e.target.value}))} placeholder="حروف المد" />
          </div>
          <div>
            <label style={S.label}>المستوى (اختياري)</label>
            <input style={S.input} type="number" min={1} max={7} value={form.grade_level}
              onChange={e => setForm(f => ({...f, grade_level: e.target.value}))} placeholder="1" />
          </div>
        </div>

        {/* audio */}
        <div style={{ marginBottom:14 }}>
          <label style={S.label}>الصوت (اختياري)</label>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
            <button style={{ ...S.btn(recording?'red':'gray'), padding:'8px 14px' }} onClick={toggleRecord}>
              {recording ? '⏹ إيقاف التسجيل' : '🎙 تسجيل صوت'}
            </button>
            <label style={{ ...S.btn('gray'), padding:'8px 14px', cursor:'pointer' }}>
              📂 رفع ملف
              <input type="file" accept="audio/*" style={{ display:'none' }} onChange={handleFileAudio} />
            </label>
            {audioB64 && (
              <>
                <audio src={audioB64} controls style={{ height:34 }} />
                <button style={{ ...S.btn('red'), padding:'6px 12px', fontSize:'.78rem' }} onClick={() => setAudioB64('')}>✕</button>
              </>
            )}
          </div>
          {recording && <p style={{ color:'#ef4444', fontSize:'.8rem', marginTop:6 }}>🔴 جاري التسجيل...</p>}
        </div>

        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          {editId && <button style={S.btn('gray')} onClick={cancelEdit}>إلغاء</button>}
          <button style={S.btn('green')} onClick={save} disabled={saving}>
            {saving ? '...' : editId ? 'حفظ التعديل' : 'إضافة'}
          </button>
        </div>
        {msg && <p style={{ marginTop:10, color: msg.ok?'#10b981':'#ef4444', fontWeight:700, fontSize:'.85rem' }}>{msg.text}</p>}
      </div>

      {/* table */}
      {loading ? <p style={{ color:'#94a3b8', textAlign:'center' }}>جاري التحميل…</p> : (
        <div style={{ overflowX:'auto' }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>الحرف</th>
                <th style={S.th}>الحركة</th>
                <th style={S.th}>القاعدة</th>
                <th style={S.th}>الموضوع</th>
                <th style={S.th}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={5} style={{ ...S.td, textAlign:'center', color:'#94a3b8' }}>لا توجد عناصر بعد</td></tr>
              )}
              {items.map(it => (
                <tr key={it.id}>
                  <td style={{ ...S.td, fontSize:'1.6rem', textAlign:'center' }}>{it.base_letter + (VOWELS[it.correct_vowel]?.mark||'')}</td>
                  <td style={S.td}>{VOWELS[it.correct_vowel]?.name || it.correct_vowel}</td>
                  <td style={{ ...S.td, maxWidth:200 }}>{it.rule_text}</td>
                  <td style={S.td}>{it.topic || '—'}</td>
                  <td style={S.td}>
                    <div style={{ display:'flex', gap:6 }}>
                      <button style={{ ...S.btn(''), padding:'5px 12px', fontSize:'.78rem' }} onClick={() => startEdit(it)}>تعديل</button>
                      <button style={{ ...S.btn('red'), padding:'5px 12px', fontSize:'.78rem' }} onClick={() => del(it.id)}>حذف</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════ */
export default function VowelBalloonPage() {
  const [user,       setUser]       = useState(null);
  const [authDone,   setAuthDone]   = useState(false);
  const [items,      setItems]      = useState([]);
  const [queue,      setQueue]      = useState([]);
  const [cur,        setCur]        = useState(0);
  const [balloonStates, setBalloonStates] = useState({ fatha:'idle', kasra:'idle', damma:'idle' });
  const [chosen,     setChosen]     = useState(null);   // 'fatha'|'kasra'|'damma'|null
  const [isRight,    setIsRight]    = useState(null);
  const [score,      setScore]      = useState(0);
  const [showRule,   setShowRule]   = useState(false);
  const [wrongFeedback, setWrongFeedback] = useState(false);
  const [showConf,   setShowConf]   = useState(false);
  const [confKey,    setConfKey]    = useState(0);
  const [done,       setDone]       = useState(false);
  const [letterAnim, setLetterAnim] = useState('idle'); // 'idle'|'bounce'|'shake'
  const [tab,        setTab]        = useState('game'); // 'game'|'admin'
  const [dataSource, setDataSource] = useState('');

  /* auth */
  useEffect(() => {
    const sb = createClient();
    sb.auth.getUser().then(({ data: { user } }) => { setUser(user); setAuthDone(true); });
  }, []);

  /* fetch */
  useEffect(() => {
    fetch('/api/games/vowel-balloon')
      .then(r => r.json())
      .then(d => {
        const src = d.source || 'error';
        setDataSource(src);
        const raw = (src === 'database' && d.items?.length) ? d.items : DEMO;
        const shuffled = [...raw].sort(() => Math.random() - 0.5);
        setItems(raw);
        setQueue(shuffled);
      })
      .catch(() => { setItems(DEMO); setQueue([...DEMO].sort(() => Math.random() - 0.5)); setDataSource('demo'); });
  }, []);

  /* play audio/TTS when question changes */
  useEffect(() => {
    if (!queue.length || done) return;
    const q = queue[cur];
    if (!q) return;
    const delay = setTimeout(() => {
      if (q.audio_url) {
        const a = new Audio(q.audio_url);
        a.play().catch(() => speak(q.base_letter + (VOWELS[q.correct_vowel]?.mark || '')));
      } else {
        speak(q.base_letter + (VOWELS[q.correct_vowel]?.mark || ''));
      }
    }, 300);
    return () => clearTimeout(delay);
  }, [cur, queue, done]);

  const pick = useCallback((vowelKey) => {
    if (chosen !== null || done) return;
    const q = queue[cur];
    if (!q) return;
    const correct = q.correct_vowel === vowelKey;
    setChosen(vowelKey);
    setIsRight(correct);

    if (correct) {
      setBalloonStates(s => ({ ...s, [vowelKey]: 'fly' }));
      setLetterAnim('bounce');
      setScore(sc => sc + 1);
      setConfKey(k => k + 1);
      setShowConf(true);
      speak(q.base_letter + VOWELS[q.correct_vowel].mark);
      setTimeout(() => {
        setShowConf(false); setLetterAnim('idle');
        setBalloonStates({ fatha:'idle', kasra:'idle', damma:'idle' });
        setChosen(null); setIsRight(null); setShowRule(false); setWrongFeedback(false);
        if (cur + 1 >= queue.length) { setDone(true); return; }
        setCur(c => c + 1);
      }, 1200);
    } else {
      setBalloonStates(s => ({ ...s, [vowelKey]: 'shake' }));
      setLetterAnim('shake');
      setShowRule(true);
      setWrongFeedback(true);
      speak(q.base_letter + VOWELS[q.correct_vowel].mark);
      setTimeout(() => {
        setBalloonStates(s => ({ ...s, [vowelKey]: 'idle' }));
        setLetterAnim('idle');
        setChosen(null);
        setIsRight(null);
      }, 700);
    }
  }, [chosen, cur, done, queue]);

  function restart() {
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    setQueue(shuffled); setCur(0); setScore(0);
    setBalloonStates({ fatha:'idle', kasra:'idle', damma:'idle' });
    setChosen(null); setIsRight(null); setShowRule(false);
    setShowConf(false); setDone(false); setLetterAnim('idle'); setWrongFeedback(false);
  }

  const role = user?.user_metadata?.role ?? '';
  const isAdmin = ['super_admin','admin','teacher'].includes(role);
  const q = queue[cur];
  const total = queue.length;

  return (
    <>
      {authDone && <Navbar user={user} />}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&family=Tajawal:wght@400;700;900&display=swap');
        * { box-sizing: border-box; }

        @keyframes vbFloat0 {
          0%,100% { transform: translateY(0px) rotate(-1deg); }
          50%      { transform: translateY(-16px) rotate(1.5deg); }
        }
        @keyframes vbFloat1 {
          0%,100% { transform: translateY(-6px) rotate(1deg); }
          50%      { transform: translateY(10px) rotate(-2deg); }
        }
        @keyframes vbFloat2 {
          0%,100% { transform: translateY(-3px) rotate(.5deg); }
          50%      { transform: translateY(-18px) rotate(-1deg); }
        }
        @keyframes vbFly {
          0%   { transform: translateY(0)    scale(1)    opacity: 1; }
          60%  { transform: translateY(-120px) scale(1.2) opacity: 1; }
          100% { transform: translateY(-260px) scale(.5)  opacity: 0; }
        }
        @keyframes vbShake {
          0%,100% { transform: translateX(0); }
          15%     { transform: translateX(-9px) rotate(-4deg); }
          35%     { transform: translateX(9px) rotate(4deg); }
          55%     { transform: translateX(-7px) rotate(-2deg); }
          75%     { transform: translateX(7px) rotate(2deg); }
        }
        @keyframes vbLetterBounce {
          0%   { transform: scale(1); }
          30%  { transform: scale(1.35) rotate(-3deg); }
          55%  { transform: scale(.92) rotate(2deg); }
          75%  { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        @keyframes vbLetterShake {
          0%,100% { transform: translateX(0) rotate(0); }
          20%     { transform: translateX(-10px) rotate(-4deg); }
          40%     { transform: translateX(10px) rotate(4deg); }
          60%     { transform: translateX(-8px) rotate(-2deg); }
          80%     { transform: translateX(8px) rotate(2deg); }
        }
        @keyframes vbConfetti {
          from { transform: translate(0,0) scale(1); opacity:1; }
          to   { transform: translate(var(--tx),var(--ty)) scale(.1); opacity:0; }
        }
        @keyframes vbSlideUp {
          0%   { transform: translateY(24px); opacity:0; }
          55%  { transform: translateY(-5px); opacity:1; }
          100% { transform: translateY(0); opacity:1; }
        }
        @keyframes vbPop {
          0%   { transform: scale(0.3); opacity:0; }
          60%  { transform: scale(1.12); opacity:1; }
          100% { transform: scale(1); }
        }

        .vb-balloon-wrap { transition: filter .15s; }
        .vb-balloon-wrap:hover { filter: brightness(1.08); }
        .vb-balloon-wrap:active { filter: brightness(.95); }

        .vb-tab-btn {
          border: none; border-radius: 12px; padding: 9px 22px;
          font-weight: 800; font-size: .9rem; cursor: pointer;
          font-family: 'Cairo','Tajawal',sans-serif; transition: all .18s;
        }
        .vb-tab-btn.active { background: linear-gradient(135deg,#3b82f6,#2563eb); color:#fff; box-shadow:0 4px 14px rgba(59,130,246,.4); }
        .vb-tab-btn:not(.active) { background:#f1f5f9; color:#64748b; }
        .vb-tab-btn:not(.active):hover { background:#e2e8f0; }
      `}</style>

      <main style={{ minHeight:'100vh', background:'linear-gradient(160deg,#e0f2fe 0%,#f0fdf4 50%,#fef9c3 100%)', fontFamily:"'Cairo','Tajawal',sans-serif", padding:'16px 0 48px' }}>
        <div style={{ maxWidth:700, margin:'0 auto', padding:'0 16px' }}>

          {/* tabs (admin only) */}
          {isAdmin && (
            <div style={{ display:'flex', gap:10, justifyContent:'center', marginBottom:20 }}>
              <button className={`vb-tab-btn ${tab==='game'?'active':''}`} onClick={() => setTab('game')}>🎈 اللعبة</button>
              <button className={`vb-tab-btn ${tab==='admin'?'active':''}`} onClick={() => setTab('admin')}>⚙️ لوحة التحكم</button>
            </div>
          )}

          {tab === 'admin' ? (
            <WordManager user={user} />
          ) : (

            /* ── GAME ── */
            <div style={{ background:'rgba(255,255,255,.72)', backdropFilter:'blur(12px)', borderRadius:28, padding:'28px 20px 32px', boxShadow:'0 8px 40px rgba(0,0,0,.1)', position:'relative' }}>

              {/* header */}
              <div style={{ textAlign:'center', marginBottom:8 }}>
                <h1 style={{ fontSize:'1.5rem', fontWeight:900, color:'#1e3a5f', margin:0 }}>🎈 منطاد الحركات</h1>
                <p style={{ color:'#64748b', fontSize:'.85rem', margin:'4px 0 0' }}>اختر المنطاد الذي يحمل الحركة الصحيحة للحرف!</p>
                {dataSource === 'demo' && (
                  <span style={{ fontSize:'.72rem', background:'#fef3c7', color:'#92400e', borderRadius:20, padding:'2px 10px', display:'inline-block', marginTop:4 }}>وضع تجريبي</span>
                )}
              </div>

              {/* score + progress */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
                <span style={{ background:'linear-gradient(135deg,#f59e0b,#d97706)', color:'#fff', borderRadius:20, padding:'4px 14px', fontSize:'.88rem', fontWeight:800, boxShadow:'0 3px 10px rgba(245,158,11,.4)' }}>
                  ⭐ {score}
                </span>
                <span style={{ color:'#64748b', fontSize:'.85rem', fontWeight:700 }}>
                  {Math.min(cur+1, total)} / {total}
                </span>
              </div>

              {/* progress bar */}
              <div style={{ background:'#e2e8f0', borderRadius:99, height:8, marginBottom:24, overflow:'hidden' }}>
                <div style={{ background:'linear-gradient(90deg,#10b981,#3b82f6)', height:'100%', borderRadius:99, width:`${total ? Math.min(cur/total,1)*100 : 0}%`, transition:'width .4s ease' }} />
              </div>

              {done ? (
                /* ── DONE SCREEN ── */
                <div style={{ textAlign:'center', padding:'32px 0', animation:'vbPop .5s ease both' }}>
                  <div style={{ fontSize:'5rem', marginBottom:12 }}>🎉</div>
                  <h2 style={{ fontSize:'1.6rem', fontWeight:900, color:'#1e3a5f', margin:'0 0 8px' }}>أحسنت! انتهت اللعبة</h2>
                  <p style={{ color:'#64748b', fontSize:'1rem', marginBottom:20 }}>نقاطك: <strong style={{ color:'#f59e0b', fontSize:'1.3rem' }}>{score}</strong> من {total}</p>
                  <button onClick={restart} style={{ border:'none', borderRadius:50, padding:'12px 36px', background:'linear-gradient(135deg,#10b981,#059669)', color:'#fff', fontSize:'1rem', fontWeight:800, cursor:'pointer', boxShadow:'0 4px 18px rgba(16,185,129,.45)', fontFamily:"'Cairo','Tajawal',sans-serif" }}>
                    العب مجدداً ←
                  </button>
                </div>
              ) : !q ? (
                <p style={{ textAlign:'center', color:'#94a3b8', padding:'40px 0' }}>جاري التحميل…</p>
              ) : (
                <>
                  {/* big letter */}
                  <div style={{ textAlign:'center', marginBottom:32, position:'relative' }}>
                    {showConf && <ConfettiBurst key={confKey} />}
                    <div style={{
                      display:'inline-block',
                      fontSize:'7rem', lineHeight:1,
                      color:'#1e3a5f', fontWeight:900,
                      textShadow:'0 6px 24px rgba(30,58,95,.2)',
                      animation: letterAnim==='bounce' ? 'vbLetterBounce .6s ease both'
                               : letterAnim==='shake'  ? 'vbLetterShake .5s ease both'
                               : 'none',
                    }}>
                      {q.base_letter}
                    </div>
                    <br />
                    <button
                      onClick={() => {
                        if (q.audio_url) { const a=new Audio(q.audio_url); a.play().catch(() => speak(q.base_letter+(VOWELS[q.correct_vowel]?.mark||''))); }
                        else { speak(q.base_letter+(VOWELS[q.correct_vowel]?.mark||'')); }
                      }}
                      style={{ marginTop:8, border:'none', borderRadius:50, padding:'8px 20px', background:'linear-gradient(135deg,#3b82f6,#2563eb)', color:'#fff', fontSize:'.85rem', fontWeight:700, cursor:'pointer', boxShadow:'0 3px 12px rgba(59,130,246,.4)', fontFamily:"'Cairo','Tajawal',sans-serif" }}
                    >
                      🔊 استمع
                    </button>
                  </div>

                  {/* balloons row */}
                  <div style={{ display:'flex', justifyContent:'center', gap:18, flexWrap:'wrap', marginBottom:24, minHeight:200, alignItems:'flex-end' }}>
                    {VOWEL_KEYS.map((vk, vi) => {
                      const state = balloonStates[vk];
                      const isChosen = chosen === vk;
                      const disabled = chosen !== null;
                      return (
                        <div key={vk} className="vb-balloon-wrap" style={{ opacity: disabled && !isChosen ? .55 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
                          <Balloon
                            vowelKey={vk}
                            baseLetter={q.base_letter}
                            floatVariant={vi}
                            state={state}
                            onClick={() => pick(vk)}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* feedback */}
                  {(chosen !== null || wrongFeedback) && (
                    <div style={{
                      textAlign:'center', padding:'14px 18px', borderRadius:16, marginBottom:12,
                      background: isRight ? '#ecfdf5' : '#fef2f2',
                      border: `2px solid ${isRight?'#a7f3d0':'#fecaca'}`,
                      animation:'vbSlideUp .45s ease both',
                    }}>
                      <p style={{ margin:0, fontSize:'1.05rem', fontWeight:800, color: isRight?'#065f46':'#991b1b' }}>
                        {isRight ? '🎈 ممتاز! أجبت صحيحاً!' : '❌ حاول مرة أخرى!'}
                      </p>
                    </div>
                  )}

                  {/* rule */}
                  {showRule && (
                    <div style={{
                      background:'#fffbeb', border:'2px solid #fde68a', borderRadius:14,
                      padding:'12px 16px', animation:'vbSlideUp .45s .15s ease both', opacity:0,
                      animationFillMode:'both',
                    }}>
                      <p style={{ margin:0, fontSize:'.9rem', color:'#92400e', fontWeight:700, lineHeight:1.7 }}>
                        💡 {q.rule_text}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
