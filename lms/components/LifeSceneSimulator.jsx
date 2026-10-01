'use client';
import { useState, useEffect, useRef } from 'react';

// ── Metadata helpers ──────────────────────────────────────────────────────────
function extractMeta(dialogue = []) {
  return dialogue[0]?.__meta ? dialogue[0] : null;
}
function cleanDialogue(dialogue = []) {
  return (dialogue[0]?.__meta ? dialogue.slice(1) : dialogue) ?? [];
}
function packDialogue(lines, images) {
  const hasImg = Object.values(images).some(Boolean);
  return hasImg ? [{ __meta: true, images }, ...lines] : lines;
}

// ── Client-side image compression ─────────────────────────────────────────────
function compressImage(file, maxPx = 120) {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.src = url;
  });
}

// ── Character avatars ──────────────────────────────────────────────────────────
function Face({ eyeY = 25, cheek = '#ffb3b3' }) {
  return (
    <>
      <circle cx="17" cy={eyeY + 4} r="2.6" fill={cheek} opacity="0.6"/>
      <circle cx="31" cy={eyeY + 4} r="2.6" fill={cheek} opacity="0.6"/>
      <path d={`M16 ${eyeY-4} Q18.5 ${eyeY-5.5} 21 ${eyeY-4}`} stroke="#6b4423" strokeWidth="1.1" strokeLinecap="round" fill="none"/>
      <path d={`M27 ${eyeY-4} Q29.5 ${eyeY-5.5} 32 ${eyeY-4}`} stroke="#6b4423" strokeWidth="1.1" strokeLinecap="round" fill="none"/>
      <ellipse cx="18.5" cy={eyeY} rx="2.6" ry="3" fill="#fff"/>
      <ellipse cx="29.5" cy={eyeY} rx="2.6" ry="3" fill="#fff"/>
      <circle cx="18.7" cy={eyeY+0.4} r="1.6" fill="#3b2a1a"/>
      <circle cx="29.7" cy={eyeY+0.4} r="1.6" fill="#3b2a1a"/>
      <circle cx="19.4" cy={eyeY-0.4} r="0.6" fill="#fff"/>
      <circle cx="30.4" cy={eyeY-0.4} r="0.6" fill="#fff"/>
      <path d={`M19 ${eyeY+6.5} Q24 ${eyeY+10.5} 29 ${eyeY+6.5}`} stroke="#c2410c" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
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
      <circle cx="24" cy="24" r="24" fill={`url(#bg-${id})`}/>
      <path d="M11 48 Q11 37 24 37 Q37 37 37 48 Z" fill={shirt}/>
      <rect x="21.5" y="31" width="5" height="5" rx="2" fill={skin}/>
      <circle cx="24" cy={eyeY} r="11" fill={skin}/>
      <circle cx="13.5" cy={eyeY} r="2" fill={skin}/>
      <circle cx="34.5" cy={eyeY} r="2" fill={skin}/>
      {children?.behind}
      <Face eyeY={eyeY} cheek={cheek}/>
      {children?.front}
    </svg>
  );
}

function AvatarBoy() {
  return (
    <Avatar id="boy" grad={['#dbeafe','#bfdbfe']} skin="#ffd9b3" shirt="#3b82f6" eyeY={25} cheek="#ff9d9d">
      {{ behind: <path d="M13 22 Q13 11 24 11 Q35 11 35 22 Q35 18 31 17 Q28 14 24 14 Q20 14 17 17 Q13 18 13 22Z" fill="#7c4a1e"/> }}
    </Avatar>
  );
}
function AvatarGirl() {
  return (
    <Avatar id="girl" grad={['#fce7f3','#fbcfe8']} skin="#ffd9b3" shirt="#ec4899" eyeY={25} cheek="#ff8fb0">
      {{
        behind: <path d="M11 26 Q10 13 24 12 Q38 13 37 26 Q39 33 35 38 Q30 33 24 33 Q18 33 13 38 Q9 33 11 26Z" fill="#8b5a2b"/>,
        front: <>
          <path d="M13 22 Q13 11 24 11 Q35 11 35 22 Q34 17 30 16 Q27 19 24 19 Q21 19 18 16 Q14 17 13 22Z" fill="#9c6b34"/>
          <circle cx="33" cy="15" r="2.4" fill="#f43f5e"/>
          <path d="M33 15 l-3 -2 v4 z" fill="#e11d48"/>
          <path d="M33 15 l3 -2 v4 z" fill="#e11d48"/>
        </>,
      }}
    </Avatar>
  );
}
function AvatarWorker() {
  return (
    <Avatar id="worker" grad={['#d1fae5','#a7f3d0']} skin="#f0bd8a" shirt="#059669" eyeY={26} cheek="#e8956b">
      {{
        front: <>
          <path d="M13 19 Q13 12 24 12 Q35 12 35 19 Z" fill="#1f2937"/>
          <rect x="10" y="18.5" width="20" height="2.6" rx="1.3" fill="#374151"/>
          <circle cx="24" cy="13.5" r="1.1" fill="#6b7280"/>
        </>,
      }}
    </Avatar>
  );
}
function AvatarTeacher() {
  return (
    <Avatar id="teacher" grad={['#ede9fe','#ddd6fe']} skin="#ffd9b3" shirt="#7c3aed" eyeY={25} cheek="#ff9d9d">
      {{
        behind: <path d="M13 22 Q13 11 24 11 Q35 11 35 22 Q35 17 31 16 Q28 13 24 13 Q20 13 17 16 Q13 17 13 22Z" fill="#5b3a1a"/>,
        front: <>
          <circle cx="18.5" cy="25" r="4" fill="none" stroke="#1f2937" strokeWidth="1.3"/>
          <circle cx="29.5" cy="25" r="4" fill="none" stroke="#1f2937" strokeWidth="1.3"/>
          <line x1="22.5" y1="25" x2="25.5" y2="25" stroke="#1f2937" strokeWidth="1.3"/>
        </>,
      }}
    </Avatar>
  );
}
function AvatarDefault() {
  return (
    <Avatar id="default" grad={['#f1f5f9','#e2e8f0']} skin="#ffd9b3" shirt="#94a3b8" eyeY={25} cheek="#ff9d9d">
      {{ behind: <path d="M13 22 Q13 11 24 11 Q35 11 35 22 Q35 17 31 16 Q28 13 24 13 Q20 13 17 16 Q13 17 13 22Z" fill="#94a3b8"/> }}
    </Avatar>
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
function getAvatar(name, images = {}) {
  if (images?.[name]) return <img src={images[name]} alt={name} style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' }}/>;
  return CHAR_MAP[name] ?? <AvatarDefault />;
}

const BUBBLE_COLORS = [
  { bg:'#dbeafe', border:'#93c5fd', text:'#1e3a8a' },
  { bg:'#d1fae5', border:'#6ee7b7', text:'#064e3b' },
  { bg:'#fce7f3', border:'#f9a8d4', text:'#831843' },
  { bg:'#fef9c3', border:'#fde047', text:'#713f12' },
  { bg:'#ede9fe', border:'#c4b5fd', text:'#4c1d95' },
  { bg:'#ffedd5', border:'#fdba74', text:'#7c2d12' },
];
function speakerColor(name, allSpeakers) {
  return BUBBLE_COLORS[allSpeakers.indexOf(name) % BUBBLE_COLORS.length];
}

const MOCK_SCENE = {
  id: 'mock',
  situation: 'فِي الْبَقَالَة',
  grade: 'الصف الثاني',
  skill: 'التعبير الشفهي',
  teacher_name: 'تجريبي',
  dialogue: [
    { speaker:'راشد',   text:'السَّلامُ عَلَيْكُم.' },
    { speaker:'البائع', text:'وَعَلَيْكُمُ السَّلام، تَفَضَّلْ؟' },
    { speaker:'راشد',   text:'أُرِيدُ حَلِيباً طَازِجاً، شُكْراً.' },
  ],
};

// ── CSS animations ─────────────────────────────────────────────────────────────
const ANIM_CSS = `
@keyframes fadeUp    { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
@keyframes spin      { to   { transform:rotate(360deg); } }
@keyframes recPulse  { 0%,100%{ box-shadow:0 0 0 4px rgba(239,68,68,.35); } 50%{ box-shadow:0 0 0 10px rgba(239,68,68,.12); } }
@keyframes greenGlow { 0%{ box-shadow:0 0 0 0px rgba(74,222,128,0); background:inherit; }
                       30%{ box-shadow:0 0 0 8px rgba(74,222,128,.45); background:#f0fdf4; }
                       100%{ box-shadow:0 0 0 3px rgba(74,222,128,.15); } }
@keyframes starPop   { 0%{ transform:translateX(-50%) scale(0) rotate(-20deg); opacity:0; }
                       55%{ transform:translateX(-50%) scale(1.4) rotate(12deg); opacity:1; }
                       100%{ transform:translateX(-50%) scale(1) rotate(0) translateY(-22px); opacity:0; } }
@keyframes grandLine { 0%{ box-shadow:0 0 0 0 rgba(251,191,36,0); }
                       40%{ box-shadow:0 0 0 6px rgba(251,191,36,.5); }
                       100%{ box-shadow:0 0 0 3px rgba(251,191,36,.15); } }
@keyframes bounceIn  { 0%{ transform:scale(.7); opacity:0; } 60%{ transform:scale(1.08); opacity:1; } 100%{ transform:scale(1); } }
`;

// ── Single interactive dialogue line ──────────────────────────────────────────
function RecordableLine({
  line, idx, isStudentLine, recording, isRecording, isPlaying, justRecorded, isGrandActive,
  onRecord, onStop, onPlay, speakerCol, isRight, characterImages,
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: isRight ? 'row' : 'row-reverse',
      alignItems: 'flex-end',
      gap: 10,
      animation: `fadeUp .38s ease ${idx * 0.1}s both`,
    }}>
      {/* Avatar */}
      <div style={{
        width: 50, height: 50, borderRadius: '50%',
        border: `2.5px solid ${speakerCol.border}`,
        flexShrink: 0, overflow: 'hidden',
        background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,.1)',
      }}>
        {getAvatar(line.speaker, characterImages)}
      </div>

      {/* Bubble + controls */}
      <div style={{ maxWidth: '68%', minWidth: 0 }}>
        <div style={{
          fontSize: '.72rem', fontWeight: 800, color: speakerCol.border,
          marginBottom: 4, textAlign: isRight ? 'right' : 'left',
        }}>
          {line.speaker}
        </div>

        {/* Speech bubble */}
        <div style={{
          position: 'relative',
          background: justRecorded ? '#f0fdf4' : speakerCol.bg,
          border: `1.5px solid ${justRecorded ? '#4ade80' : isGrandActive ? '#fbbf24' : speakerCol.border}`,
          borderRadius: isRight ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
          padding: '12px 16px',
          fontSize: '1.1rem', lineHeight: 2,
          color: speakerCol.text, fontWeight: 600,
          direction: 'rtl',
          animation: justRecorded ? 'greenGlow .9s ease forwards'
                   : isGrandActive ? 'grandLine .6s ease forwards'
                   : 'none',
          transition: 'border-color .3s',
        }}>
          {line.text}

          {/* Star reward */}
          {justRecorded && (
            <span style={{
              position: 'absolute', top: -14, left: '50%',
              fontSize: '1.6rem', pointerEvents: 'none',
              animation: 'starPop .8s ease forwards',
            }}>⭐</span>
          )}
        </div>

        {/* Recording controls — only for student lines */}
        {isStudentLine && (
          <div style={{
            display: 'flex',
            justifyContent: isRight ? 'flex-end' : 'flex-start',
            marginTop: 7, gap: 6,
          }}>
            {isRecording ? (
              <button onClick={onStop} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 16px', borderRadius: 20, border: 'none',
                background: 'linear-gradient(135deg,#ef4444,#dc2626)',
                color: '#fff', fontFamily: 'inherit', fontWeight: 800,
                fontSize: '.82rem', cursor: 'pointer',
                animation: 'recPulse 1.2s infinite',
              }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#fff' }}/>
                أوقف التسجيل
              </button>
            ) : recording ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={onPlay} disabled={isPlaying} style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '7px 14px', borderRadius: 20, border: 'none',
                  background: isPlaying
                    ? 'linear-gradient(135deg,#6ee7b7,#10b981)'
                    : 'linear-gradient(135deg,#10b981,#059669)',
                  color: '#fff', fontFamily: 'inherit', fontWeight: 800,
                  fontSize: '.82rem', cursor: isPlaying ? 'default' : 'pointer',
                  transition: '.2s',
                  animation: isPlaying ? 'recPulse 1s infinite' : 'none',
                }}>
                  {isPlaying ? '🔊 يُشغَّل...' : '▶ استمع'}
                </button>
                <button onClick={onRecord} title="أعد التسجيل" style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '7px 12px', borderRadius: 20,
                  border: '1.5px solid #cbd5e1',
                  background: '#fff', color: '#64748b',
                  fontFamily: 'inherit', fontWeight: 700,
                  fontSize: '.78rem', cursor: 'pointer',
                }}>🔄</button>
              </div>
            ) : (
              <button onClick={onRecord} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 18px', borderRadius: 20, border: 'none',
                background: 'linear-gradient(135deg,#185FA5,#1d4ed8)',
                color: '#fff', fontFamily: 'inherit', fontWeight: 800,
                fontSize: '.82rem', cursor: 'pointer',
                boxShadow: '0 3px 10px rgba(24,95,165,.3)',
                animation: 'bounceIn .4s ease',
              }}>
                🎤 سجّل
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Dialogue view (for teacher-only preview / editable mode) ──────────────────
function DialogueView({ dialogue, animating, characterImages = {} }) {
  const lines    = cleanDialogue(dialogue ?? []);
  const speakers = [...new Set(lines.map(l => l.speaker))];
  const endRef   = useRef(null);
  useEffect(() => { if (animating) endRef.current?.scrollIntoView({ behavior:'smooth' }); }, [lines.length, animating]);
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, padding:'4px 0', direction:'rtl' }}>
      {lines.map((line, i) => {
        const isRight = speakers.indexOf(line.speaker) % 2 === 0;
        const col = speakerColor(line.speaker, speakers);
        return (
          <div key={i} style={{
            display:'flex', flexDirection: isRight ? 'row' : 'row-reverse',
            alignItems:'flex-end', gap:10,
            animation: animating ? `fadeUp .4s ease ${i * 0.22}s both` : 'none',
          }}>
            <div style={{ width:48, height:48, borderRadius:'50%', border:`2.5px solid ${col.border}`, flexShrink:0, overflow:'hidden', background:'#fff', boxShadow:'0 2px 8px rgba(0,0,0,.1)' }}>
              {getAvatar(line.speaker, characterImages)}
            </div>
            <div style={{ maxWidth:'65%' }}>
              <div style={{ fontSize:'.72rem', fontWeight:800, color:col.border, marginBottom:4, textAlign: isRight ? 'right' : 'left' }}>{line.speaker}</div>
              <div style={{ background:col.bg, border:`1.5px solid ${col.border}`, borderRadius: isRight ? '18px 4px 18px 18px' : '4px 18px 18px 18px', padding:'12px 16px', fontSize:'1.12rem', lineHeight:1.9, color:col.text, fontWeight:600, boxShadow:'0 2px 10px rgba(0,0,0,.08)', direction:'rtl' }}>
                {line.text}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={endRef}/>
    </div>
  );
}

// ── Dialogue editor ────────────────────────────────────────────────────────────
const KNOWN_SPEAKERS = ['راشد','نورة','البائع','المعلمة','الصديق','الصديقة','الأم','الأب','الطبيب','الممرضة','المدير','السائق','الجار','الجارة','خالد','سارة','يوسف','ليلى'];

function DialogueEditor({ characterImages, setCharImages, editLines, setEditLines, onSave, onCancel, saving }) {
  const lineSpeakers            = [...new Set(editLines.map(l => l.speaker))];
  const [extraSpeakers, setExtraSpeakers] = useState([]);
  const [addingName,    setAddingName]    = useState('');
  const [showAddInput,  setShowAddInput]  = useState(false);

  const allSpeakers = [...new Set([...lineSpeakers, ...extraSpeakers])];

  function addSpeaker() {
    const name = addingName.trim();
    if (!name || allSpeakers.includes(name)) { setAddingName(''); setShowAddInput(false); return; }
    setExtraSpeakers(p => [...p, name]);
    // Auto-add an empty line for this new character so they appear in recording
    setEditLines(p => [...p, { speaker: name, text: '' }]);
    setAddingName('');
    setShowAddInput(false);
  }
  function removeSpeaker(name) {
    setExtraSpeakers(p => p.filter(s => s !== name));
    setCharImages(p => { const n = { ...p }; delete n[name]; return n; });
  }

  function updateLine(i, field, val) { setEditLines(p => p.map((l, j) => j === i ? { ...l, [field]: val } : l)); }
  function deleteLine(i)             { setEditLines(p => p.filter((_, j) => j !== i)); }
  function addLine() {
    const last   = editLines[editLines.length - 1]?.speaker ?? allSpeakers[0] ?? 'راشد';
    const others = allSpeakers.filter(s => s !== last);
    setEditLines(p => [...p, { speaker: others[0] ?? last, text: '' }]);
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* ── Characters panel ── */}
      <div style={{ background:'#f8fafc', borderRadius:12, padding:'12px 16px', border:'1.5px solid var(--border)' }}>
        <div style={{ fontWeight:700, fontSize:'.8rem', color:'#475569', marginBottom:10 }}>🎭 الشخصيات</div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>

          {allSpeakers.map(name => {
            const col = speakerColor(name, allSpeakers);
            return (
              <div key={name} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, position:'relative' }}>
                {/* Remove character + their lines */}
                <button
                  onClick={() => { if (confirm(`حذف شخصية "${name}" وجميع أسطرها؟`)) { removeSpeaker(name); setEditLines(p => p.filter(l => l.speaker !== name)); } }}
                  title="حذف الشخصية"
                  style={{ position:'absolute', top:-4, right:-4, zIndex:2, width:16, height:16, borderRadius:'50%', border:'1px solid #94a3b8', background:'#f1f5f9', color:'#64748b', fontSize:'.55rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0, lineHeight:1 }}
                >✕</button>
                {/* Avatar + image upload */}
                <label style={{ cursor:'pointer' }}>
                  <div style={{ width:46, height:46, borderRadius:'50%', overflow:'hidden', border:`2.5px solid ${col.border}`, background:'#fff', position:'relative' }}>
                    {getAvatar(name, characterImages)}
                    {characterImages[name] && (
                      <button onClick={e => { e.preventDefault(); setCharImages(p => ({ ...p, [name]: null })); }}
                        style={{ position:'absolute', top:0, right:0, width:14, height:14, borderRadius:'50%', border:'none', background:'#ef4444', color:'#fff', fontSize:'.55rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0, lineHeight:1 }}>✕</button>
                    )}
                  </div>
                  <input type="file" accept="image/*" style={{ display:'none' }} onChange={async e => {
                    if (!e.target.files[0]) return;
                    const compressed = await compressImage(e.target.files[0]);
                    setCharImages(p => ({ ...p, [name]: compressed }));
                    e.target.value = '';
                  }}/>
                </label>
                <div style={{ fontSize:'.72rem', fontWeight:800, color: col.text, textAlign:'center', maxWidth:56, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</div>
                <div style={{ fontSize:'.62rem', color: col.border }}>📷</div>
              </div>
            );
          })}

          {/* Add new speaker */}
          {showAddInput ? (
            <div style={{ display:'flex', gap:5, alignItems:'center', background:'#fff', border:'1.5px solid var(--primary)', borderRadius:10, padding:'5px 8px' }}>
              <input
                autoFocus
                value={addingName}
                onChange={e => setAddingName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addSpeaker(); if (e.key === 'Escape') { setAddingName(''); setShowAddInput(false); } }}
                list="spk-suggestions"
                placeholder="اسم الشخصية..."
                style={{ width:100, border:'none', outline:'none', fontSize:'.82rem', fontFamily:'inherit', textAlign:'right', background:'transparent' }}
              />
              <datalist id="spk-suggestions">{KNOWN_SPEAKERS.filter(s => !allSpeakers.includes(s)).map(s => <option key={s} value={s}/>)}</datalist>
              <button onClick={addSpeaker} style={{ padding:'3px 8px', borderRadius:6, border:'none', background:'var(--primary)', color:'#fff', fontWeight:700, fontSize:'.75rem', cursor:'pointer', fontFamily:'inherit' }}>إضافة</button>
              <button onClick={() => { setAddingName(''); setShowAddInput(false); }} style={{ padding:'3px 6px', borderRadius:6, border:'1.5px solid #e2e8f0', background:'#fff', color:'#64748b', fontWeight:700, fontSize:'.75rem', cursor:'pointer', fontFamily:'inherit' }}>✕</button>
            </div>
          ) : (
            <button onClick={() => setShowAddInput(true)} style={{
              display:'flex', flexDirection:'column', alignItems:'center', gap:5,
              padding:'8px 12px', borderRadius:10, border:'1.5px dashed #185FA5',
              background:'#eff6ff', color:'#185FA5', cursor:'pointer', fontFamily:'inherit', fontWeight:700, fontSize:'.78rem',
            }}>
              <span style={{ fontSize:'1.2rem' }}>＋</span>
              شخصية
            </button>
          )}
        </div>
      </div>

      {/* ── Dialogue lines ── */}
      <div style={{ fontWeight:700, fontSize:'.8rem', color:'#475569' }}>✍️ سطور الحوار</div>
      {editLines.map((line, i) => {
        const col = speakerColor(line.speaker, allSpeakers);
        return (
          <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
            <select value={line.speaker} onChange={e => updateLine(i, 'speaker', e.target.value)}
              style={{ width:96, padding:'8px 10px', borderRadius:8, border:`1.5px solid ${col.border}`, background: col.bg, color: col.text, fontSize:'.82rem', fontFamily:'inherit', fontWeight:700, flexShrink:0, cursor:'pointer' }}>
              {allSpeakers.map(s => <option key={s} value={s}>{s}</option>)}
              {!allSpeakers.includes(line.speaker) && <option value={line.speaker}>{line.speaker}</option>}
            </select>
            <textarea value={line.text} onChange={e => updateLine(i, 'text', e.target.value)} rows={2} placeholder="نص الجملة..."
              style={{ flex:1, padding:'8px 12px', borderRadius:8, border:'1.5px solid var(--border)', fontSize:'.93rem', fontFamily:'inherit', resize:'vertical', direction:'rtl', lineHeight:1.7 }}/>
            <button onClick={() => deleteLine(i)}
              style={{ padding:'8px 10px', borderRadius:8, border:'1.5px solid #fca5a5', background:'#fff', color:'#dc2626', cursor:'pointer', fontSize:'.88rem', flexShrink:0 }}>🗑️</button>
          </div>
        );
      })}

      <button onClick={addLine} disabled={allSpeakers.length === 0}
        style={{ padding:'9px 16px', borderRadius:10, border:'1.5px dashed #94a3b8', background:'#f8fafc', color: allSpeakers.length === 0 ? '#cbd5e1' : '#64748b', cursor: allSpeakers.length === 0 ? 'not-allowed' : 'pointer', fontFamily:'inherit', fontWeight:700, fontSize:'.84rem' }}>
        ＋ إضافة سطر جديد
      </button>

      <div style={{ display:'flex', gap:10 }}>
        <button onClick={onSave} disabled={saving} style={{ flex:1, padding:'11px', borderRadius:10, border:'none', background: saving ? '#94a3b8' : 'linear-gradient(135deg,#10b981,#059669)', color:'#fff', fontWeight:800, fontSize:'.9rem', cursor: saving ? 'not-allowed' : 'pointer', fontFamily:'inherit' }}>
          {saving ? '⏳ جارٍ الحفظ...' : '✅ حفظ التعديلات'}
        </button>
        <button onClick={onCancel} style={{ padding:'11px 18px', borderRadius:10, border:'1.5px solid var(--border)', background:'#fff', color:'var(--text)', fontWeight:700, fontSize:'.9rem', cursor:'pointer', fontFamily:'inherit' }}>✕ إلغاء</button>
      </div>
    </div>
  );
}

// ── Teacher creator panel ──────────────────────────────────────────────────────
const GRADES = ['الصف الأول','الصف الثاني','الصف الثالث','الصف الرابع','الصف الخامس','الصف السادس','الصف السابع'];
const SKILLS_LIST = ['التعبير الشفهي','الاستماع والفهم','القراءة الجهرية','التواصل الاجتماعي','المفردات الوظيفية','الأسئلة والأجوبة'];

function TeacherCreator({ onCreated }) {
  const [form, setForm] = useState({ situation:'', grade:GRADES[0], skill:SKILLS_LIST[0] });
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState(null);
  const set = k => e => setForm(p => ({ ...p, [k]:e.target.value }));
  async function generate(e) {
    e.preventDefault();
    if (!form.situation.trim()) { setErr('صف الموقف أولاً'); return; }
    setBusy(true); setErr(null);
    const res  = await fetch('/api/life-scene', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setErr(data.error); return; }
    onCreated(data.scene);
    setForm(p => ({ ...p, situation:'' }));
  }
  return (
    <form onSubmit={generate} style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div>
        <label style={{ display:'block', fontWeight:700, fontSize:'.87rem', marginBottom:5, color:'#374151' }}>📍 الموقف / السيناريو</label>
        <input className="form-input" placeholder="مثال: في البقالة، في المستشفى، في الفصل..." value={form.situation} onChange={set('situation')} required style={{ fontSize:'.93rem' }}/>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div>
          <label style={{ display:'block', fontWeight:700, fontSize:'.87rem', marginBottom:5, color:'#374151' }}>🎓 المرحلة</label>
          <select className="form-input" value={form.grade} onChange={set('grade')} style={{ fontSize:'.88rem' }}>{GRADES.map(g => <option key={g} value={g}>{g}</option>)}</select>
        </div>
        <div>
          <label style={{ display:'block', fontWeight:700, fontSize:'.87rem', marginBottom:5, color:'#374151' }}>🎯 المهارة</label>
          <select className="form-input" value={form.skill} onChange={set('skill')} style={{ fontSize:'.88rem' }}>{SKILLS_LIST.map(s => <option key={s} value={s}>{s}</option>)}</select>
        </div>
      </div>
      {err && <div style={{ color:'#dc2626', fontSize:'.85rem', fontWeight:600 }}>⚠️ {err}</div>}
      <button type="submit" disabled={busy} style={{ padding:'12px 24px', borderRadius:12, border:'none', background: busy ? '#94a3b8' : 'linear-gradient(135deg,#185FA5,#1d4ed8)', color:'#fff', fontWeight:800, fontSize:'.95rem', cursor: busy ? 'not-allowed' : 'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
        {busy ? <><span style={{ display:'inline-block', animation:'spin .8s linear infinite' }}>⏳</span> جارٍ توليد المشهد...</> : '✨ توليد المشهد بالذكاء الاصطناعي'}
      </button>
    </form>
  );
}

// ── Scene card ─────────────────────────────────────────────────────────────────
function SceneCard({ scene, onTogglePublish, onDelete, onPreview }) {
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  async function togglePublish() { setToggling(true); await onTogglePublish(scene.id, !scene.is_published); setToggling(false); }
  async function del() { if (!confirm('حذف هذا المشهد نهائياً؟')) return; setDeleting(true); await onDelete(scene.id); setDeleting(false); }
  const previewLines = cleanDialogue(scene.dialogue ?? []).slice(0, 2);
  return (
    <div style={{ background:'#fff', border:'1.5px solid var(--border)', borderRadius:14, padding:'16px 18px', display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
        <div>
          <div style={{ fontWeight:800, fontSize:'.97rem', color:'var(--text)' }}>{scene.situation}</div>
          <div style={{ fontSize:'.78rem', color:'var(--muted)', marginTop:3, display:'flex', gap:8 }}><span>🎓 {scene.grade}</span><span>🎯 {scene.skill}</span></div>
        </div>
        <span style={{ fontSize:'.72rem', fontWeight:700, padding:'3px 10px', borderRadius:20, whiteSpace:'nowrap', background: scene.is_published ? '#d1fae5' : '#f1f5f9', color: scene.is_published ? '#065f46' : '#64748b' }}>
          {scene.is_published ? '✅ منشور' : '📝 مسودة'}
        </span>
      </div>
      <div style={{ background:'#f8fafc', borderRadius:10, padding:'10px 14px', display:'flex', flexDirection:'column', gap:4 }}>
        {previewLines.map((l, i) => (
          <div key={i} style={{ fontSize:'.82rem', color:'#374151' }}>
            <span style={{ fontWeight:700, color:'var(--primary)' }}>{l.speaker}: </span>{l.text}
          </div>
        ))}
        {cleanDialogue(scene.dialogue ?? []).length > 2 && <div style={{ fontSize:'.75rem', color:'var(--muted)' }}>...+{cleanDialogue(scene.dialogue).length - 2} أسطر</div>}
      </div>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        <button onClick={() => onPreview(scene)} style={{ flex:1, padding:'8px', borderRadius:9, border:'1.5px solid var(--border)', background:'#fff', color:'var(--primary)', fontWeight:700, fontSize:'.82rem', cursor:'pointer', fontFamily:'inherit' }}>👁️ معاينة</button>
        <button onClick={togglePublish} disabled={toggling} style={{ flex:1, padding:'8px', borderRadius:9, border:'none', background: scene.is_published ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'linear-gradient(135deg,#10b981,#059669)', color:'#fff', fontWeight:700, fontSize:'.82rem', cursor: toggling ? 'not-allowed' : 'pointer', fontFamily:'inherit' }}>
          {toggling ? '...' : scene.is_published ? '⏸️ إلغاء النشر' : '🚀 نشر للطلاب'}
        </button>
        <button onClick={del} disabled={deleting} style={{ padding:'8px 10px', borderRadius:9, border:'1.5px solid #fca5a5', background:'#fff', color:'#dc2626', fontSize:'.82rem', cursor: deleting ? 'not-allowed' : 'pointer', fontFamily:'inherit' }}>🗑️</button>
      </div>
    </div>
  );
}

// ── TTS helper — speak a line using browser speechSynthesis ───────────────────
function speakLine(text, onEnd) {
  if (!window.speechSynthesis) { setTimeout(onEnd, 600); return null; }
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'ar-SA';
  utt.rate = 0.88;
  const voices = window.speechSynthesis.getVoices();
  const arVoice = voices.find(v => v.lang.startsWith('ar'));
  if (arVoice) utt.voice = arVoice;
  utt.onend   = onEnd;
  utt.onerror = onEnd;
  window.speechSynthesis.speak(utt);
  // Safety timeout (3.5s per line max)
  const t = setTimeout(onEnd, 3500);
  utt.onend = () => { clearTimeout(t); onEnd(); };
  return utt;
}

// ── Interactive scene viewer ──────────────────────────────────────────────────
function StudentSceneViewer({ scene, onClose, editable, onUpdate }) {
  const lines           = cleanDialogue(scene.dialogue ?? []);
  const speakers        = [...new Set(lines.map(l => l.speaker))];
  const characterImages = extractMeta(scene.dialogue ?? [])?.images ?? {};

  // edit mode (teacher only)
  const [editing,   setEditing]   = useState(false);
  const [editLines, setEditLines] = useState(() => cleanDialogue(scene.dialogue ?? []));
  const [charImg,   setCharImg]   = useState(() => extractMeta(scene.dialogue ?? [])?.images ?? {});
  const [saving,    setSaving]    = useState(false);

  // interactive recording state
  const [recordings,    setRecordings]    = useState({});    // { idx: blobUrl }
  const [recordingIdx,  setRecordingIdx]  = useState(null);
  const [playingIdx,    setPlayingIdx]    = useState(null);
  const [justRecorded,  setJustRecorded]  = useState({});
  const [grandPlaying,  setGrandPlaying]  = useState(false);
  const [grandIdx,      setGrandIdx]      = useState(null);

  const mediaRef  = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const audioRef  = useRef(null);
  const grandRef  = useRef(false);

  const recordedCount = Object.keys(recordings).length;
  const allRecorded   = lines.length > 0 && recordedCount === lines.length;

  useEffect(() => {
    setEditLines(cleanDialogue(scene.dialogue ?? []));
    setCharImg(extractMeta(scene.dialogue ?? [])?.images ?? {});
    setEditing(false);
    resetRecording();
  }, [scene.id]);

  useEffect(() => () => {
    stopMedia();
    window.speechSynthesis?.cancel();
    grandRef.current = false;
  }, []);

  function resetRecording() {
    stopMedia();
    Object.values(recordings).forEach(u => URL.revokeObjectURL(u));
    setRecordings({});
    setRecordingIdx(null);
    setPlayingIdx(null);
    setJustRecorded({});
    setGrandPlaying(false);
    setGrandIdx(null);
    grandRef.current = false;
  }

  function stopMedia() {
    if (mediaRef.current?.state === 'recording') mediaRef.current.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
  }

  async function startRecording(idx) {
    if (recordingIdx !== null) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus'
                    : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm'
                    : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4'
                    : '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mediaRef.current = recorder;
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type ?? 'audio/webm' });
        const url  = URL.createObjectURL(blob);
        setRecordings(prev => {
          if (prev[idx]) URL.revokeObjectURL(prev[idx]);
          return { ...prev, [idx]: url };
        });
        setRecordingIdx(null);
        setJustRecorded(prev => ({ ...prev, [idx]: true }));
        setTimeout(() => setJustRecorded(prev => ({ ...prev, [idx]: false })), 1600);
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      setRecordingIdx(idx);
    } catch (err) {
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        alert('🎤 يرجى السماح بالوصول للميكروفون من إعدادات المتصفح ثم حاول مجدداً');
      } else {
        alert('حدث خطأ في التسجيل: ' + (err?.message || err));
      }
    }
  }

  function stopRecording() {
    if (mediaRef.current?.state === 'recording') mediaRef.current.stop();
  }

  function playRecording(idx) {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    const audio = new Audio(recordings[idx]);
    audioRef.current = audio;
    setPlayingIdx(idx);
    audio.onended = audio.onerror = () => setPlayingIdx(null);
    audio.play().catch(() => setPlayingIdx(null));
  }

  async function playGrandFinale() {
    if (grandPlaying) { grandRef.current = false; window.speechSynthesis?.cancel(); if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } setGrandPlaying(false); setGrandIdx(null); return; }
    grandRef.current = true;
    setGrandPlaying(true);
    for (let i = 0; i < lines.length; i++) {
      if (!grandRef.current) break;
      setGrandIdx(i);
      const line = lines[i];
      if (recordings[i]) {
        await new Promise(resolve => {
          const audio = new Audio(recordings[i]);
          audioRef.current = audio;
          audio.onended = audio.onerror = resolve;
          audio.play().catch(resolve);
        });
      } else {
        await new Promise(resolve => speakLine(line.text, resolve));
      }
      if (!grandRef.current) break;
      await new Promise(r => setTimeout(r, 350));
    }
    grandRef.current = false;
    setGrandPlaying(false);
    setGrandIdx(null);
  }

  async function saveEdits() {
    setSaving(true);
    const newDialogue = packDialogue(editLines, charImg);
    const res  = await fetch(`/api/life-scene/${scene.id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ dialogue: newDialogue }) });
    const data = await res.json();
    setSaving(false);
    if (res.ok) { onUpdate?.(data.scene); setEditing(false); }
  }

  return (
    <div style={{ background:'#fff', borderRadius:18, border:'1.5px solid var(--border)', padding:'22px 20px', maxWidth:560, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
        <div>
          <div style={{ fontWeight:800, fontSize:'1.05rem', color:'var(--primary)' }}>{scene.situation}</div>
          <div style={{ fontSize:'.78rem', color:'var(--muted)', marginTop:2, display:'flex', gap:10 }}>
            <span>🎓 {scene.grade}</span><span>🎯 {scene.skill}</span>
          </div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {editable && !editing && scene.id !== 'mock' && (
            <button onClick={() => setEditing(true)} style={{ padding:'6px 14px', borderRadius:8, border:'1.5px solid var(--primary)', background:'#fff', color:'var(--primary)', fontWeight:700, fontSize:'.82rem', cursor:'pointer', fontFamily:'inherit' }}>✏️ تعديل</button>
          )}
          {recordedCount > 0 && !editing && (
            <button onClick={resetRecording} title="إعادة التسجيل" style={{ padding:'6px 10px', borderRadius:8, border:'1.5px solid #e2e8f0', background:'#f8fafc', color:'#64748b', fontSize:'.8rem', cursor:'pointer', fontFamily:'inherit', fontWeight:700 }}>↩ إعادة</button>
          )}
          {onClose && <button onClick={onClose} style={{ background:'none', border:'none', fontSize:'1.3rem', cursor:'pointer', color:'var(--muted)' }}>✕</button>}
        </div>
      </div>

      {/* Edit mode */}
      {editing ? (
        <DialogueEditor characterImages={charImg} setCharImages={setCharImg} editLines={editLines} setEditLines={setEditLines}
          onSave={saveEdits} onCancel={() => { setEditLines(cleanDialogue(scene.dialogue ?? [])); setCharImg(extractMeta(scene.dialogue ?? [])?.images ?? {}); setEditing(false); }} saving={saving}/>
      ) : (
        /* ── Inline recording experience ─────────────────────── */
        <div style={{ direction:'rtl' }}>
          {/* Progress bar */}
          <div style={{ marginBottom:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.78rem', color:'#64748b', marginBottom:5, fontWeight:700 }}>
              <span>🎭 سجّل جميع الأدوار</span>
              <span style={{ color: allRecorded ? '#16a34a' : '#185FA5' }}>
                {recordedCount}/{lines.length} {allRecorded ? '✅ جاهز!' : 'سطر'}
              </span>
            </div>
            <div style={{ height:6, background:'#e2e8f0', borderRadius:3, overflow:'hidden' }}>
              <div style={{ height:'100%', background: allRecorded ? 'linear-gradient(90deg,#10b981,#059669)' : 'linear-gradient(90deg,#185FA5,#3b82f6)', borderRadius:3, width:`${lines.length ? (recordedCount / lines.length) * 100 : 0}%`, transition:'width .4s' }}/>
            </div>
          </div>

          {/* Dialogue lines */}
          <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
            {lines.map((line, idx) => {
              const col     = speakerColor(line.speaker, speakers);
              const isRight = speakers.indexOf(line.speaker) % 2 === 0;
              return (
                <RecordableLine key={idx}
                  line={line} idx={idx}
                  isStudentLine={true}
                  recording={recordings[idx]}
                  isRecording={recordingIdx === idx}
                  isPlaying={playingIdx === idx}
                  justRecorded={!!justRecorded[idx]}
                  isGrandActive={grandIdx === idx}
                  onRecord={() => startRecording(idx)}
                  onStop={stopRecording}
                  onPlay={() => playRecording(idx)}
                  speakerCol={col}
                  isRight={isRight}
                  characterImages={characterImages}
                />
              );
            })}
          </div>

          {/* Grand Finale button */}
          <div style={{ marginTop:28, textAlign:'center' }}>
            {!allRecorded && (
              <div style={{ fontSize:'.8rem', color:'#94a3b8', marginBottom:10, fontWeight:600 }}>
                🎤 سجّل {lines.length - recordedCount} {lines.length - recordedCount === 1 ? 'سطر' : 'أسطر'} متبقية للبدء بالعرض الكامل
              </div>
            )}
            <button
              onClick={playGrandFinale}
              style={{
                padding: '16px 32px',
                borderRadius: 20,
                border: 'none',
                background: grandPlaying
                  ? 'linear-gradient(135deg,#ef4444,#dc2626)'
                  : allRecorded
                  ? 'linear-gradient(135deg,#f59e0b,#d97706)'
                  : 'linear-gradient(135deg,#94a3b8,#64748b)',
                color: '#fff',
                fontFamily: 'inherit',
                fontWeight: 900,
                fontSize: '1.05rem',
                cursor: 'pointer',
                boxShadow: allRecorded && !grandPlaying
                  ? '0 6px 24px rgba(245,158,11,.5)'
                  : '0 4px 12px rgba(0,0,0,.2)',
                transition: '.3s',
                display: 'inline-flex', alignItems: 'center', gap: 10,
                animation: allRecorded && !grandPlaying ? 'bounceIn .5s ease' : 'none',
                letterSpacing: '.02em',
              }}
            >
              {grandPlaying ? (
                <><span style={{ animation:'spin .6s linear infinite', display:'inline-block' }}>⏹</span> أوقف العرض</>
              ) : (
                <>🎬 اسْتَمِعْ لِمَسْرَحِيَّتِكَ الْكَامِلَةِ</>
              )}
            </button>

            {allRecorded && !grandPlaying && (
              <div style={{ marginTop:10, fontSize:'.78rem', color:'#16a34a', fontWeight:700 }}>
                🌟 رائع! سجّلتم جميع الأدوار — استمعوا للمسرحية كاملةً!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main exported component ────────────────────────────────────────────────────
export default function LifeSceneSimulator({ role = 'teacher', currentUser }) {
  const [scenes,  setScenes]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const [view,    setView]    = useState('list');

  useEffect(() => {
    fetch('/api/life-scene').then(r => r.json()).then(d => { setScenes(d.scenes ?? []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  function handleCreated(scene) { setScenes(prev => [scene, ...(prev ?? [])]); setView('list'); setPreview(scene); }
  function handleUpdated(scene) { setScenes(prev => prev?.map(s => s.id === scene.id ? scene : s) ?? prev); setPreview(scene); }

  async function handleTogglePublish(id, is_published) {
    const res  = await fetch(`/api/life-scene/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ is_published }) });
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
        <style>{ANIM_CSS}</style>
        {loading ? (
          <div style={{ textAlign:'center', padding:'32px 0', color:'var(--muted)' }}>جارٍ التحميل...</div>
        ) : !scenes?.length ? (
          <div style={{ textAlign:'center', padding:'40px 20px' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:10 }}>🎭</div>
            <p style={{ color:'var(--muted)' }}>لا توجد مشاهد منشورة حتى الآن</p>
          </div>
        ) : preview ? (
          <StudentSceneViewer scene={preview} onClose={() => setPreview(null)}/>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {scenes.map(s => (
              <div key={s.id} onClick={() => setPreview(s)} style={{ background:'#fff', border:'1.5px solid var(--border)', borderRadius:14, padding:'14px 18px', cursor:'pointer', transition:'.15s', display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ fontSize:'2rem' }}>🎭</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:800, fontSize:'.97rem' }}>{s.situation}</div>
                  <div style={{ fontSize:'.78rem', color:'var(--muted)', marginTop:3 }}>🎓 {s.grade} · 🎯 {s.skill}</div>
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
      <style>{ANIM_CSS}</style>
      <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)', gap:22, alignItems:'start' }}>

        {/* Left: list or create */}
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <h2 style={{ fontSize:'1.05rem', fontWeight:800, color:'var(--primary)', margin:0 }}>🎭 مسرح التعبير</h2>
            <button onClick={() => setView(v => v === 'create' ? 'list' : 'create')} style={{ padding:'8px 16px', borderRadius:10, border:'none', background: view === 'create' ? '#e2e8f0' : 'var(--primary)', color: view === 'create' ? 'var(--text)' : '#fff', fontWeight:700, fontSize:'.85rem', cursor:'pointer', fontFamily:'inherit' }}>
              {view === 'create' ? '← قائمة المشاهد' : '+ مشهد جديد'}
            </button>
          </div>

          {view === 'create' ? (
            <div style={{ background:'#fff', border:'1.5px solid var(--border)', borderRadius:14, padding:'20px 18px' }}>
              <h3 style={{ margin:'0 0 16px', fontSize:'.95rem', fontWeight:800, color:'var(--primary)' }}>✨ إنشاء مشهد جديد</h3>
              <TeacherCreator onCreated={handleCreated}/>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {loading ? (
                <div style={{ textAlign:'center', padding:'32px 0', color:'var(--muted)' }}>جارٍ التحميل...</div>
              ) : mockDisplayed ? (
                <>
                  <div style={{ background:'#fffbeb', border:'1.5px solid #fcd34d', borderRadius:12, padding:'10px 14px', fontSize:'.83rem', color:'#92400e', fontWeight:600 }}>
                    🎬 هذا مشهد تجريبي — أنشئ مشهداً حقيقياً بالضغط على "+ مشهد جديد"
                  </div>
                  <SceneCard scene={MOCK_SCENE} onTogglePublish={() => {}} onDelete={() => {}} onPreview={() => setPreview(MOCK_SCENE)}/>
                </>
              ) : scenes?.length === 0 ? (
                <div style={{ textAlign:'center', padding:'40px 20px', background:'#fff', border:'1.5px solid var(--border)', borderRadius:14 }}>
                  <div style={{ fontSize:'2.5rem', marginBottom:10 }}>🎭</div>
                  <p style={{ color:'var(--muted)', margin:0 }}>لم تنشئ أي مشاهد بعد — ابدأ الآن!</p>
                </div>
              ) : (
                scenes.map(s => <SceneCard key={s.id} scene={s} onTogglePublish={handleTogglePublish} onDelete={handleDelete} onPreview={setPreview}/>)
              )}
            </div>
          )}
        </div>

        {/* Right: preview */}
        <div style={{ position:'sticky', top:80 }}>
          {preview ? (
            <StudentSceneViewer scene={preview} onClose={() => setPreview(null)} editable onUpdate={handleUpdated}/>
          ) : (
            <div style={{ background:'#f8fafc', border:'1.5px dashed var(--border)', borderRadius:18, padding:'40px 24px', textAlign:'center' }}>
              <div style={{ fontSize:'3rem', marginBottom:12 }}>🎭</div>
              <p style={{ color:'var(--muted)', fontSize:'.9rem', margin:0 }}>اختر مشهداً من القائمة أو أنشئ مشهداً جديداً لمعاينته هنا</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
