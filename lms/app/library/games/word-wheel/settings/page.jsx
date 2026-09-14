'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '../../../../../lib/supabase';
import { getRole } from '../../../../../lib/auth-role';

const ALL_ARABIC_LETTERS = ['أ','ب','ت','ث','ج','ح','خ','د','ذ','ر','ز','س','ش','ص','ض','ط','ظ','ع','غ','ف','ق','ك','ل','م','ن','ه','و','ي'];
const TIME_OPTIONS = [60, 75, 90, 120];
const LEVEL_COLORS = {
  1:{bg:'#f0fdf4',border:'#86efac',accent:'#16a34a',name:'مبتدئ',icon:'🟢'},
  2:{bg:'#fefce8',border:'#fde047',accent:'#ca8a04',name:'متوسط',icon:'🟡'},
  3:{bg:'#fff7ed',border:'#fdba74',accent:'#ea580c',name:'متقدم',icon:'🟠'},
  4:{bg:'#fef2f2',border:'#fca5a5',accent:'#dc2626',name:'أسطوري',icon:'🔴'},
};

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function WordWheelSettingsPage() {
  // Auth
  const [user, setUser]   = useState(null);
  const [role, setRole]   = useState(null);
  const [loading, setLoading] = useState(true);

  // Tabs
  const [activeTab, setActiveTab] = useState('custom'); // 'custom' | 'standard'

  // ── CUSTOM WHEELS state ──────────────────────────────────────────────────
  const [configs, setConfigs]           = useState([]);
  const [editing, setEditing]           = useState(null);
  const [deleting, setDeleting]         = useState(null);
  const [saving, setSaving]             = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [formName, setFormName]         = useState('');
  const [formTime, setFormTime]         = useState(90);
  const [formSelectedLetters, setFormSelectedLetters] = useState([]);
  const [formCenter, setFormCenter]     = useState('');
  const [formWords, setFormWords]       = useState([]);
  const [newWord, setNewWord]           = useState('');
  const [newWordImage, setNewWordImage] = useState('');
  const [imageInputMode, setImageInputMode] = useState('url');
  const fileInputRef = useRef(null);
  const wordInputRef = useRef(null);

  // ── STANDARD WHEELS state ────────────────────────────────────────────────
  const [catalog, setCatalog]           = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [editingWheel, setEditingWheel] = useState(null); // {level,wheel_index,center,letters}
  const [wheelWords, setWheelWords]     = useState([]);
  const [newCatalogWord, setNewCatalogWord] = useState('');
  const [wheelSaving, setWheelSaving]   = useState(false);
  const [wheelTime, setWheelTime]       = useState(90);
  const [wheelMsg, setWheelMsg]         = useState(null);
  const [needSql, setNeedSql]           = useState(false);
  const catalogWordRef = useRef(null);

  // shared message
  const [msg, setMsg] = useState(null);

  // ── Auth ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user) { setLoading(false); return; }
      setUser(data.user);
      const r = getRole(data.user) || null;
      setRole(r);
      if (['teacher','admin','super_admin'].includes(r)) fetchCustomConfigs();
      else setLoading(false);
    });
  }, []);

  // ── Load catalog when tab switches ───────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'standard' && catalog.length === 0) loadCatalog();
  }, [activeTab]);

  // ── Custom configs ───────────────────────────────────────────────────────
  async function fetchCustomConfigs() {
    try {
      const res = await fetch('/api/word-wheel/configs');
      const json = await res.json();
      setConfigs(json.configs || []);
    } catch {}
    setLoading(false);
  }

  function openCreate() {
    setEditing('new'); setFormName(''); setFormTime(90);
    setFormSelectedLetters([]); setFormCenter(''); setFormWords([]);
    setNewWord(''); setNewWordImage(''); setImageInputMode('url'); setMsg(null);
  }
  function openEdit(config) {
    setEditing(config.id); setFormName(config.name); setFormTime(config.time_seconds);
    const all = [...(config.outer_letters||[]), config.center_letter].filter(Boolean);
    setFormSelectedLetters(all); setFormCenter(config.center_letter);
    setFormWords(config.valid_words || []);
    setNewWord(''); setNewWordImage(''); setImageInputMode('url'); setMsg(null);
  }
  function toggleLetter(letter) {
    if (formSelectedLetters.includes(letter)) {
      setFormSelectedLetters(p => p.filter(l => l !== letter));
      if (formCenter === letter) setFormCenter('');
    } else {
      const outerCount = formSelectedLetters.filter(l => l !== formCenter).length;
      if (outerCount >= 8 && letter !== formCenter) return;
      setFormSelectedLetters(p => [...p, letter]);
    }
  }
  function setAsCenter(l) { setFormCenter(p => p === l ? '' : l); }
  function addWord() {
    const w = newWord.trim();
    if (!w || formWords.some(fw => fw.word === w)) return;
    setFormWords(p => [...p, { word: w, image: newWordImage || null }]);
    setNewWord(''); setNewWordImage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (wordInputRef.current) wordInputRef.current.focus();
  }
  function removeWord(i) { setFormWords(p => p.filter((_, idx) => idx !== i)); }
  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    try { setNewWordImage(await fileToBase64(file)); } catch {}
  }
  async function handleSave() {
    if (!formName.trim()) { setMsg({ ok:false, text:'أدخل اسم العجلة' }); return; }
    if (!formCenter)      { setMsg({ ok:false, text:'اختر الحرف الأوسط' }); return; }
    const outer = formSelectedLetters.filter(l => l !== formCenter);
    if (outer.length < 2) { setMsg({ ok:false, text:'اختر حرفين خارجيين على الأقل' }); return; }
    setSaving(true); setMsg(null);
    const body = { name: formName.trim(), center_letter: formCenter, outer_letters: outer, valid_words: formWords, time_seconds: formTime };
    const isNew = editing === 'new';
    const url    = isNew ? '/api/word-wheel/configs' : `/api/word-wheel/configs/${editing}`;
    try {
      const res  = await fetch(url, { method: isNew?'POST':'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) { setMsg({ ok:false, text: json.error||'فشل الحفظ' }); setSaving(false); return; }
      if (isNew) setConfigs(p => [json.config,...p]);
      else       setConfigs(p => p.map(c => c.id===editing ? json.config : c));
      setEditing(null);
      setMsg({ ok:true, text:'✅ تم حفظ العجلة بنجاح' });
      setTimeout(() => setMsg(null), 3000);
    } catch { setMsg({ ok:false, text:'خطأ في الاتصال' }); }
    setSaving(false);
  }
  async function handleDelete(id) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/word-wheel/configs/${id}`, { method:'DELETE' });
      if (res.ok) setConfigs(p => p.filter(c => c.id !== id));
    } catch {}
    setDeleting(null); setConfirmDelete(null);
  }
  const outerLetters = formSelectedLetters.filter(l => l !== formCenter);

  // ── Standard catalog ────────────────────────────────────────────────────
  async function loadCatalog() {
    setCatalogLoading(true);
    try {
      const res = await fetch('/api/word-wheel/catalog');
      const json = await res.json();
      setCatalog(json.catalog || []);
    } catch {}
    setCatalogLoading(false);
  }

  function openWheelEditor(wheel) {
    setEditingWheel(wheel);
    setWheelWords([...(wheel.valid_words || [])]);
    setWheelTime(wheel.time || 90);
    setNewCatalogWord('');
    setWheelMsg(null);
    setNeedSql(false);
    setTimeout(() => catalogWordRef.current?.focus(), 100);
  }

  function addCatalogWord() {
    const w = newCatalogWord.trim();
    if (!w || wheelWords.includes(w)) return;
    setWheelWords(p => [...p, w]);
    setNewCatalogWord('');
    catalogWordRef.current?.focus();
  }
  function removeCatalogWord(word) { setWheelWords(p => p.filter(w => w !== word)); }

  async function saveWheelWords() {
    if (!editingWheel) return;
    setWheelSaving(true); setWheelMsg(null); setNeedSql(false);
    try {
      const res = await fetch('/api/word-wheel/catalog', {
        method: 'PUT',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          level:         editingWheel.level,
          wheel_index:   editingWheel.wheel_index,
          valid_words:   wheelWords,
          center_letter: editingWheel.center,
          outer_letters: editingWheel.letters,
          time_seconds:  wheelTime,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.need_sql) setNeedSql(true);
        setWheelMsg({ ok:false, text: json.error });
      } else {
        setCatalog(p => p.map(w =>
          w.level === editingWheel.level && w.wheel_index === editingWheel.wheel_index
            ? { ...w, valid_words: wheelWords, time: wheelTime }
            : w
        ));
        setEditingWheel(prev => ({ ...prev, valid_words: wheelWords, time: wheelTime }));
        setWheelMsg({ ok:true, text:'✅ تم حفظ كلمات العجلة بنجاح' });
        setTimeout(() => setWheelMsg(null), 3000);
      }
    } catch { setWheelMsg({ ok:false, text:'خطأ في الاتصال' }); }
    setWheelSaving(false);
  }

  // ── Guard ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={S.fullCenter}>
      <div style={S.spinner}/>
      <p style={{color:'#fff',fontFamily:'Cairo,Tajawal,sans-serif',marginTop:16}}>جارٍ التحميل…</p>
    </div>
  );
  if (!user || !['teacher','admin','super_admin'].includes(role)) return (
    <div style={S.fullCenter}>
      <div style={S.authCard}>
        <div style={{fontSize:48}}>🔒</div>
        <h2 style={{fontFamily:'Cairo,Tajawal,sans-serif',color:'#92400E',margin:'12px 0 4px'}}>غير مصرح</h2>
        <p style={{fontFamily:'Cairo,Tajawal,sans-serif',color:'#6B7280'}}>هذه الصفحة خاصة بالمعلمين والمشرفين فقط</p>
        <Link href="/library/games/word-wheel" style={{...S.btn,marginTop:20,display:'inline-block',textDecoration:'none'}}>← العودة للعبة</Link>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div style={S.page} dir="rtl">
      {/* Header */}
      <div style={S.header}>
        <Link href="/library/games/word-wheel" style={S.backLink}>← العودة للعبة</Link>
        <h1 style={S.pageTitle}>⚙️ إعداد عجلات الكلمات</h1>
        {activeTab === 'custom' && (
          <button onClick={openCreate} style={S.addBtn}>+ إضافة عجلة مخصصة</button>
        )}
      </div>

      {/* Global message */}
      {msg && (
        <div style={{...S.msgBanner,background:msg.ok?'#D1FAE5':'#FEE2E2',color:msg.ok?'#065F46':'#991B1B'}}>{msg.text}</div>
      )}

      {/* Tab navigation */}
      <div style={{maxWidth:780,margin:'0 auto 20px',display:'flex',gap:8}}>
        {[{id:'standard',label:'🎡 العجلات الأساسية (20)'},{id:'custom',label:'⭐ العجلات المخصصة'}].map(tab=>(
          <button key={tab.id} onClick={()=>setActiveTab(tab.id)} style={{
            padding:'10px 22px',borderRadius:24,border:'none',cursor:'pointer',
            fontFamily:'Cairo,Tajawal,sans-serif',fontWeight:700,fontSize:'.92rem',
            background: activeTab===tab.id ? '#fff' : 'rgba(255,255,255,0.2)',
            color: activeTab===tab.id ? '#92400E' : 'rgba(255,255,255,0.85)',
            boxShadow: activeTab===tab.id ? '0 2px 12px rgba(0,0,0,0.15)' : 'none',
          }}>{tab.label}</button>
        ))}
      </div>

      {/* ════════════════ STANDARD WHEELS TAB ════════════════ */}
      {activeTab === 'standard' && (
        <div style={{maxWidth:780,margin:'0 auto'}}>

          {/* SQL notice */}
          {needSql && (
            <div style={{background:'#FEF3C7',border:'1.5px solid #FDE68A',borderRadius:14,padding:'14px 18px',marginBottom:16}}>
              <p style={{fontFamily:'Cairo,Tajawal,sans-serif',fontWeight:700,color:'#92400E',margin:'0 0 8px'}}>❌ يجب تشغيل هذا الاستعلام SQL في Supabase أولاً:</p>
              <pre style={{background:'#1e1e1e',color:'#d4d4d4',padding:'12px 14px',borderRadius:10,fontSize:'.8rem',overflow:'auto',margin:0,direction:'ltr'}}>{`CREATE TABLE IF NOT EXISTS word_wheel_catalog (
  id          BIGSERIAL PRIMARY KEY,
  level       INT NOT NULL CHECK (level BETWEEN 1 AND 4),
  wheel_index INT NOT NULL CHECK (wheel_index BETWEEN 0 AND 4),
  center_letter TEXT NOT NULL,
  outer_letters TEXT[] NOT NULL DEFAULT '{}',
  valid_words   TEXT[] NOT NULL DEFAULT '{}',
  time_seconds  INT NOT NULL DEFAULT 90,
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(level, wheel_index)
);
NOTIFY pgrst, 'reload schema';`}</pre>
            </div>
          )}

          {/* Level selector */}
          <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
            {[1,2,3,4].map(lvl => {
              const c = LEVEL_COLORS[lvl];
              const done = catalog.filter(w => w.level===lvl && (w.valid_words||[]).length > 0).length;
              return (
                <button key={lvl} onClick={()=>{setSelectedLevel(lvl);setEditingWheel(null);}} style={{
                  flex:1,minWidth:100,padding:'10px 16px',borderRadius:16,border:'2px solid',cursor:'pointer',
                  fontFamily:'Cairo,Tajawal,sans-serif',fontWeight:700,fontSize:'.9rem',
                  background: selectedLevel===lvl ? '#fff' : 'rgba(255,255,255,0.15)',
                  borderColor: selectedLevel===lvl ? c.accent : 'transparent',
                  color: selectedLevel===lvl ? c.accent : 'rgba(255,255,255,0.85)',
                  boxShadow: selectedLevel===lvl ? `0 2px 12px ${c.accent}40` : 'none',
                }}>
                  {c.icon} {c.name}
                  <div style={{fontSize:'.75rem',fontWeight:500,marginTop:2,opacity:.75}}>{done}/5 عجلة</div>
                </button>
              );
            })}
          </div>

          {catalogLoading ? (
            <div style={{textAlign:'center',padding:'40px 0',color:'rgba(255,255,255,0.8)',fontFamily:'Cairo,Tajawal,sans-serif'}}>
              🎡 جارٍ تحميل العجلات…
            </div>
          ) : (
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:14}}>
              {catalog.filter(w => w.level === selectedLevel).map(wheel => {
                const c = LEVEL_COLORS[wheel.level];
                const isActive = editingWheel?.level===wheel.level && editingWheel?.wheel_index===wheel.wheel_index;
                return (
                  <div key={`${wheel.level}_${wheel.wheel_index}`} style={{
                    background: isActive ? '#fff' : 'rgba(255,255,255,0.97)',
                    borderRadius:16, padding:'16px',
                    border: isActive ? `2.5px solid ${c.accent}` : '2px solid transparent',
                    boxShadow: isActive ? `0 0 0 3px ${c.accent}30` : '0 4px 14px rgba(0,0,0,0.12)',
                    transition:'all .2s',cursor:'pointer',
                  }} onClick={()=>openWheelEditor(wheel)}>
                    {/* Header */}
                    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                      <div style={{width:44,height:44,borderRadius:'50%',background:`linear-gradient(135deg,${c.accent}90,${c.accent})`,
                        display:'flex',alignItems:'center',justifyContent:'center',
                        fontSize:'1.3rem',fontWeight:900,color:'#fff',flexShrink:0}}>
                        {wheel.center}
                      </div>
                      <div>
                        <div style={{fontSize:'.75rem',color:'#6B7280',fontFamily:'Cairo,Tajawal,sans-serif'}}>العجلة {(wheel.wheel_index||0)+1}</div>
                        <div style={{fontWeight:800,color:c.accent,fontFamily:'Cairo,Tajawal,sans-serif',fontSize:'.95rem'}}>
                          {(wheel.valid_words||[]).length} كلمة
                        </div>
                      </div>
                      {isActive && <div style={{marginRight:'auto',fontSize:10,background:c.accent,color:'#fff',borderRadius:20,padding:'2px 8px',fontFamily:'Cairo,Tajawal,sans-serif',fontWeight:700}}>تعديل</div>}
                    </div>
                    {/* Outer letters */}
                    <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:10}}>
                      {(wheel.letters||[]).map((l,i)=>(
                        <span key={i} style={{width:26,height:26,borderRadius:'50%',background:'#FEF3C7',color:'#92400E',
                          display:'inline-flex',alignItems:'center',justifyContent:'center',
                          fontSize:'.85rem',fontWeight:700,border:'1px solid #F59E0B'}}>{l}</span>
                      ))}
                    </div>
                    {/* Word chips preview */}
                    <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                      {(wheel.valid_words||[]).slice(0,6).map(w=>(
                        <span key={w} style={{background:c.bg,color:c.accent,borderRadius:12,
                          padding:'2px 8px',fontSize:'.75rem',fontWeight:700,
                          fontFamily:'Cairo,Tajawal,sans-serif',border:`1px solid ${c.border}`}}>{w}</span>
                      ))}
                      {(wheel.valid_words||[]).length > 6 && (
                        <span style={{color:'#9CA3AF',fontSize:'.75rem',fontFamily:'Cairo,Tajawal,sans-serif'}}>+{(wheel.valid_words||[]).length-6}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Inline word editor */}
          {editingWheel && (
            <div style={{background:'#fff',borderRadius:18,padding:'22px 20px',marginTop:18,
              boxShadow:'0 8px 32px rgba(0,0,0,0.18)',border:`2.5px solid ${LEVEL_COLORS[editingWheel.level].accent}40`}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:42,height:42,borderRadius:'50%',
                    background:`linear-gradient(135deg,${LEVEL_COLORS[editingWheel.level].accent}80,${LEVEL_COLORS[editingWheel.level].accent})`,
                    display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.2rem',fontWeight:900,color:'#fff'}}>
                    {editingWheel.center}
                  </div>
                  <div>
                    <div style={{fontFamily:'Cairo,Tajawal,sans-serif',fontWeight:800,color:'#1F2937',fontSize:'1rem'}}>
                      {LEVEL_COLORS[editingWheel.level].name} — العجلة {(editingWheel.wheel_index||0)+1}
                    </div>
                    <div style={{fontFamily:'Cairo,Tajawal,sans-serif',fontSize:'.8rem',color:'#6B7280'}}>
                      الحروف: {editingWheel.center} + {(editingWheel.letters||[]).join(' ')}
                    </div>
                  </div>
                </div>
                <button onClick={()=>setEditingWheel(null)}
                  style={{background:'#F3F4F6',border:'none',borderRadius:'50%',width:34,height:34,cursor:'pointer',fontSize:'1rem',color:'#6B7280'}}>✕</button>
              </div>

              {/* Time selector */}
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
                <span style={{fontFamily:'Cairo,Tajawal,sans-serif',fontWeight:700,color:'#4B5563',fontSize:'.88rem'}}>المدة:</span>
                {TIME_OPTIONS.map(t=>(
                  <button key={t} onClick={()=>setWheelTime(t)} style={{
                    border:'none',borderRadius:20,padding:'5px 14px',cursor:'pointer',
                    fontFamily:'Cairo,Tajawal,sans-serif',fontSize:'.85rem',fontWeight:700,
                    background: wheelTime===t ? LEVEL_COLORS[editingWheel.level].accent : '#F3F4F6',
                    color: wheelTime===t ? '#fff' : '#374151',
                  }}>{t}ث</button>
                ))}
              </div>

              {/* Words chips */}
              <div style={{minHeight:60,background:'#FAFAFA',border:'1.5px solid #E5E7EB',borderRadius:12,
                padding:'10px 12px',marginBottom:12,display:'flex',flexWrap:'wrap',gap:8,alignContent:'flex-start'}}>
                {wheelWords.length === 0 ? (
                  <span style={{color:'#D1D5DB',fontFamily:'Cairo,Tajawal,sans-serif',fontSize:'.88rem'}}>لا كلمات — أضف أولى الكلمات</span>
                ) : wheelWords.map(word=>(
                  <span key={word} style={{display:'inline-flex',alignItems:'center',gap:5,
                    background:LEVEL_COLORS[editingWheel.level].bg,
                    border:`1.5px solid ${LEVEL_COLORS[editingWheel.level].border}`,
                    color:LEVEL_COLORS[editingWheel.level].accent,
                    borderRadius:20,padding:'4px 10px',
                    fontFamily:'Cairo,Tajawal,sans-serif',fontWeight:700,fontSize:'.92rem'}}>
                    {word}
                    <button onClick={()=>removeCatalogWord(word)}
                      style={{background:'none',border:'none',cursor:'pointer',color:'#DC2626',
                        fontWeight:900,fontSize:'.8rem',padding:0,lineHeight:1}}>✕</button>
                  </span>
                ))}
              </div>

              {/* Add word */}
              <div style={{display:'flex',gap:8,marginBottom:14}}>
                <input
                  ref={catalogWordRef}
                  value={newCatalogWord}
                  onChange={e=>setNewCatalogWord(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&addCatalogWord()}
                  placeholder="اكتب كلمة وأضغط Enter أو +"
                  dir="rtl"
                  style={{flex:1,padding:'10px 14px',border:'1.5px solid #D1D5DB',borderRadius:10,
                    fontFamily:'Cairo,Tajawal,sans-serif',fontSize:'1rem',outline:'none',background:'#fff'}}
                />
                <button onClick={addCatalogWord} style={{
                  background:'linear-gradient(135deg,#F59E0B,#D97706)',color:'#fff',
                  border:'none',borderRadius:10,padding:'10px 18px',
                  fontFamily:'Cairo,Tajawal,sans-serif',fontSize:'.95rem',fontWeight:700,cursor:'pointer'}}>
                  + إضافة
                </button>
              </div>

              {/* Wheel message */}
              {wheelMsg && (
                <div style={{borderRadius:10,padding:'8px 14px',marginBottom:12,
                  background:wheelMsg.ok?'#D1FAE5':'#FEE2E2',
                  color:wheelMsg.ok?'#065F46':'#991B1B',
                  fontFamily:'Cairo,Tajawal,sans-serif',fontWeight:600,fontSize:'.9rem'}}>
                  {wheelMsg.text}
                </div>
              )}

              {/* Save */}
              <button onClick={saveWheelWords} disabled={wheelSaving} style={{
                width:'100%',padding:'13px',border:'none',borderRadius:12,cursor:'pointer',
                fontFamily:'Cairo,Tajawal,sans-serif',fontSize:'1rem',fontWeight:700,
                background:'linear-gradient(135deg,#F59E0B,#92400E)',color:'#fff',
                boxShadow:'0 4px 14px rgba(217,119,6,0.35)',opacity:wheelSaving?0.7:1}}>
                {wheelSaving ? 'جارٍ الحفظ…' : `حفظ كلمات العجلة (${wheelWords.length} كلمة) 💾`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ════════════════ CUSTOM WHEELS TAB ════════════════ */}
      {activeTab === 'custom' && (
        <div style={{maxWidth:780,margin:'0 auto'}}>
          {configs.length === 0 ? (
            <div style={S.emptyState}>
              <div style={{fontSize:56}}>🎡</div>
              <p style={{fontFamily:'Cairo,Tajawal,sans-serif',color:'#6B7280',fontSize:'1.1rem',marginTop:12}}>
                لا توجد عجلات بعد — أضف أول عجلة!
              </p>
            </div>
          ) : (
            <div style={S.grid}>
              {configs.map(cfg => (
                <div key={cfg.id} style={S.card}>
                  <div style={S.wheelPreview}>
                    <div style={S.centerCircle}>{cfg.center_letter||'?'}</div>
                    <div style={S.outerLetters}>
                      {(cfg.outer_letters||[]).slice(0,8).map((l,i)=>(
                        <div key={i} style={S.outerCircle}>{l}</div>
                      ))}
                    </div>
                  </div>
                  <h3 style={S.cardTitle}>{cfg.name}</h3>
                  <div style={S.chipsRow}>
                    <span style={S.chip}>الأوسط: {cfg.center_letter}</span>
                    <span style={S.chip}>{(cfg.outer_letters||[]).length} حرف</span>
                    <span style={S.chip}>{(cfg.valid_words||[]).length} كلمة</span>
                    <span style={{...S.chip,background:'#FEF3C7',color:'#92400E'}}>{cfg.time_seconds}ث</span>
                  </div>
                  <div style={S.cardActions}>
                    <button onClick={()=>openEdit(cfg)} style={S.editBtn}>تعديل ✏️</button>
                    <button onClick={()=>setConfirmDelete(cfg.id)} style={S.deleteBtn} disabled={deleting===cfg.id}>
                      {deleting===cfg.id?'...':'حذف 🗑️'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div style={S.overlay} onClick={()=>setConfirmDelete(null)}>
          <div style={{...S.modal,maxWidth:380,padding:32,textAlign:'center'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:40}}>🗑️</div>
            <h3 style={{fontFamily:'Cairo,Tajawal,sans-serif',color:'#1F2937',margin:'12px 0 8px'}}>تأكيد الحذف</h3>
            <p style={{fontFamily:'Cairo,Tajawal,sans-serif',color:'#6B7280',margin:'0 0 24px'}}>هل أنت متأكد من حذف هذه العجلة؟</p>
            <div style={{display:'flex',gap:12,justifyContent:'center'}}>
              <button onClick={()=>handleDelete(confirmDelete)} disabled={deleting===confirmDelete}
                style={{...S.deleteBtn,padding:'10px 24px',fontSize:'1rem'}}>
                {deleting===confirmDelete?'جارٍ الحذف…':'نعم، احذف'}
              </button>
              <button onClick={()=>setConfirmDelete(null)} style={{...S.editBtn,padding:'10px 24px',fontSize:'1rem'}}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Custom wheel editor modal */}
      {editing !== null && (
        <div style={S.overlay} onClick={()=>!saving&&setEditing(null)}>
          <div style={S.modal} onClick={e=>e.stopPropagation()}>
            <div style={S.modalHeader}>
              <h2 style={S.modalTitle}>{editing==='new'?'✨ إضافة عجلة جديدة':'✏️ تعديل العجلة'}</h2>
              <button onClick={()=>!saving&&setEditing(null)} style={S.closeBtn} disabled={saving}>✕</button>
            </div>

            {/* Name & time */}
            <div style={S.section}>
              <h3 style={S.sectionTitle}>الاسم والوقت</h3>
              <div style={S.field}>
                <label style={S.label}>اسم العجلة *</label>
                <input value={formName} onChange={e=>setFormName(e.target.value)}
                  placeholder="مثال: عجلة الغلال" style={S.input} dir="rtl"/>
              </div>
              <div style={S.field}>
                <label style={S.label}>المدة الزمنية</label>
                <div style={S.timeButtons}>
                  {TIME_OPTIONS.map(t=>(
                    <button key={t} onClick={()=>setFormTime(t)} style={{
                      ...S.timeBtn,
                      background: formTime===t?'#D97706':'#F3F4F6',
                      color: formTime===t?'#fff':'#374151', fontWeight: formTime===t?700:400,
                    }}>{t}ث</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Letters */}
            <div style={S.section}>
              <h3 style={S.sectionTitle}>اختيار الحروف <span style={{fontSize:'.85rem',color:'#6B7280',fontWeight:400,marginRight:8}}>الخارجية: {outerLetters.length}/8</span></h3>
              <div style={S.lettersGrid}>
                {ALL_ARABIC_LETTERS.map(letter => {
                  const isSelected = formSelectedLetters.includes(letter);
                  const isCenter   = formCenter === letter;
                  const outerFull  = outerLetters.length >= 8 && !isSelected && !isCenter;
                  return (
                    <button key={letter} onClick={()=>toggleLetter(letter)} disabled={outerFull} style={{
                      ...S.letterBtn,
                      background: isCenter ? 'linear-gradient(135deg,#F59E0B,#D97706)' : isSelected ? 'linear-gradient(135deg,#FCD34D,#F59E0B)' : '#F3F4F6',
                      color: isSelected||isCenter ? '#fff' : '#374151',
                      border: isCenter ? '2px solid #92400E' : isSelected ? '2px solid #D97706' : '2px solid transparent',
                      opacity: outerFull ? 0.4 : 1, cursor: outerFull ? 'not-allowed' : 'pointer',
                    }}>{letter}</button>
                  );
                })}
              </div>
              {formSelectedLetters.length > 0 && (
                <div style={S.selectedSection}>
                  <p style={S.hintText}>انقر على حرف لتحديده <strong>الحرف الأوسط 👑</strong>{formCenter&&<span style={{color:'#D97706'}}> — الأوسط: {formCenter}</span>}</p>
                  <div style={S.selectedChips}>
                    {formSelectedLetters.map(l=>(
                      <button key={l} onClick={()=>setAsCenter(l)} style={{
                        ...S.letterChip,
                        background: formCenter===l?'#D97706':'#FEF3C7',
                        color: formCenter===l?'#fff':'#92400E',
                        border: formCenter===l?'2px solid #92400E':'2px solid #F59E0B',
                        fontWeight:700,
                      }}>{formCenter===l&&'👑 '}{l}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Words */}
            <div style={S.section}>
              <h3 style={S.sectionTitle}>الكلمات الصحيحة ({formWords.length})</h3>
              <div style={S.addWordForm}>
                <input ref={wordInputRef} value={newWord} onChange={e=>setNewWord(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&addWord()}
                  placeholder="اكتب كلمة…" style={{...S.input,flex:1,marginBottom:0}} dir="rtl"/>
                <button onClick={addWord} style={S.addWordBtn}>+ إضافة</button>
              </div>
              <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:8}}>
                <span style={{fontFamily:'Cairo,Tajawal,sans-serif',fontSize:'.85rem',color:'#6B7280'}}>صورة الكلمة:</span>
                {[{id:'url',label:'URL'},{id:'file',label:'رفع ملف'}].map(m=>(
                  <button key={m.id} onClick={()=>setImageInputMode(m.id)} style={{
                    ...S.toggleBtn, background:imageInputMode===m.id?'#D97706':'#E5E7EB',
                    color:imageInputMode===m.id?'#fff':'#374151'}}>{m.label}</button>
                ))}
                {newWordImage&&<button onClick={()=>{setNewWordImage('');if(fileInputRef.current)fileInputRef.current.value='';}} style={{...S.toggleBtn,background:'#FEE2E2',color:'#DC2626'}}>✕ إزالة</button>}
              </div>
              <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:12}}>
                {imageInputMode==='url' ? (
                  <input value={newWordImage} onChange={e=>setNewWordImage(e.target.value)}
                    placeholder="https://..." style={{...S.input,flex:1,marginBottom:0,fontSize:'.85rem'}} dir="ltr"/>
                ) : (
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange}
                    style={{fontFamily:'Cairo,Tajawal,sans-serif',fontSize:'.85rem',flex:1}}/>
                )}
                {newWordImage&&<img src={newWordImage} alt="" style={{width:52,height:52,borderRadius:8,objectFit:'cover',border:'2px solid #D97706'}} onError={e=>e.target.style.display='none'}/>}
              </div>
              {formWords.length===0 ? (
                <p style={{fontFamily:'Cairo,Tajawal,sans-serif',color:'#9CA3AF',fontSize:'.9rem',textAlign:'center',padding:'16px 0'}}>لم تُضف كلمات بعد</p>
              ) : (
                <div style={S.wordsList}>
                  {formWords.map((fw,i)=>(
                    <div key={i} style={S.wordRow}>
                      {fw.image ? (
                        <img src={fw.image} alt={fw.word} style={{width:48,height:48,borderRadius:8,objectFit:'cover',border:'1px solid #E5E7EB',flexShrink:0}} onError={e=>e.target.style.display='none'}/>
                      ) : (
                        <div style={S.noImagePlaceholder}>🔤</div>
                      )}
                      <span style={S.wordText}>{fw.word}</span>
                      <button onClick={()=>removeWord(i)} style={S.removeWordBtn}>✕ حذف</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {msg&&!msg.ok&&(
              <div style={{...S.msgBanner,background:'#FEE2E2',color:'#991B1B',margin:'0 0 16px'}}>⚠️ {msg.text}</div>
            )}
            <div style={{display:'flex',gap:12,justifyContent:'flex-end'}}>
              <button onClick={()=>!saving&&setEditing(null)} disabled={saving} style={S.cancelBtn}>إلغاء</button>
              <button onClick={handleSave} disabled={saving} style={S.saveBtn}>{saving?'جارٍ الحفظ…':'حفظ العجلة 💾'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const S = {
  page:{ minHeight:'100vh',background:'linear-gradient(135deg,#92400E,#D97706)',padding:'24px 16px 48px',fontFamily:'Cairo,Tajawal,sans-serif' },
  fullCenter:{ minHeight:'100vh',background:'linear-gradient(135deg,#92400E,#D97706)',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',padding:24 },
  spinner:{ width:48,height:48,border:'4px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.8s linear infinite' },
  authCard:{ background:'#fff',borderRadius:20,padding:'40px 48px',textAlign:'center',boxShadow:'0 8px 32px rgba(0,0,0,0.2)' },
  header:{ maxWidth:780,margin:'0 auto 20px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12 },
  backLink:{ color:'rgba(255,255,255,0.85)',textDecoration:'none',fontFamily:'Cairo,Tajawal,sans-serif',fontSize:'.95rem',background:'rgba(255,255,255,0.15)',padding:'8px 16px',borderRadius:20 },
  pageTitle:{ color:'#fff',fontFamily:'Cairo,Tajawal,sans-serif',fontSize:'1.5rem',fontWeight:700,margin:0,textShadow:'0 2px 4px rgba(0,0,0,0.2)' },
  addBtn:{ background:'#fff',color:'#92400E',border:'none',borderRadius:24,padding:'10px 20px',fontFamily:'Cairo,Tajawal,sans-serif',fontSize:'.95rem',fontWeight:700,cursor:'pointer',boxShadow:'0 4px 12px rgba(0,0,0,0.15)' },
  btn:{ background:'linear-gradient(135deg,#D97706,#92400E)',color:'#fff',border:'none',borderRadius:20,padding:'10px 20px',fontFamily:'Cairo,Tajawal,sans-serif',fontSize:'.95rem',fontWeight:700,cursor:'pointer' },
  msgBanner:{ maxWidth:780,margin:'0 auto 16px',padding:'12px 20px',borderRadius:12,fontFamily:'Cairo,Tajawal,sans-serif',fontSize:'.95rem',fontWeight:600,textAlign:'center' },
  emptyState:{ background:'#fff',borderRadius:20,padding:'60px 24px',textAlign:'center' },
  grid:{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:16 },
  card:{ background:'#fff',borderRadius:16,padding:'20px 16px',boxShadow:'0 4px 16px rgba(0,0,0,0.12)',display:'flex',flexDirection:'column',gap:10 },
  wheelPreview:{ display:'flex',alignItems:'center',gap:10,flexWrap:'wrap' },
  centerCircle:{ width:44,height:44,borderRadius:'50%',background:'linear-gradient(135deg,#F59E0B,#D97706)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.2rem',fontWeight:700,boxShadow:'0 2px 8px rgba(217,119,6,0.4)',flexShrink:0 },
  outerLetters:{ display:'flex',flexWrap:'wrap',gap:4,flex:1 },
  outerCircle:{ width:30,height:30,borderRadius:'50%',background:'#FEF3C7',color:'#92400E',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.85rem',fontWeight:600,border:'1px solid #F59E0B' },
  cardTitle:{ fontFamily:'Cairo,Tajawal,sans-serif',fontSize:'1.1rem',fontWeight:700,color:'#1F2937',margin:0 },
  chipsRow:{ display:'flex',flexWrap:'wrap',gap:6 },
  chip:{ background:'#F3F4F6',color:'#6B7280',borderRadius:12,padding:'3px 10px',fontSize:'.78rem',fontFamily:'Cairo,Tajawal,sans-serif',fontWeight:500 },
  cardActions:{ display:'flex',gap:8,marginTop:4 },
  editBtn:{ flex:1,background:'#EEF2FF',color:'#4338CA',border:'none',borderRadius:10,padding:'8px 12px',fontFamily:'Cairo,Tajawal,sans-serif',fontSize:'.88rem',fontWeight:600,cursor:'pointer' },
  deleteBtn:{ flex:1,background:'#FEE2E2',color:'#DC2626',border:'none',borderRadius:10,padding:'8px 12px',fontFamily:'Cairo,Tajawal,sans-serif',fontSize:'.88rem',fontWeight:600,cursor:'pointer' },
  overlay:{ position:'fixed',inset:0,background:'rgba(0,0,0,0.65)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16 },
  modal:{ background:'#fff',borderRadius:20,padding:'28px 24px',maxWidth:720,width:'100%',maxHeight:'90vh',overflowY:'auto',boxShadow:'0 16px 48px rgba(0,0,0,0.25)' },
  modalHeader:{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20 },
  modalTitle:{ fontFamily:'Cairo,Tajawal,sans-serif',fontSize:'1.3rem',fontWeight:700,color:'#1F2937',margin:0 },
  closeBtn:{ background:'#F3F4F6',border:'none',borderRadius:'50%',width:36,height:36,fontSize:'1rem',cursor:'pointer',color:'#6B7280' },
  section:{ background:'#FAFAFA',border:'1px solid #E5E7EB',borderRadius:14,padding:'16px 18px',marginBottom:16 },
  sectionTitle:{ fontFamily:'Cairo,Tajawal,sans-serif',fontSize:'1rem',fontWeight:700,color:'#374151',margin:'0 0 14px',paddingBottom:8,borderBottom:'2px solid #FDE68A' },
  field:{ marginBottom:14 },
  label:{ display:'block',fontFamily:'Cairo,Tajawal,sans-serif',fontSize:'.9rem',fontWeight:600,color:'#4B5563',marginBottom:6 },
  input:{ width:'100%',padding:'10px 14px',border:'1.5px solid #D1D5DB',borderRadius:10,fontFamily:'Cairo,Tajawal,sans-serif',fontSize:'1rem',color:'#1F2937',outline:'none',boxSizing:'border-box',marginBottom:12,background:'#fff' },
  timeButtons:{ display:'flex',gap:10,flexWrap:'wrap' },
  timeBtn:{ border:'none',borderRadius:24,padding:'8px 20px',fontFamily:'Cairo,Tajawal,sans-serif',fontSize:'.95rem',cursor:'pointer' },
  lettersGrid:{ display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:6,marginBottom:14 },
  letterBtn:{ width:'100%',aspectRatio:'1',minHeight:38,border:'2px solid transparent',borderRadius:10,fontFamily:'Cairo,Tajawal,sans-serif',fontSize:'1.05rem',fontWeight:700,padding:0 },
  selectedSection:{ background:'#FFFBEB',border:'1px solid #FDE68A',borderRadius:12,padding:'12px 14px',marginTop:6 },
  hintText:{ fontFamily:'Cairo,Tajawal,sans-serif',fontSize:'.85rem',color:'#6B7280',margin:'0 0 10px' },
  selectedChips:{ display:'flex',flexWrap:'wrap',gap:8 },
  letterChip:{ padding:'6px 16px',borderRadius:20,fontFamily:'Cairo,Tajawal,sans-serif',fontSize:'1rem',cursor:'pointer' },
  addWordForm:{ display:'flex',gap:10,alignItems:'center',marginBottom:12 },
  addWordBtn:{ background:'linear-gradient(135deg,#F59E0B,#D97706)',color:'#fff',border:'none',borderRadius:10,padding:'10px 18px',fontFamily:'Cairo,Tajawal,sans-serif',fontSize:'.95rem',fontWeight:700,cursor:'pointer',whiteSpace:'nowrap' },
  toggleBtn:{ border:'none',borderRadius:16,padding:'5px 14px',fontFamily:'Cairo,Tajawal,sans-serif',fontSize:'.82rem',fontWeight:600,cursor:'pointer' },
  wordsList:{ display:'flex',flexDirection:'column',gap:8,maxHeight:260,overflowY:'auto',paddingRight:4 },
  wordRow:{ display:'flex',alignItems:'center',gap:10,background:'#fff',border:'1px solid #E5E7EB',borderRadius:10,padding:'8px 12px' },
  noImagePlaceholder:{ width:48,height:48,borderRadius:8,background:'#F3F4F6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.3rem',flexShrink:0 },
  wordText:{ flex:1,fontFamily:'Cairo,Tajawal,sans-serif',fontSize:'1.1rem',fontWeight:700,color:'#1F2937' },
  removeWordBtn:{ background:'#FEE2E2',color:'#DC2626',border:'none',borderRadius:8,padding:'5px 12px',fontFamily:'Cairo,Tajawal,sans-serif',fontSize:'.82rem',fontWeight:600,cursor:'pointer',whiteSpace:'nowrap' },
  saveBtn:{ background:'linear-gradient(135deg,#F59E0B,#92400E)',color:'#fff',border:'none',borderRadius:12,padding:'12px 28px',fontFamily:'Cairo,Tajawal,sans-serif',fontSize:'1rem',fontWeight:700,cursor:'pointer',boxShadow:'0 4px 12px rgba(217,119,6,0.35)' },
  cancelBtn:{ background:'#F3F4F6',color:'#6B7280',border:'none',borderRadius:12,padding:'12px 24px',fontFamily:'Cairo,Tajawal,sans-serif',fontSize:'1rem',fontWeight:600,cursor:'pointer' },
};
