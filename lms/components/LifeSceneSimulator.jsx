'use client';
import { useState, useEffect, useRef } from 'react';

// ── Character avatars (friendly cartoon kids — big eyes, rosy cheeks) ───────
// Shared facial features so every character looks consistently cute.

function Face({ skin = '#ffd9b3', eyeY = 25, cheek = '#ffb3b3' }) {
  return (
    <>
      {/* Rosy cheeks */}
      <circle cx="17" cy={eyeY + 4} r="2.6" fill={cheek} opacity="0.6"/>
      <circle cx="31" cy={eyeY + 4} r="2.6" fill={cheek} opacity="0.6"/>
      {/* Eyebrows */}
      <path d={`M16 ${eyeY - 4} Q18.5 ${eyeY - 5.5} 21 ${eyeY - 4}`} stroke="#6b4423" strokeWidth="1.1" strokeLinecap="round" fill="none"/>
      <path d={`M27 ${eyeY - 4} Q29.5 ${eyeY - 5.5} 32 ${eyeY - 4}`} stroke="#6b4423" strokeWidth="1.1" strokeLinecap="round" fill="none"/>
      {/* Big expressive eyes (white + pupil + sparkle) */}
      <ellipse cx="18.5" cy={eyeY} rx="2.6" ry="3" fill="#fff"/>
      <ellipse cx="29.5" cy={eyeY} rx="2.6" ry="3" fill="#fff"/>
      <circle cx="18.7" cy={eyeY + 0.4} r="1.6" fill="#3b2a1a"/>
      <circle cx="29.7" cy={eyeY + 0.4} r="1.6" fill="#3b2a1a"/>
      <circle cx="19.4" cy={eyeY - 0.4} r="0.6" fill="#fff"/>
      <circle cx="30.4" cy={eyeY - 0.4} r="0.6" fill="#fff"/>
      {/* Happy smile */}
      <path d={`M19 ${eyeY + 6.5} Q24 ${eyeY + 10.5} 29 ${eyeY + 6.5}`} stroke="#c2410c" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
    </>
  );
}

function Avatar({ id, grad, skin, shirt, children, eyeY = 25, cheek }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={`bg-${id}`} cx="50%" cy="38%" r="70%">
          <stop offset="0%" stopColor={grad[0]}/>
          <stop offset="100%" stopColor={grad[1]}/>
        </radialGradient>
      </defs>
      {/* Background */}
      <circle cx="24" cy="24" r="24" fill={`url(#bg-${id})`}/>
      {/* Shoulders / shirt */}
      <path d="M11 48 Q11 37 24 37 Q37 37 37 48 Z" fill={shirt}/>
      {/* Neck */}
      <rect x="21.5" y="31" width="5" height="5" rx="2" fill={skin}/>
      {/* Head */}
      <circle cx="24" cy={eyeY} r="11" fill={skin}/>
      {/* Ears */}
      <circle cx="13.5" cy={eyeY} r="2" fill={skin}/>
      <circle cx="34.5" cy={eyeY} r="2" fill={skin}/>
      {/* Hair / accessories drawn by the specific character */}
      {children?.behind}
      <Face skin={skin} eyeY={eyeY} cheek={cheek}/>
      {children?.front}
    </svg>
  );
}

function AvatarBoy() {
  return (
    <Avatar id="boy" grad={['#dbeafe', '#bfdbfe']} skin="#ffd9b3" shirt="#3b82f6"
      eyeY={25} cheek="#ff9d9d"
      >{{
        behind: <path d="M13 22 Q13 11 24 11 Q35 11 35 22 Q35 18 31 17 Q28 14 24 14 Q20 14 17 17 Q13 18 13 22Z" fill="#7c4a1e"/>,
      }}</Avatar>
  );
}

function AvatarGirl() {
  return (
    <Avatar id="girl" grad={['#fce7f3', '#fbcfe8']} skin="#ffd9b3" shirt="#ec4899"
      eyeY={25} cheek="#ff8fb0"
      >{{
        behind: <>
          {/* Long hair behind */}
          <path d="M11 26 Q10 13 24 12 Q38 13 37 26 Q39 33 35 38 Q30 33 24 33 Q18 33 13 38 Q9 33 11 26Z" fill="#8b5a2b"/>
        </>,
        front: <>
          {/* Bangs */}
          <path d="M13 22 Q13 11 24 11 Q35 11 35 22 Q34 17 30 16 Q27 19 24 19 Q21 19 18 16 Q14 17 13 22Z" fill="#9c6b34"/>
          {/* Bow */}
          <circle cx="33" cy="15" r="2.4" fill="#f43f5e"/>
          <path d="M33 15 l-3 -2 v4 z" fill="#e11d48"/>
          <path d="M33 15 l3 -2 v4 z" fill="#e11d48"/>
        </>,
      }}</Avatar>
  );
}

function AvatarWorker() {
  return (
    <Avatar id="worker" grad={['#d1fae5', '#a7f3d0']} skin="#f0bd8a" shirt="#059669"
      eyeY={26} cheek="#e8956b"
      >{{
        front: <>
          {/* Cap */}
          <path d="M13 19 Q13 12 24 12 Q35 12 35 19 Z" fill="#1f2937"/>
          <rect x="10" y="18.5" width="20" height="2.6" rx="1.3" fill="#374151"/>
          <circle cx="24" cy="13.5" r="1.1" fill="#6b7280"/>
        </>,
      }}</Avatar>
  );
}

function AvatarTeacher() {
  return (
    <Avatar id="teacher" grad={['#ede9fe', '#ddd6fe']} skin="#ffd9b3" shirt="#7c3aed"
      eyeY={25} cheek="#ff9d9d"
      >{{
        behind: <path d="M13 22 Q13 11 24 11 Q35 11 35 22 Q35 17 31 16 Q28 13 24 13 Q20 13 17 16 Q13 17 13 22Z" fill="#5b3a1a"/>,
        front: <>
          {/* Round glasses */}
          <circle cx="18.5" cy="25" r="4" fill="none" stroke="#1f2937" strokeWidth="1.3"/>
          <circle cx="29.5" cy="25" r="4" fill="none" stroke="#1f2937" strokeWidth="1.3"/>
          <line x1="22.5" y1="25" x2="25.5" y2="25" stroke="#1f2937" strokeWidth="1.3"/>
        </>,
      }}</Avatar>
  );
}

function AvatarDefault() {
  return (
    <Avatar id="default" grad={['#f1f5f9', '#e2e8f0']} skin="#ffd9b3" shirt="#94a3b8"
      eyeY={25} cheek="#ff9d9d"
      >{{
        behind: <path d="M13 22 Q13 11 24 11 Q35 11 35 22 Q35 17 31 16 Q28 13 24 13 Q20 13 17 16 Q13 17 13 22Z" fill="#94a3b8"/>,
      }}</Avatar>
  );
}

const CHAR_MAP = {
  'راشد':    <AvatarBoy />,
  'نورة':    <AvatarGirl />,
  'البائع':  <AvatarWorker />,
  'المعلمة': <AvatarTeacher />,
  'الصديق':  <AvatarBoy />,
  'الصديقة': <AvatarGirl />,
};

function getAvatar(name) {
  return CHAR_MAP[name] ?? <AvatarDefault />;
}

// Pastel bubble colours per speaker (cycles)
const BUBBLE_COLORS = [
  { bg: '#dbeafe', border: '#93c5fd', text: '#1e3a8a' },
  { bg: '#d1fae5', border: '#6ee7b7', text: '#064e3b' },
  { bg: '#fce7f3', border: '#f9a8d4', text: '#831843' },
];

function speakerColor(name, allSpeakers) {
  const idx = allSpeakers.indexOf(name);
  return BUBBLE_COLORS[idx % BUBBLE_COLORS.length];
}

// ── Mock scene ─────────────────────────────────────────────────────────────
const MOCK_SCENE = {
  id: 'mock',
  situation: 'فِي الْبَقَالَة',
  grade: 'الصف الثاني',
  skill: 'التعبير الشفهي',
  teacher_name: 'تجريبي',
  dialogue: [
    { speaker: 'راشد',   text: 'السَّلامُ عَلَيْكُم.' },
    { speaker: 'البائع', text: 'وَعَلَيْكُمُ السَّلام، تَفَضَّلْ؟' },
    { speaker: 'راشد',   text: 'أُرِيدُ حَلِيباً طَازِجاً، شُكْراً.' },
  ],
};

// ── Chat bubble display ─────────────────────────────────────────────────────
function DialogueView({ dialogue, animating }) {
  const speakers = [...new Set(dialogue.map(l => l.speaker))];
  const endRef = useRef(null);

  useEffect(() => {
    if (animating) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dialogue.length, animating]);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, padding:'4px 0' }}>
      {dialogue.map((line, i) => {
        const isRight = speakers.indexOf(line.speaker) === 0;
        const col = speakerColor(line.speaker, speakers);
        return (
          <div
            key={i}
            style={{
              display:'flex', flexDirection: isRight ? 'row-reverse' : 'row',
              alignItems:'flex-end', gap:10,
              animation: animating ? `fadeUp .4s ease ${i * 0.22}s both` : 'none',
            }}
          >
            {/* Avatar circle */}
            <div style={{
              width:48, height:48, borderRadius:'50%',
              border:`2.5px solid ${col.border}`,
              flexShrink:0, overflow:'hidden',
              background:'#fff',
              boxShadow:'0 2px 8px rgba(0,0,0,.1)',
            }}>
              {getAvatar(line.speaker)}
            </div>

            <div style={{ maxWidth:'65%' }}>
              {/* Speaker name */}
              <div style={{
                fontSize:'.72rem', fontWeight:800, color: col.border,
                marginBottom:4, textAlign: isRight ? 'right' : 'left',
              }}>
                {line.speaker}
              </div>
              {/* Bubble */}
              <div style={{
                background: col.bg,
                border: `1.5px solid ${col.border}`,
                borderRadius: isRight ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
                padding:'12px 16px',
                fontSize:'1.12rem',
                lineHeight:1.9,
                color: col.text,
                fontWeight:600,
                boxShadow:'0 2px 10px rgba(0,0,0,.08)',
                direction:'rtl',
              }}>
                {line.text}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}

// ── Mic button ──────────────────────────────────────────────────────────────
function MicButton({ label }) {
  const [active, setActive] = useState(false);
  return (
    <button
      onClick={() => setActive(a => !a)}
      style={{
        display:'flex', alignItems:'center', gap:8,
        padding:'10px 20px', borderRadius:30,
        border:'none', cursor:'pointer', fontFamily:'inherit',
        fontWeight:700, fontSize:'.9rem',
        background: active
          ? 'linear-gradient(135deg,#ef4444,#dc2626)'
          : 'linear-gradient(135deg,#185FA5,#1d4ed8)',
        color:'#fff',
        boxShadow: active ? '0 0 0 4px rgba(239,68,68,.25)' : '0 4px 14px rgba(24,95,165,.3)',
        transition:'.2s',
      }}
    >
      <span style={{ fontSize:'1.2rem' }}>{active ? '⏹️' : '🎤'}</span>
      {active ? 'أوقف التسجيل' : label}
    </button>
  );
}

// ── Teacher creator panel ───────────────────────────────────────────────────
const GRADES = [
  'الصف الأول','الصف الثاني','الصف الثالث','الصف الرابع',
  'الصف الخامس','الصف السادس','الصف السابع',
];
const SKILLS = [
  'التعبير الشفهي','الاستماع والفهم','القراءة الجهرية',
  'التواصل الاجتماعي','المفردات الوظيفية','الأسئلة والأجوبة',
];

function TeacherCreator({ onCreated }) {
  const [form, setForm]     = useState({ situation:'', grade: GRADES[0], skill: SKILLS[0] });
  const [busy, setBusy]     = useState(false);
  const [err,  setErr]      = useState(null);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  async function generate(e) {
    e.preventDefault();
    if (!form.situation.trim()) { setErr('صف الموقف أولاً'); return; }
    setBusy(true); setErr(null);
    const res  = await fetch('/api/life-scene', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setErr(data.error); return; }
    onCreated(data.scene);
    setForm(p => ({ ...p, situation:'' }));
  }

  return (
    <form onSubmit={generate} style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div>
        <label style={{ display:'block', fontWeight:700, fontSize:'.87rem', marginBottom:5, color:'#374151' }}>
          📍 الموقف / السيناريو
        </label>
        <input
          className="form-input"
          placeholder="مثال: في البقالة، في المستشفى، في الفصل..."
          value={form.situation}
          onChange={set('situation')}
          required
          style={{ fontSize:'.93rem' }}
        />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div>
          <label style={{ display:'block', fontWeight:700, fontSize:'.87rem', marginBottom:5, color:'#374151' }}>
            🎓 المرحلة
          </label>
          <select className="form-input" value={form.grade} onChange={set('grade')} style={{ fontSize:'.88rem' }}>
            {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display:'block', fontWeight:700, fontSize:'.87rem', marginBottom:5, color:'#374151' }}>
            🎯 المهارة المستهدفة
          </label>
          <select className="form-input" value={form.skill} onChange={set('skill')} style={{ fontSize:'.88rem' }}>
            {SKILLS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      {err && <div style={{ color:'#dc2626', fontSize:'.85rem', fontWeight:600 }}>⚠️ {err}</div>}
      <button
        type="submit"
        disabled={busy}
        style={{
          padding:'12px 24px', borderRadius:12, border:'none',
          background: busy ? '#94a3b8' : 'linear-gradient(135deg,#185FA5,#1d4ed8)',
          color:'#fff', fontWeight:800, fontSize:'.95rem',
          cursor: busy ? 'not-allowed' : 'pointer',
          fontFamily:'inherit',
          display:'flex', alignItems:'center', justifyContent:'center', gap:8,
        }}
      >
        {busy ? (
          <><span style={{ display:'inline-block', animation:'spin .8s linear infinite' }}>⏳</span> جارٍ توليد المشهد...</>
        ) : '✨ توليد المشهد بالذكاء الاصطناعي'}
      </button>
    </form>
  );
}

// ── Scene card (teacher view) ───────────────────────────────────────────────
function SceneCard({ scene, onTogglePublish, onDelete, onPreview }) {
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function togglePublish() {
    setToggling(true);
    await onTogglePublish(scene.id, !scene.is_published);
    setToggling(false);
  }

  async function del() {
    if (!confirm('حذف هذا المشهد نهائياً؟')) return;
    setDeleting(true);
    await onDelete(scene.id);
    setDeleting(false);
  }

  return (
    <div style={{
      background:'#fff', border:'1.5px solid var(--border)', borderRadius:14,
      padding:'16px 18px', display:'flex', flexDirection:'column', gap:10,
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
        <div>
          <div style={{ fontWeight:800, fontSize:'.97rem', color:'var(--text)' }}>{scene.situation}</div>
          <div style={{ fontSize:'.78rem', color:'var(--muted)', marginTop:3, display:'flex', gap:8 }}>
            <span>🎓 {scene.grade}</span>
            <span>🎯 {scene.skill}</span>
          </div>
        </div>
        <span style={{
          fontSize:'.72rem', fontWeight:700, padding:'3px 10px',
          borderRadius:20, whiteSpace:'nowrap',
          background: scene.is_published ? '#d1fae5' : '#f1f5f9',
          color: scene.is_published ? '#065f46' : '#64748b',
        }}>
          {scene.is_published ? '✅ منشور' : '📝 مسودة'}
        </span>
      </div>

      {/* Mini dialogue preview */}
      <div style={{
        background:'#f8fafc', borderRadius:10, padding:'10px 14px',
        display:'flex', flexDirection:'column', gap:4,
      }}>
        {scene.dialogue?.slice(0,2).map((l, i) => (
          <div key={i} style={{ fontSize:'.82rem', color:'#374151' }}>
            <span style={{ fontWeight:700, color:'var(--primary)' }}>{l.speaker}: </span>
            {l.text}
          </div>
        ))}
        {scene.dialogue?.length > 2 && (
          <div style={{ fontSize:'.75rem', color:'var(--muted)' }}>...+{scene.dialogue.length - 2} أسطر</div>
        )}
      </div>

      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        <button
          onClick={() => onPreview(scene)}
          style={{
            flex:1, padding:'8px', borderRadius:9, border:'1.5px solid var(--border)',
            background:'#fff', color:'var(--primary)', fontWeight:700, fontSize:'.82rem',
            cursor:'pointer', fontFamily:'inherit',
          }}
        >👁️ معاينة</button>

        <button
          onClick={togglePublish} disabled={toggling}
          style={{
            flex:1, padding:'8px', borderRadius:9, border:'none',
            background: scene.is_published
              ? 'linear-gradient(135deg,#f59e0b,#d97706)'
              : 'linear-gradient(135deg,#10b981,#059669)',
            color:'#fff', fontWeight:700, fontSize:'.82rem',
            cursor: toggling ? 'not-allowed' : 'pointer', fontFamily:'inherit',
          }}
        >
          {toggling ? '...' : scene.is_published ? '⏸️ إلغاء النشر' : '🚀 نشر للطلاب'}
        </button>

        <button
          onClick={del} disabled={deleting}
          style={{
            padding:'8px 10px', borderRadius:9, border:'1.5px solid #fca5a5',
            background:'#fff', color:'#dc2626', fontSize:'.82rem',
            cursor: deleting ? 'not-allowed' : 'pointer', fontFamily:'inherit',
          }}
        >🗑️</button>
      </div>
    </div>
  );
}

// ── Student scene viewer ────────────────────────────────────────────────────
function StudentSceneViewer({ scene, onClose }) {
  return (
    <div style={{
      background:'#fff', borderRadius:18, border:'1.5px solid var(--border)',
      padding:'22px 20px', maxWidth:520, margin:'0 auto',
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
        <div>
          <div style={{ fontWeight:800, fontSize:'1.05rem', color:'var(--primary)' }}>{scene.situation}</div>
          <div style={{ fontSize:'.78rem', color:'var(--muted)', marginTop:2, display:'flex', gap:10 }}>
            <span>🎓 {scene.grade}</span>
            <span>🎯 {scene.skill}</span>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:'1.3rem', cursor:'pointer', color:'var(--muted)' }}>✕</button>
        )}
      </div>

      <DialogueView dialogue={scene.dialogue} animating />

      <div style={{ marginTop:22, display:'flex', flexDirection:'column', gap:10, alignItems:'center' }}>
        <div style={{ fontSize:'.82rem', color:'var(--muted)', fontWeight:600 }}>
          🎭 مثّل دور أحد الشخصيات — سجّل صوتك!
        </div>
        {[...new Set(scene.dialogue.map(l => l.speaker))].map(name => (
          <MicButton key={name} label={`سجّل دور "${name}"`} />
        ))}
      </div>
    </div>
  );
}

// ── Main exported component ─────────────────────────────────────────────────

export default function LifeSceneSimulator({ role = 'teacher', currentUser }) {
  const [scenes,   setScenes]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [preview,  setPreview]  = useState(null);
  const [view,     setView]     = useState('list'); // 'list' | 'create'

  useEffect(() => {
    fetch('/api/life-scene')
      .then(r => r.json())
      .then(d => { setScenes(d.scenes ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function handleCreated(scene) {
    setScenes(prev => [scene, ...(prev ?? [])]);
    setView('list');
    setPreview(scene);
  }

  async function handleTogglePublish(id, is_published) {
    const res  = await fetch(`/api/life-scene/${id}`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ is_published }),
    });
    const data = await res.json();
    if (res.ok) setScenes(prev => prev.map(s => s.id === id ? data.scene : s));
  }

  async function handleDelete(id) {
    const res = await fetch(`/api/life-scene/${id}`, { method:'DELETE' });
    if (res.ok) setScenes(prev => prev.filter(s => s.id !== id));
    if (preview?.id === id) setPreview(null);
  }

  // ── Student view ──────────────────────────────────────────────────────────
  if (role === 'student') {
    return (
      <>
        <style>{`
          @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
          @keyframes spin { to { transform:rotate(360deg); } }
        `}</style>
        {loading ? (
          <div style={{ textAlign:'center', padding:'32px 0', color:'var(--muted)' }}>جارٍ التحميل...</div>
        ) : !scenes?.length ? (
          <div style={{ textAlign:'center', padding:'40px 20px' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:10 }}>🎭</div>
            <p style={{ color:'var(--muted)' }}>لا توجد مشاهد منشورة حتى الآن</p>
          </div>
        ) : preview ? (
          <StudentSceneViewer scene={preview} onClose={() => setPreview(null)} />
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {scenes.map(s => (
              <div key={s.id} onClick={() => setPreview(s)}
                style={{
                  background:'#fff', border:'1.5px solid var(--border)', borderRadius:14,
                  padding:'14px 18px', cursor:'pointer', transition:'.15s',
                  display:'flex', alignItems:'center', gap:14,
                }}
              >
                <div style={{ fontSize:'2rem' }}>🎭</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:800, fontSize:'.97rem' }}>{s.situation}</div>
                  <div style={{ fontSize:'.78rem', color:'var(--muted)', marginTop:3 }}>
                    🎓 {s.grade} · 🎯 {s.skill}
                  </div>
                </div>
                <span style={{ fontSize:'.8rem', color:'var(--primary)', fontWeight:700 }}>ابدأ ▶</span>
              </div>
            ))}
          </div>
        )}
      </>
    );
  }

  // ── Teacher view ──────────────────────────────────────────────────────────
  const mockDisplayed = scenes?.length === 0 && !loading;

  return (
    <>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>

      <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)', gap:22, alignItems:'start' }}>

        {/* Left column: list or create form */}
        <div>
          {/* Header */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <h2 style={{ fontSize:'1.05rem', fontWeight:800, color:'var(--primary)', margin:0 }}>
              🎭 مسرح التعبير
            </h2>
            <button
              onClick={() => setView(v => v === 'create' ? 'list' : 'create')}
              style={{
                padding:'8px 16px', borderRadius:10, border:'none',
                background: view === 'create' ? '#e2e8f0' : 'var(--primary)',
                color: view === 'create' ? 'var(--text)' : '#fff',
                fontWeight:700, fontSize:'.85rem', cursor:'pointer', fontFamily:'inherit',
              }}
            >
              {view === 'create' ? '← قائمة المشاهد' : '+ مشهد جديد'}
            </button>
          </div>

          {view === 'create' ? (
            <div style={{ background:'#fff', border:'1.5px solid var(--border)', borderRadius:14, padding:'20px 18px' }}>
              <h3 style={{ margin:'0 0 16px', fontSize:'.95rem', fontWeight:800, color:'var(--primary)' }}>
                ✨ إنشاء مشهد جديد
              </h3>
              <TeacherCreator onCreated={handleCreated} />
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {loading ? (
                <div style={{ textAlign:'center', padding:'32px 0', color:'var(--muted)' }}>جارٍ التحميل...</div>
              ) : mockDisplayed ? (
                <>
                  <div style={{
                    background:'#fffbeb', border:'1.5px solid #fcd34d',
                    borderRadius:12, padding:'10px 14px',
                    fontSize:'.83rem', color:'#92400e', fontWeight:600,
                  }}>
                    🎬 هذا مشهد تجريبي — أنشئ مشهداً حقيقياً بالضغط على "مشهد جديد"
                  </div>
                  <SceneCard
                    scene={MOCK_SCENE}
                    onTogglePublish={() => {}}
                    onDelete={() => {}}
                    onPreview={() => setPreview(MOCK_SCENE)}
                  />
                </>
              ) : scenes?.length === 0 ? (
                <div style={{
                  textAlign:'center', padding:'40px 20px',
                  background:'#fff', border:'1.5px solid var(--border)', borderRadius:14,
                }}>
                  <div style={{ fontSize:'2.5rem', marginBottom:10 }}>🎭</div>
                  <p style={{ color:'var(--muted)', margin:0 }}>لم تنشئ أي مشاهد بعد — ابدأ الآن!</p>
                </div>
              ) : (
                scenes.map(s => (
                  <SceneCard
                    key={s.id}
                    scene={s}
                    onTogglePublish={handleTogglePublish}
                    onDelete={handleDelete}
                    onPreview={setPreview}
                  />
                ))
              )}
            </div>
          )}
        </div>

        {/* Right column: preview */}
        <div style={{ position:'sticky', top:80 }}>
          {preview ? (
            <StudentSceneViewer scene={preview} onClose={() => setPreview(null)} />
          ) : (
            <div style={{
              background:'#f8fafc', border:'1.5px dashed var(--border)', borderRadius:18,
              padding:'40px 24px', textAlign:'center',
            }}>
              <div style={{ fontSize:'3rem', marginBottom:12 }}>🎭</div>
              <p style={{ color:'var(--muted)', fontSize:'.9rem', margin:0 }}>
                اختر مشهداً من القائمة أو أنشئ مشهداً جديداً لمعاينته هنا
              </p>
            </div>
          )}
        </div>

      </div>
    </>
  );
}
