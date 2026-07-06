'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '../../../../lib/supabase';
import Navbar from '../../../../components/Navbar';

/* ─── balloon colors by position ─── */
const BALLOON_COLORS = [
  { color:'#F59E0B', light:'#FFFBEB', dark:'#92400E' },
  { color:'#3B82F6', light:'#EFF6FF', dark:'#1D4ED8' },
  { color:'#10B981', light:'#ECFDF5', dark:'#065F46' },
];

/* ─── dropdown presets ─── */
const OPTION_PRESETS = ['فتحة','ضمة','كسرة','سكون','مد بالألف','مد بالواو','مد بالياء'];
const FALLBACK_POOL  = [...OPTION_PRESETS];

/* ─── build 3 shuffled options (1 correct + 2 wrong) ─── */
function buildOptions(item) {
  const correct = item.correct_option;
  let w1 = item.wrong_option_1?.trim() || '';
  let w2 = item.wrong_option_2?.trim() || '';

  if (!w1 || !w2) {
    const pool = FALLBACK_POOL.filter(f => f !== correct && f !== w1 && f !== w2)
                              .sort(() => Math.random() - 0.5);
    if (!w1) w1 = pool[0] || 'خيار أ';
    if (!w2) w2 = pool[1] || 'خيار ب';
  }

  return [
    { label: correct, isCorrect: true  },
    { label: w1,      isCorrect: false },
    { label: w2,      isCorrect: false },
  ].sort(() => Math.random() - 0.5);
}

/* ─── demo data (used when DB is empty or unreachable) ─── */
const DEMO = [
  { id:'d1', target_text:'بَ',  correct_option:'فتحة',     wrong_option_1:'كسرة',       wrong_option_2:'ضمة',        rule_text:'الفتحة نفتح فمنا عند النطق وتكون فوق الحرف!' },
  { id:'d2', target_text:'مِ',  correct_option:'كسرة',     wrong_option_1:'فتحة',       wrong_option_2:'ضمة',        rule_text:'الكسرة نبتسم عند نطقها وتكون تحت الحرف!' },
  { id:'d3', target_text:'دُ',  correct_option:'ضمة',      wrong_option_1:'فتحة',       wrong_option_2:'كسرة',       rule_text:'الضمة ندمّ شفاهنا وتكون فوق الحرف!' },
  { id:'d4', target_text:'بَا', correct_option:'مد بالألف', wrong_option_1:'مد بالواو',  wrong_option_2:'حركة قصيرة', rule_text:'المد بالألف يُطيل صوت الفتحة!' },
  { id:'d5', target_text:'بُو', correct_option:'مد بالواو', wrong_option_1:'مد بالألف',  wrong_option_2:'مد بالياء',  rule_text:'المد بالواو يُطيل صوت الضمة!' },
  { id:'d6', target_text:'بِي', correct_option:'مد بالياء', wrong_option_1:'مد بالألف',  wrong_option_2:'كسرة',       rule_text:'المد بالياء يُطيل صوت الكسرة!' },
];

/* ─── TTS ─── */
function speak(text) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ar-SA'; u.rate = 0.85; u.pitch = 1.1;
  const ar = window.speechSynthesis.getVoices().find(v => v.lang?.startsWith('ar'));
  if (ar) u.voice = ar;
  window.speechSynthesis.speak(u);
}

/* ─── confetti ─── */
const DOTS = [
  { tx:-90, ty:-110, c:'#fbbf24', sz:12, dl:0  }, { tx:0,   ty:-130, c:'#10b981', sz:14, dl:30  },
  { tx:90,  ty:-110, c:'#3b82f6', sz:11, dl:60  }, { tx:-60, ty:-140, c:'#ec4899', sz:10, dl:20  },
  { tx:60,  ty:-140, c:'#8b5cf6', sz:13, dl:50  }, { tx:-110,ty:-70,  c:'#f97316', sz:10, dl:10  },
  { tx:110, ty:-70,  c:'#06b6d4', sz:12, dl:40  }, { tx:-80, ty:-160, c:'#ef4444', sz:9,  dl:70  },
  { tx:80,  ty:-160, c:'#fbbf24', sz:10, dl:15  }, { tx:0,   ty:-170, c:'#10b981', sz:11, dl:55  },
  { tx:-130,ty:-90,  c:'#3b82f6', sz:9,  dl:35  }, { tx:130, ty:-90,  c:'#ec4899', sz:10, dl:25  },
  { tx:-50, ty:-180, c:'#8b5cf6', sz:8,  dl:80  }, { tx:50,  ty:-180, c:'#f97316', sz:9,  dl:45  },
  { tx:-20, ty:-150, c:'#06b6d4', sz:11, dl:65  }, { tx:20,  ty:-150, c:'#ef4444', sz:10, dl:5   },
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
function Balloon({ label, colorIdx, floatVariant, state, onClick }) {
  const c = BALLOON_COLORS[colorIdx % BALLOON_COLORS.length];
  const animMap = {
    idle:  `vbFloat${floatVariant} ${3 + floatVariant * 0.4}s ease-in-out infinite`,
    fly:   'vbFly .65s cubic-bezier(0.22,1,0.36,1) forwards',
    shake: 'vbShake .5s ease both',
  };
  const len = label.length;
  const fs  = len > 9 ? '.66rem' : len > 7 ? '.75rem' : len > 5 ? '.86rem' : '1rem';

  return (
    <div onClick={onClick} style={{
      display:'flex', flexDirection:'column', alignItems:'center',
      cursor:'pointer', userSelect:'none', WebkitUserSelect:'none',
      animation: animMap[state] || animMap.idle, willChange:'transform',
    }}>
      {/* balloon body */}
      <div style={{
        width:104, height:120,
        background:`radial-gradient(circle at 34% 28%, ${c.light} 0%, ${c.color} 52%, ${c.dark} 100%)`,
        borderRadius:'50% 50% 50% 50% / 60% 60% 42% 42%',
        display:'flex', alignItems:'center', justifyContent:'center',
        padding:'10px 8px',
        boxShadow:`0 8px 28px ${c.color}66, inset 0 -6px 18px rgba(0,0,0,.2)`,
        position:'relative',
      }}>
        <div style={{ position:'absolute', top:14, left:24, width:24, height:15, background:'rgba(255,255,255,.45)', borderRadius:'50%', transform:'rotate(-22deg)' }} />
        <div style={{ position:'absolute', top:30, left:30, width:10, height:7, background:'rgba(255,255,255,.22)', borderRadius:'50%' }} />
        <span style={{
          fontSize:fs, lineHeight:1.3, color:'#fff', position:'relative', zIndex:1,
          textShadow:'0 2px 8px rgba(0,0,0,.5), 0 0 16px rgba(0,0,0,.15)',
          fontFamily:"'Cairo','Tajawal',sans-serif", fontWeight:900, textAlign:'center',
        }}>
          {label}
        </span>
      </div>
      {/* knot */}
      <div style={{ width:13, height:10, background:c.dark, borderRadius:'0 0 50% 50% / 0 0 8px 8px' }} />
      {/* rigging lines (knot → gondola) */}
      <svg width="42" height="22" style={{ display:'block', marginTop:-1 }}>
        <line x1="21" y1="1" x2="5"  y2="21" stroke={c.dark} strokeWidth="1.2" opacity="0.65" />
        <line x1="21" y1="1" x2="37" y2="21" stroke={c.dark} strokeWidth="1.2" opacity="0.65" />
        <line x1="21" y1="1" x2="21" y2="21" stroke={c.dark} strokeWidth="1.4" strokeDasharray="4 3" />
      </svg>
      {/* gondola basket */}
      <div style={{
        width:42, height:20,
        borderRadius:'4px 4px 9px 9px',
        background:`linear-gradient(180deg,${c.color}bb 0%,${c.dark} 100%)`,
        border:`2px solid ${c.dark}`,
        boxShadow:`0 4px 10px rgba(0,0,0,.3), inset 0 2px 4px rgba(255,255,255,.12)`,
        position:'relative', overflow:'hidden',
      }}>
        <div style={{ position:'absolute', top:'42%', left:3, right:3, height:1.5, background:'rgba(0,0,0,.28)', borderRadius:1 }} />
        <div style={{ position:'absolute', top:3, bottom:3, left:'33%', width:1.5, background:'rgba(0,0,0,.22)' }} />
        <div style={{ position:'absolute', top:3, bottom:3, right:'33%', width:1.5, background:'rgba(0,0,0,.22)' }} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   WORD MANAGER (admin panel)
═══════════════════════════════════════════════════════ */
function WordManager({ user }) {
  const role    = user?.user_metadata?.role ?? '';
  const allowed = ['super_admin','admin','teacher'].includes(role);

  const [items,         setItems]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [msg,           setMsg]           = useState('');
  const [editId,        setEditId]        = useState(null);
  const [form,          setForm]          = useState({ target_text:'', wrong_option_1:'', wrong_option_2:'', rule_text:'', topic:'', grade_level:'' });
  const [correctPreset, setCorrectPreset] = useState('فتحة');
  const [correctCustom, setCorrectCustom] = useState('');
  const [audioB64,      setAudioB64]      = useState('');
  const [recording,     setRecording]     = useState(false);
  const mediaRef  = useRef(null);
  const chunksRef = useRef([]);

  const flash = (text, ok=true) => { setMsg({text,ok}); setTimeout(() => setMsg(''), 3500); };
  const upd   = key => e => setForm(f => ({...f, [key]: e.target.value}));

  useEffect(() => { fetchItems(); }, []);

  async function fetchItems() {
    setLoading(true);
    try {
      const r = await fetch('/api/games/vowel-balloon');
      const d = await r.json();
      setItems(d.items || []);
    } catch { setItems([]); }
    setLoading(false);
  }

  function startEdit(it) {
    setEditId(it.id);
    const isPreset = OPTION_PRESETS.includes(it.correct_option);
    setCorrectPreset(isPreset ? it.correct_option : 'أخرى');
    setCorrectCustom(isPreset ? '' : it.correct_option);
    setForm({ target_text:it.target_text, wrong_option_1:it.wrong_option_1||'', wrong_option_2:it.wrong_option_2||'', rule_text:it.rule_text, topic:it.topic||'', grade_level:it.grade_level||'' });
    setAudioB64(it.audio_url || '');
  }

  function cancelEdit() {
    setEditId(null); setCorrectPreset('فتحة'); setCorrectCustom(''); setAudioB64('');
    setForm({ target_text:'', wrong_option_1:'', wrong_option_2:'', rule_text:'', topic:'', grade_level:'' });
  }

  async function save() {
    if (!form.target_text.trim()) { flash('الصوت أو المقطع المستهدف مطلوب', false); return; }
    if (!form.rule_text.trim())   { flash('نص القاعدة مطلوب', false); return; }
    const correctOption = correctPreset === 'أخرى' ? correctCustom.trim() : correctPreset;
    if (!correctOption) { flash('الخيار الصحيح مطلوب', false); return; }

    setSaving(true);
    const body = {
      target_text:    form.target_text.trim(),
      correct_option: correctOption,
      wrong_option_1: form.wrong_option_1.trim() || null,
      wrong_option_2: form.wrong_option_2.trim() || null,
      audio_url:      audioB64 || null,
      rule_text:      form.rule_text.trim(),
      topic:          form.topic.trim() || null,
      grade_level:    form.grade_level ? Number(form.grade_level) : null,
    };
    const url    = editId ? `/api/games/vowel-balloon?id=${editId}` : '/api/games/vowel-balloon';
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

  async function toggleRecord() {
    if (recording) { mediaRef.current?.stop(); return; }
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
      mr.start(); mediaRef.current = mr; setRecording(true);
    } catch { flash('تعذّر الوصول للميكروفون', false); }
  }

  function handleFileAudio(e) {
    const f = e.target.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => setAudioB64(ev.target.result);
    reader.readAsDataURL(f);
  }

  if (!allowed) return null;

  const S = {
    box:   { background:'#fff', borderRadius:18, padding:'24px 20px', boxShadow:'0 4px 20px rgba(0,0,0,.08)', marginTop:40 },
    h2:    { fontSize:'1.15rem', fontWeight:800, color:'#1e3a5f', marginBottom:16 },
    lbl:   { fontSize:'.82rem', fontWeight:700, color:'#475569', marginBottom:4, display:'block' },
    inp:   { width:'100%', border:'1.5px solid #e2e8f0', borderRadius:10, padding:'9px 13px', fontSize:'.9rem', fontFamily:"'Cairo','Tajawal',sans-serif", outline:'none', boxSizing:'border-box', background:'#f8fafc' },
    sel:   { width:'100%', border:'1.5px solid #e2e8f0', borderRadius:10, padding:'9px 13px', fontSize:'.9rem', fontFamily:"'Cairo','Tajawal',sans-serif", outline:'none', boxSizing:'border-box', background:'#f8fafc' },
    row2:  { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 },
    mb12:  { marginBottom:12 },
    hint:  { fontSize:'.71rem', color:'#94a3b8', marginTop:3, display:'block' },
    btn:   c => ({ border:'none', borderRadius:10, padding:'10px 22px', fontWeight:700, fontSize:'.88rem', cursor:'pointer', fontFamily:"'Cairo','Tajawal',sans-serif", color:'#fff', background: c==='green'?'linear-gradient(135deg,#10b981,#059669)':c==='red'?'#ef4444':c==='gray'?'#94a3b8':'linear-gradient(135deg,#3b82f6,#2563eb)' }),
    table: { width:'100%', borderCollapse:'collapse', fontSize:'.84rem' },
    th:    { padding:'8px 10px', background:'#f1f5f9', fontWeight:700, textAlign:'right', borderBottom:'2px solid #e2e8f0' },
    td:    { padding:'8px 10px', borderBottom:'1px solid #f1f5f9', verticalAlign:'middle' },
  };

  return (
    <div style={S.box}>
      <h2 style={S.h2}>⚙️ لوحة تحكم منطاد الحركات</h2>

      {/* ── form ── */}
      <div style={{ background:'#f8fafc', borderRadius:14, padding:'18px 16px', marginBottom:20, border:'1.5px solid #e2e8f0' }}>
        <h3 style={{ fontSize:'.95rem', fontWeight:800, color:'#1e3a5f', marginBottom:14 }}>
          {editId ? '✏️ تعديل عنصر' : '➕ إضافة عنصر جديد'}
        </h3>

        {/* target text — completely free */}
        <div style={S.mb12}>
          <label style={S.lbl}>الصوت أو المقطع المستهدف</label>
          <input style={S.inp} value={form.target_text} onChange={upd('target_text')}
            placeholder="بَا  أو  بِي  أو  بُو  أو  بَ  أو كلمة قصيرة..." dir="rtl" />
          <span style={S.hint}>اكتب بحرية — حرف مفرد، مد طويل، مقطع كامل. سيُعرض كما كتبته بالضبط.</span>
        </div>

        {/* correct option — hybrid dropdown + free text */}
        <div style={S.mb12}>
          <label style={S.lbl}>الخيار الصحيح (تسمية المنطاد الفائز)</label>
          <select style={S.sel} value={correctPreset} onChange={e => setCorrectPreset(e.target.value)}>
            {OPTION_PRESETS.map(p => <option key={p} value={p}>{p}</option>)}
            <option value="أخرى">أخرى — كتابة يدوية حرة</option>
          </select>
          {correctPreset === 'أخرى' && (
            <input style={{ ...S.inp, marginTop:8 }} value={correctCustom}
              onChange={e => setCorrectCustom(e.target.value)}
              placeholder="اكتب التسمية كما تريدها داخل المنطاد..." dir="rtl" />
          )}
        </div>

        {/* wrong options */}
        <div style={S.row2}>
          <div>
            <label style={S.lbl}>خيار خاطئ ١ <span style={{ fontWeight:400, color:'#94a3b8' }}>(اختياري)</span></label>
            <input style={S.inp} value={form.wrong_option_1} onChange={upd('wrong_option_1')}
              placeholder="مد بالواو" dir="rtl" />
          </div>
          <div>
            <label style={S.lbl}>خيار خاطئ ٢ <span style={{ fontWeight:400, color:'#94a3b8' }}>(اختياري)</span></label>
            <input style={S.inp} value={form.wrong_option_2} onChange={upd('wrong_option_2')}
              placeholder="حركة قصيرة" dir="rtl" />
          </div>
        </div>
        <span style={{ ...S.hint, marginBottom:14, display:'block' }}>اتركهما فارغَين لاختيار خيارَين خاطئَين عشوائيَّين تلقائياً من قائمة الحركات.</span>

        {/* rule */}
        <div style={S.mb12}>
          <label style={S.lbl}>نص القاعدة (يظهر عند الإجابة الخاطئة)</label>
          <input style={S.inp} value={form.rule_text} onChange={upd('rule_text')}
            placeholder="المد بالألف يُطيل صوت الفتحة..." dir="rtl" />
        </div>

        {/* topic + grade */}
        <div style={S.row2}>
          <div>
            <label style={S.lbl}>الموضوع <span style={{ fontWeight:400, color:'#94a3b8' }}>(اختياري)</span></label>
            <input style={S.inp} value={form.topic} onChange={upd('topic')} placeholder="حروف المد" dir="rtl" />
          </div>
          <div>
            <label style={S.lbl}>المستوى <span style={{ fontWeight:400, color:'#94a3b8' }}>(اختياري)</span></label>
            <input style={S.inp} type="number" min={1} max={7} value={form.grade_level} onChange={upd('grade_level')} placeholder="1" />
          </div>
        </div>

        {/* audio */}
        <div style={S.mb12}>
          <label style={S.lbl}>الصوت <span style={{ fontWeight:400, color:'#94a3b8' }}>(اختياري)</span></label>
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
        {msg && <p style={{ marginTop:10, color:msg.ok?'#10b981':'#ef4444', fontWeight:700, fontSize:'.85rem' }}>{msg.text}</p>}
      </div>

      {/* ── table ── */}
      {loading ? <p style={{ color:'#94a3b8', textAlign:'center' }}>جاري التحميل…</p> : (
        <div style={{ overflowX:'auto' }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>الصوت</th>
                <th style={S.th}>الصحيح</th>
                <th style={S.th}>خاطئ ١</th>
                <th style={S.th}>خاطئ ٢</th>
                <th style={S.th}>القاعدة</th>
                <th style={S.th}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={6} style={{ ...S.td, textAlign:'center', color:'#94a3b8' }}>لا توجد عناصر — أضف أول عنصر أعلاه</td></tr>
              )}
              {items.map(it => (
                <tr key={it.id}>
                  <td style={{ ...S.td, fontSize:'1.8rem', textAlign:'center', fontFamily:"'Cairo','Tajawal',sans-serif" }}>{it.target_text}</td>
                  <td style={{ ...S.td, color:'#10b981', fontWeight:700 }}>{it.correct_option}</td>
                  <td style={S.td}>{it.wrong_option_1 || <span style={{ color:'#cbd5e1' }}>تلقائي</span>}</td>
                  <td style={S.td}>{it.wrong_option_2 || <span style={{ color:'#cbd5e1' }}>تلقائي</span>}</td>
                  <td style={{ ...S.td, maxWidth:180, fontSize:'.8rem' }}>{it.rule_text}</td>
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
   MAIN GAME PAGE
═══════════════════════════════════════════════════════ */
export default function VowelBalloonPage() {
  const [user,         setUser]         = useState(null);
  const [authDone,     setAuthDone]     = useState(false);
  const [items,        setItems]        = useState([]);
  const [queue,        setQueue]        = useState([]);
  const [cur,          setCur]          = useState(0);
  const [balloonStates,setBalloonStates]= useState(['idle','idle','idle']);
  const [chosen,       setChosen]       = useState(null);
  const [isRight,      setIsRight]      = useState(null);
  const [score,        setScore]        = useState(0);
  const [showRule,     setShowRule]     = useState(false);
  const [wrongFeedback,setWrongFeedback]= useState(false);
  const [showConf,     setShowConf]     = useState(false);
  const [confKey,      setConfKey]      = useState(0);
  const [done,         setDone]         = useState(false);
  const [letterAnim,   setLetterAnim]   = useState('idle');
  const [tab,          setTab]          = useState('game');
  const [dataSource,   setDataSource]   = useState('');
  const [totalPoints,   setTotalPoints]   = useState(0);
  const [ptPopupKey,    setPtPopupKey]    = useState(0);
  const [ptPopupActive, setPtPopupActive] = useState(false);

  /* auth */
  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => { setUser(user); setAuthDone(true); });
  }, []);

  useEffect(() => {
    fetch('/api/points').then(r => r.json()).then(j => setTotalPoints(j.points ?? 0)).catch(() => {});
  }, []);

  /* fetch + build queue */
  useEffect(() => {
    function makeQueue(raw) {
      return [...raw].sort(() => Math.random() - 0.5)
                     .map(item => ({ ...item, _options: buildOptions(item) }));
    }
    fetch('/api/games/vowel-balloon')
      .then(r => r.json())
      .then(d => {
        const src = d.source || 'error';
        const raw = (src === 'database' && d.items?.length) ? d.items : DEMO;
        setDataSource(src === 'database' && d.items?.length ? 'database' : 'demo');
        setItems(raw);
        setQueue(makeQueue(raw));
      })
      .catch(() => { setItems(DEMO); setDataSource('demo'); setQueue(makeQueue(DEMO)); });
  }, []);

  /* auto-play audio on question change */
  useEffect(() => {
    if (!queue.length || done) return;
    const q = queue[cur]; if (!q) return;
    if (!q.audio_url) return;                    // only play custom uploaded audio
    const t = setTimeout(() => {
      new Audio(q.audio_url).play().catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [cur, queue, done]);

  const pick = useCallback((idx) => {
    if (chosen !== null || done) return;
    const q = queue[cur]; if (!q) return;
    const correct = q._options[idx].isCorrect;
    setChosen(idx); setIsRight(correct);

    if (correct) {
      setBalloonStates(s => s.map((st, i) => i === idx ? 'fly' : st));
      setLetterAnim('bounce');
      setScore(sc => sc + 1);
      setPtPopupKey(k => k + 1);
      setPtPopupActive(true);
      setTimeout(() => setPtPopupActive(false), 1200);
      fetch('/api/points', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'vowel_balloon' }) }).then(r => r.json()).then(j => { if (j.points) setTotalPoints(j.points); }).catch(() => {});
      setConfKey(k => k + 1); setShowConf(true);
      if (q.audio_url) new Audio(q.audio_url).play().catch(() => {});
      setTimeout(() => {
        setShowConf(false); setLetterAnim('idle');
        setBalloonStates(['idle','idle','idle']);
        setChosen(null); setIsRight(null); setShowRule(false); setWrongFeedback(false);
        if (cur + 1 >= queue.length) { setDone(true); fetch('/api/game-results', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ game_id: 'vowel_balloon', category: 'عام', correct: score + 1, wrong: (cur + 1) - (score + 1), total: queue.length }) }).catch(() => {}); return; }
        setCur(c => c + 1);
      }, 1200);
    } else {
      setBalloonStates(s => s.map((st, i) => i === idx ? 'shake' : st));
      setLetterAnim('shake');
      setShowRule(true); setWrongFeedback(true);
      setTimeout(() => {
        setBalloonStates(s => s.map((st, i) => i === idx ? 'idle' : st));
        setLetterAnim('idle');
        setChosen(null); setIsRight(null);
      }, 700);
    }
  }, [chosen, cur, done, queue]);

  function restart() {
    const q2 = [...items].sort(() => Math.random() - 0.5).map(item => ({ ...item, _options: buildOptions(item) }));
    setQueue(q2); setCur(0); setScore(0);
    setBalloonStates(['idle','idle','idle']);
    setChosen(null); setIsRight(null); setShowRule(false); setWrongFeedback(false);
    setShowConf(false); setDone(false); setLetterAnim('idle');
  }

  const isAdmin = ['super_admin','admin','teacher'].includes(user?.user_metadata?.role ?? '');
  const q       = queue[cur];
  const total   = queue.length;

  return (
    <>
      {authDone && <Navbar user={user} />}
      <style>{`
        @keyframes ptFloatUp {
          0%   { opacity: 1; transform: translateY(0) scale(1.25); }
          70%  { opacity: 1; }
          100% { opacity: 0; transform: translateY(-48px) scale(0.9); }
        }
        
        * { box-sizing: border-box; }

        @keyframes vbFloat0 { 0%,100%{transform:translateY(0px) rotate(-1deg)}  50%{transform:translateY(-16px) rotate(1.5deg)} }
        @keyframes vbFloat1 { 0%,100%{transform:translateY(-6px) rotate(1deg)}  50%{transform:translateY(10px) rotate(-2deg)}   }
        @keyframes vbFloat2 { 0%,100%{transform:translateY(-3px) rotate(.5deg)} 50%{transform:translateY(-18px) rotate(-1deg)}  }

        @keyframes vbFly   { 0%{transform:translateY(0) scale(1);opacity:1} 60%{transform:translateY(-120px) scale(1.2);opacity:1} 100%{transform:translateY(-260px) scale(.5);opacity:0} }
        @keyframes vbShake { 0%,100%{transform:translateX(0)} 15%{transform:translateX(-9px) rotate(-4deg)} 35%{transform:translateX(9px) rotate(4deg)} 55%{transform:translateX(-7px) rotate(-2deg)} 75%{transform:translateX(7px) rotate(2deg)} }

        @keyframes vbLetterBounce { 0%{transform:scale(1)} 30%{transform:scale(1.35) rotate(-3deg)} 55%{transform:scale(.92) rotate(2deg)} 75%{transform:scale(1.15)} 100%{transform:scale(1)} }
        @keyframes vbLetterShake  { 0%,100%{transform:translateX(0) rotate(0)} 20%{transform:translateX(-10px) rotate(-4deg)} 40%{transform:translateX(10px) rotate(4deg)} 60%{transform:translateX(-8px) rotate(-2deg)} 80%{transform:translateX(8px) rotate(2deg)} }

        @keyframes vbConfetti { from{transform:translate(0,0) scale(1);opacity:1} to{transform:translate(var(--tx),var(--ty)) scale(.1);opacity:0} }
        @keyframes vbSlideUp  { 0%{transform:translateY(24px);opacity:0} 55%{transform:translateY(-5px);opacity:1} 100%{transform:translateY(0);opacity:1} }
        @keyframes vbPop      { 0%{transform:scale(0.3);opacity:0} 60%{transform:scale(1.12);opacity:1} 100%{transform:scale(1)} }

        .vb-balloon-wrap { transition: filter .15s; }
        .vb-balloon-wrap:hover  { filter: brightness(1.08); }
        .vb-balloon-wrap:active { filter: brightness(.95); }

        .vb-tab { border:none; border-radius:12px; padding:9px 22px; font-weight:800; font-size:.9rem; cursor:pointer; font-family:'Cairo','Tajawal',sans-serif; transition:all .18s; }
        .vb-tab.on  { background:linear-gradient(135deg,#3b82f6,#2563eb); color:#fff; box-shadow:0 4px 14px rgba(59,130,246,.4); }
        .vb-tab.off { background:#f1f5f9; color:#64748b; }
        .vb-tab.off:hover { background:#e2e8f0; }
        .vb-listen-btn:hover  { transform:scale(1.12) !important; box-shadow:0 6px 22px rgba(245,158,11,.72),inset 0 -3px 6px rgba(0,0,0,.15) !important; }
        .vb-listen-btn:active { transform:scale(0.92) !important; }
      `}</style>

      <main style={{ minHeight:'100vh', background:'linear-gradient(160deg,#e0f2fe 0%,#f0fdf4 50%,#fef9c3 100%)', fontFamily:"'Cairo','Tajawal',sans-serif", padding:'16px 0 48px' }}>
        <div style={{ maxWidth:700, margin:'0 auto', padding:'0 16px' }}>

          {/* tabs */}
          {isAdmin && (
            <div style={{ display:'flex', gap:10, justifyContent:'center', marginBottom:20 }}>
              <button className={`vb-tab ${tab==='game'?'on':'off'}`} onClick={() => setTab('game')}>🎈 اللعبة</button>
              <button className={`vb-tab ${tab==='admin'?'on':'off'}`} onClick={() => setTab('admin')}>⚙️ لوحة التحكم</button>
            </div>
          )}

          {tab === 'admin' ? <WordManager user={user} /> : (

            /* ── game card ── */
            <div style={{ background:'linear-gradient(160deg,#fffdf9 0%,#fffcf2 100%)', borderRadius:32, padding:'16px 20px 20px', border:'3px solid #fde68a', borderBottom:'6px solid #f59e0b', boxShadow:'0 8px 40px rgba(245,158,11,.15),0 2px 12px rgba(0,0,0,.08)', position:'relative' }}>

              <div style={{ textAlign:'center', marginBottom:5 }}>
                <h1 style={{ fontSize:'1.3rem', fontWeight:900, color:'#78350f', margin:0 }}>🎈 منطاد الحركات</h1>
                <p style={{ color:'#a16207', fontSize:'.8rem', margin:'2px 0 0', fontWeight:600 }}>اختر المنطاد الذي يصف الصوت الصحيح!</p>
                {dataSource === 'demo' && (
                  <span style={{ fontSize:'.72rem', background:'#fef3c7', color:'#92400e', borderRadius:20, padding:'2px 10px', display:'inline-block', marginTop:4 }}>وضع تجريبي</span>
                )}
              </div>

              {/* score + counter */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:7 }}>
                <span style={{ background:'linear-gradient(135deg,#f59e0b,#d97706)', color:'#fff', borderRadius:20, padding:'4px 14px', fontSize:'.88rem', fontWeight:800, boxShadow:'0 3px 10px rgba(245,158,11,.4)' }}>⭐ {score}</span>
                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                  <span style={{ background: 'rgba(245,158,11,0.18)', border: '1px solid #fde68a', borderRadius: 20, padding: '4px 12px', fontSize: '.82rem', fontWeight: 800, color: '#92400e' }}>⭐ {totalPoints.toLocaleString('en-US')} نقطة</span>
                  {ptPopupActive && (
                    <span key={ptPopupKey} style={{ position: 'absolute', top: -28, left: '50%', transform: 'translateX(-50%)', color: '#d97706', fontWeight: 900, fontSize: '1.05rem', pointerEvents: 'none', whiteSpace: 'nowrap', animation: 'ptFloatUp 1.1s ease forwards', textShadow: '0 1px 6px rgba(0,0,0,.2)' }}>+5 ⭐</span>
                  )}
                </div>
                <span style={{ color:'#a16207', fontSize:'.85rem', fontWeight:700 }}>{Math.min(cur+1,total)} / {total}</span>
              </div>

              {/* progress bar */}
              <div style={{ background:'#fde68a', borderRadius:99, height:7, marginBottom:12, overflow:'hidden' }}>
                <div style={{ background:'linear-gradient(90deg,#f59e0b,#10b981)', height:'100%', borderRadius:99, width:`${total ? Math.min(cur/total,1)*100 : 0}%`, transition:'width .4s ease' }} />
              </div>

              {done ? (
                /* done screen */
                <div style={{ textAlign:'center', padding:'32px 0', animation:'vbPop .5s ease both' }}>
                  <div style={{ fontSize:'5rem', marginBottom:12 }}>🎉</div>
                  <h2 style={{ fontSize:'1.6rem', fontWeight:900, color:'#78350f', margin:'0 0 8px' }}>أحسنت! انتهت اللعبة</h2>
                  <p style={{ color:'#64748b', fontSize:'1rem', marginBottom:20 }}>نقاطك: <strong style={{ color:'#f59e0b', fontSize:'1.3rem' }}>{score}</strong> من {total}</p>
                  <button onClick={restart} style={{ border:'none', borderRadius:50, padding:'12px 36px', background:'linear-gradient(135deg,#10b981,#059669)', color:'#fff', fontSize:'1rem', fontWeight:800, cursor:'pointer', boxShadow:'0 4px 18px rgba(16,185,129,.45)', fontFamily:"'Cairo','Tajawal',sans-serif" }}>
                    العب مجدداً ←
                  </button>
                </div>

              ) : !q ? (
                <p style={{ textAlign:'center', color:'#94a3b8', padding:'40px 0' }}>جاري التحميل…</p>

              ) : (
                <>
                  {/* target sound — rendered exactly as typed, no modifications */}
                  <div style={{ textAlign:'center', marginBottom:30, position:'relative' }}>
                    {showConf && <ConfettiBurst key={confKey} />}
                    <div style={{
                      display:'inline-block', fontSize:'5rem', lineHeight:1,
                      color:'#78350f', fontWeight:900, fontFamily:"'Cairo','Tajawal',sans-serif",
                      textShadow:'0 3px 14px rgba(120,53,15,.22)',
                      animation: letterAnim==='bounce' ? 'vbLetterBounce .6s ease both'
                               : letterAnim==='shake'  ? 'vbLetterShake .5s ease both' : 'none',
                    }}>
                      {q.target_text}
                    </div>
                  </div>

                  {/* balloons */}
                  <div style={{ display:'flex', justifyContent:'center', gap:14, flexWrap:'wrap', marginBottom:14, minHeight:178, alignItems:'flex-end' }}>
                    {q._options.map((opt, idx) => (
                      <div key={idx} className="vb-balloon-wrap" style={{
                        opacity: chosen !== null && chosen !== idx ? .55 : 1,
                        pointerEvents: chosen !== null ? 'none' : 'auto',
                      }}>
                        <Balloon
                          label={opt.label}
                          colorIdx={idx}
                          floatVariant={idx}
                          state={balloonStates[idx]}
                          onClick={() => pick(idx)}
                        />
                      </div>
                    ))}
                  </div>

                  {/* feedback bar */}
                  {(chosen !== null || wrongFeedback) && (
                    <div style={{
                      textAlign:'center', padding:'14px 18px', borderRadius:14, marginBottom:8,
                      background: isRight ? '#ecfdf5' : '#fef2f2',
                      border:`2px solid ${isRight?'#a7f3d0':'#fecaca'}`,
                      animation:'vbSlideUp .45s ease both',
                    }}>
                      <p style={{ margin:0, fontSize:'1.05rem', fontWeight:800, color: isRight?'#065f46':'#991b1b' }}>
                        {isRight ? '🎈 ممتاز! أجبت صحيحاً!' : '❌ حاول مرة أخرى!'}
                      </p>
                    </div>
                  )}

                  {/* rule hint */}
                  {showRule && (
                    <div style={{ background:'#fffbeb', border:'2px solid #fde68a', borderRadius:14, padding:'12px 16px', animation:'vbSlideUp .45s .12s ease both' }}>
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
