'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { createClient as createBrowserClient } from '../../../../lib/supabase';

// ─── إعدادات اللعبة الافتراضية ────────────────────────────────────────
const DEFAULT_CONFIG = {
  ROUND_SIZE:    10,
  CHOICES_COUNT:  5,
  TOPIC_FILTER:  null,
  GRADE_FILTER:  null,
  MIN_WORD_LEN:   2,
  MAX_WORD_LEN:  12,
};

// حروف الفقاعات (28 حرفاً أساسياً)
const ARABIC_LETTERS = 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي';
// حروف قابلة للإخفاء (تشمل ة ء أ إ ئ ؤ)
const PICKABLE = 'ابتةثجحخدذرزسشصضطظعغفقكلمنهويءأإئؤ';

const TOPIC_EMOJI = {
  'الحيوانات':'🐾','النباتات':'🌿','الروتين اليومي':'⏰',
  'الأدوات':'🔧','الأسرة':'👨‍👩‍👧','الطعام':'🍎','المدرسة':'🏫',
  'المواصلات':'🚗','الملابس':'👕','الطبيعة':'🌄',
};

const BUBBLE_COLORS = ['#FF6B6B','#4ECDC4','#FFE66D','#A8E6CF','#DDA0DD','#87CEEB','#FFA07A','#98D8C8'];
const BG = 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)';

// ─── دوال مساعدة ──────────────────────────────────────────────────────
function stripHarakat(t) { return (t ?? '').replace(/[ؐ-ًؚ-ٰٟ]/g, ''); }

function pickMissing(word) {
  const stripped = stripHarakat(word);
  const avoid = new Set(['ا','و','ي','ى']);
  // أولاً: حاول بدون حروف المد
  let candidates = [];
  for (let i = 0; i < stripped.length; i++) {
    if (!avoid.has(stripped[i]) && PICKABLE.includes(stripped[i])) candidates.push(i);
  }
  // احتياطي: إذا كانت كل الحروف ممنوعة → اختر من أي حرف في الكلمة
  if (!candidates.length) {
    for (let i = 0; i < stripped.length; i++) {
      if (PICKABLE.includes(stripped[i])) candidates.push(i);
    }
  }
  if (!candidates.length) return null;
  const idx = candidates[Math.floor(Math.random() * candidates.length)];
  const letter = stripped[idx];
  // إذا الحرف المختار ليس في فقاعات الاختيار → أضفه مؤقتاً للعرض
  return { letter, missingIdx: idx, stripped };
}

function makeDistractors(correct, count) {
  // استخدم PICKABLE إذا الحرف الصحيح منها، وإلا ARABIC_LETTERS
  const base = PICKABLE.includes(correct) ? PICKABLE : ARABIC_LETTERS;
  const pool = base.split('').filter(l => l !== correct);
  const out = []; const seen = new Set();
  while (out.length < count && pool.length > out.length) {
    const l = pool[Math.floor(Math.random() * pool.length)];
    if (!seen.has(l)) { seen.add(l); out.push(l); }
  }
  return out;
}

function shuffle(a) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

function speak(text) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  let fired = false;
  function go() {
    if (fired) return; fired = true;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ar-SA'; u.rate = 0.8;
    window.speechSynthesis.speak(u);
  }
  if (window.speechSynthesis.getVoices().length > 0) go();
  else { window.speechSynthesis.addEventListener('voiceschanged', go, { once: true }); setTimeout(go, 600); }
}

function playB64(b64) {
  try { new Audio(`data:audio/mp3;base64,${b64}`).play(); } catch {}
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── مكوّن عرض الكلمة حرفاً بحرف ─────────────────────────────────────
function WordDisplay({ stripped, missingIdx }) {
  const chars = stripped.split('');
  const sz = Math.max(42, Math.min(60, Math.floor(290 / chars.length)));
  return (
    <div style={{ display:'flex', direction:'rtl', gap:5, justifyContent:'center', alignItems:'center', flexWrap:'nowrap' }}>
      {chars.map((ch, i) =>
        i === missingIdx ? (
          <div key={i} style={{ width:sz, height:sz+8, borderRadius:10, flexShrink:0, border:'3px dashed #667eea', background:'#EEF2FF', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem', color:'#667eea', fontWeight:900 }}>؟</div>
        ) : (
          <div key={i} style={{ width:sz, height:sz+8, borderRadius:10, flexShrink:0, border:'2px solid #e2e8f0', background:'#f7fafc', display:'flex', alignItems:'center', justifyContent:'center', fontSize: sz > 50 ? '2rem' : '1.65rem', fontWeight:900, color:'#2d3748' }}>{ch}</div>
        )
      )}
    </div>
  );
}

// ─── Chip زر الاختيار ──────────────────────────────────────────────────
const lbStyle   = { display:'block', fontWeight:700, color:'#4a5568', fontSize:'.88rem', marginBottom:8 };
const rowStyle  = { display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 };
const chipStyle = (active) => ({
  background: active ? BG : '#f7fafc',
  color: active ? '#fff' : '#4a5568',
  border: active ? 'none' : '1px solid #e2e8f0',
  borderRadius:50, padding:'6px 16px', fontSize:'.85rem', fontWeight:700,
  cursor:'pointer', transition:'all .15s',
  boxShadow: active ? '0 2px 8px rgba(102,126,234,.4)' : 'none',
  whiteSpace:'nowrap',
});

// ─── تبويب الكلمات ─────────────────────────────────────────────────────
function WordsTab({ allWords, onRefresh, isAdmin }) {
  const [word,      setWord]      = useState('');
  const [topic,     setTopic]     = useState('');
  const [gradeFrom, setGradeFrom] = useState(1);
  const [gradeTo,   setGradeTo]   = useState(7);
  const [imgFile,   setImgFile]   = useState(null);
  const [imgPrev,   setImgPrev]   = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [msg,       setMsg]       = useState(null);
  const [deleting,  setDeleting]  = useState(null);
  const [search,    setSearch]    = useState('');
  const fileRef = useRef();

  const TOPICS = ['الحيوانات','النباتات','الروتين اليومي','الأدوات','الأسرة','الطعام','المدرسة','المواصلات','الملابس','الطبيعة','أخرى'];

  const handleImg = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImgFile(f);
    setImgPrev(URL.createObjectURL(f));
  };

  const addWord = async () => {
    if (!word.trim()) { setMsg({ ok:false, text:'اكتب الكلمة أولاً' }); return; }
    setSaving(true); setMsg(null);
    try {
      const body = {
        word: word.trim(),
        word_type: 'اسم',
        topic: topic || null,
        grade_from: gradeFrom,
        grade_to:   gradeTo,
        sentence: '',
      };
      if (imgFile) {
        body.image_base64 = await fileToBase64(imgFile);
        body.has_image = true;
      }
      const res = await fetch('/api/bogga/lexicon', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'فشل الحفظ');
      }
      setMsg({ ok:true, text:`✅ أُضيفت كلمة "${word.trim()}" بنجاح` });
      setWord(''); setTopic(''); setImgFile(null); setImgPrev(null);
      if (fileRef.current) fileRef.current.value = '';
      onRefresh();
    } catch(e) {
      setMsg({ ok:false, text:`❌ ${e.message}` });
    }
    setSaving(false);
  };

  const deleteWord = async (id, w) => {
    if (!confirm(`هل تريد حذف كلمة "${w}"؟`)) return;
    setDeleting(id);
    await fetch(`/api/bogga/lexicon/${id}`, { method:'DELETE' }).catch(() => {});
    setDeleting(null);
    onRefresh();
  };

  const filtered = allWords.filter(w =>
    !search || w.word?.includes(search) || w.topic?.includes(search)
  );

  // غير مشرف — عرض رسالة مع رابط تسجيل الدخول
  if (!isAdmin) return (
    <div>
      <div style={{ background:'#FFF8E7', border:'1px solid #F6E05E', borderRadius:14, padding:16, marginBottom:16, textAlign:'center' }}>
        <div style={{ fontSize:'2rem', marginBottom:6 }}>🔐</div>
        <div style={{ fontWeight:800, color:'#744210', marginBottom:4 }}>هذه الميزة للمشرفين فقط</div>
        <div style={{ color:'#975A16', fontSize:'.88rem', marginBottom:12 }}>
          سجّل دخولك كمشرف لإضافة أو حذف الكلمات
        </div>
        <Link href="/auth/login"
          style={{ display:'inline-block', background:'linear-gradient(135deg,#667eea,#764ba2)', color:'#fff', borderRadius:50, padding:'9px 24px', textDecoration:'none', fontWeight:700, fontSize:'.9rem' }}>
          تسجيل الدخول
        </Link>
      </div>

      {/* قائمة الكلمات للقراءة فقط */}
      <div style={{ fontWeight:700, color:'#4a5568', marginBottom:8, fontSize:'.88rem' }}>📚 الكلمات المتاحة ({allWords.length})</div>
      <div style={{ display:'flex', flexDirection:'column', gap:5, maxHeight:220, overflowY:'auto' }}>
        {allWords.map(w => (
          <div key={w.id} style={{ display:'flex', alignItems:'center', gap:8, background:'#f7fafc', borderRadius:10, padding:'7px 12px', border:'1px solid #e2e8f0' }}>
            {w.has_image && <span style={{ fontSize:'1rem' }}>🖼️</span>}
            <span style={{ flex:1, fontWeight:700, color:'#2d3748', fontSize:'.9rem' }}>{w.word}</span>
            {w.topic && <span style={{ background:'#EEF2FF', color:'#667eea', borderRadius:20, padding:'2px 8px', fontSize:'.72rem', fontWeight:700 }}>{w.topic}</span>}
          </div>
        ))}
        {allWords.length === 0 && <div style={{ textAlign:'center', color:'#a0aec0', padding:16, fontSize:'.88rem' }}>لا توجد كلمات بعد</div>}
      </div>
    </div>
  );

  return (
    <div>
      {/* ── نموذج إضافة كلمة ─────────────────────────────── */}
      <div style={{ background:'#F7F9FF', border:'1.5px dashed #667eea', borderRadius:16, padding:16, marginBottom:18 }}>
        <div style={{ fontWeight:800, color:'#667eea', marginBottom:12, fontSize:'.95rem' }}>➕ إضافة كلمة جديدة</div>

        {/* الكلمة */}
        <label style={lbStyle}>الكلمة *</label>
        <input value={word} onChange={e => setWord(e.target.value)}
          placeholder="اكتب الكلمة بالعربية..."
          style={{ width:'100%', border:'1.5px solid #e2e8f0', borderRadius:10, padding:'9px 12px', fontSize:'1rem', fontFamily:'Cairo,Tajawal,sans-serif', direction:'rtl', marginBottom:12, boxSizing:'border-box' }}
        />

        {/* الموضوع */}
        <label style={lbStyle}>الموضوع (اختياري)</label>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
          {TOPICS.map(t => (
            <button key={t} onClick={() => setTopic(topic === t ? '' : t)}
              style={{ ...chipStyle(topic === t), padding:'4px 12px', fontSize:'.78rem' }}>
              {TOPIC_EMOJI[t] ?? '📌'} {t}
            </button>
          ))}
        </div>

        {/* المستوى الدراسي */}
        <div style={{ display:'flex', gap:16, marginBottom:12 }}>
          <div style={{ flex:1 }}>
            <label style={lbStyle}>من الصف</label>
            <select value={gradeFrom} onChange={e => setGradeFrom(+e.target.value)}
              style={{ width:'100%', border:'1.5px solid #e2e8f0', borderRadius:10, padding:'8px 10px', fontFamily:'Cairo,Tajawal,sans-serif', fontSize:'.9rem' }}>
              {[1,2,3,4,5,6,7].map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div style={{ flex:1 }}>
            <label style={lbStyle}>حتى الصف</label>
            <select value={gradeTo} onChange={e => setGradeTo(+e.target.value)}
              style={{ width:'100%', border:'1.5px solid #e2e8f0', borderRadius:10, padding:'8px 10px', fontFamily:'Cairo,Tajawal,sans-serif', fontSize:'.9rem' }}>
              {[1,2,3,4,5,6,7].map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
        </div>

        {/* صورة */}
        <label style={lbStyle}>صورة للكلمة (اختياري)</label>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
          {imgPrev && (
            <img src={imgPrev} alt="preview"
              style={{ width:60, height:60, objectFit:'cover', borderRadius:10, border:'2px solid #e2e8f0' }} />
          )}
          <button onClick={() => fileRef.current?.click()}
            style={{ background:'#EEF2FF', border:'1.5px dashed #667eea', borderRadius:10, padding:'8px 16px', cursor:'pointer', color:'#667eea', fontWeight:700, fontSize:'.85rem', fontFamily:'Cairo,Tajawal,sans-serif' }}>
            {imgPrev ? '🔄 تغيير الصورة' : '🖼️ رفع صورة'}
          </button>
          {imgPrev && (
            <button onClick={() => { setImgFile(null); setImgPrev(null); if(fileRef.current) fileRef.current.value=''; }}
              style={{ background:'#FFF5F5', border:'none', borderRadius:10, padding:'8px 12px', cursor:'pointer', color:'#C53030', fontWeight:700 }}>
              ✕
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImg} style={{ display:'none' }} />
        </div>

        {/* رسالة النتيجة */}
        {msg && (
          <div style={{ borderRadius:10, padding:'8px 12px', marginBottom:10, fontSize:'.85rem', fontWeight:700,
            background: msg.ok ? '#F0FFF4' : '#FFF5F5',
            color: msg.ok ? '#276749' : '#C53030',
            border: `1px solid ${msg.ok ? '#C6F6D5' : '#FED7D7'}` }}>
            {msg.text}
          </div>
        )}

        <button onClick={addWord} disabled={saving || !word.trim()}
          style={{ width:'100%', background: (saving || !word.trim()) ? '#e2e8f0' : BG, color:'#fff', border:'none', borderRadius:50, padding:'12px', fontSize:'.95rem', fontWeight:800, cursor: (saving || !word.trim()) ? 'not-allowed' : 'pointer', fontFamily:'Cairo,Tajawal,sans-serif' }}>
          {saving ? 'جاري الحفظ…' : '✅ إضافة الكلمة'}
        </button>
      </div>

      {/* ── قائمة الكلمات ────────────────────────────────── */}
      <div style={{ fontWeight:800, color:'#4a5568', marginBottom:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span>📚 الكلمات ({allWords.length})</span>
      </div>

      {allWords.length > 5 && (
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="ابحث في الكلمات..."
          style={{ width:'100%', border:'1.5px solid #e2e8f0', borderRadius:10, padding:'8px 12px', fontSize:'.88rem', fontFamily:'Cairo,Tajawal,sans-serif', direction:'rtl', marginBottom:10, boxSizing:'border-box' }}
        />
      )}

      {allWords.length === 0 ? (
        <div style={{ textAlign:'center', color:'#a0aec0', padding:'20px 0', fontSize:'.9rem' }}>
          لا توجد كلمات بعد — أضف أولى كلماتك أعلاه!
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:260, overflowY:'auto' }}>
          {filtered.map(w => (
            <div key={w.id} style={{ display:'flex', alignItems:'center', gap:8, background:'#f7fafc', borderRadius:10, padding:'8px 12px', border:'1px solid #e2e8f0' }}>
              {w.has_image && <span title="لها صورة" style={{ fontSize:'1.1rem' }}>🖼️</span>}
              <span style={{ flex:1, fontWeight:700, color:'#2d3748', fontSize:'.92rem' }}>{w.word}</span>
              {w.topic && (
                <span style={{ background:'#EEF2FF', color:'#667eea', borderRadius:20, padding:'2px 8px', fontSize:'.75rem', fontWeight:700 }}>
                  {w.topic}
                </span>
              )}
              <span style={{ color:'#a0aec0', fontSize:'.75rem' }}>ص{w.grade_from}-{w.grade_to}</span>
              <button onClick={() => deleteWord(w.id, w.word)} disabled={deleting === w.id}
                style={{ background:'none', border:'none', cursor:'pointer', color:'#FC8181', fontSize:'1.1rem', padding:'2px 4px', lineHeight:1 }}
                title="حذف">
                {deleting === w.id ? '…' : '🗑️'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── لوحة الإعدادات (تبويبين) ──────────────────────────────────────────
function SettingsPanel({ config, onSave, onClose, allWords, onRefresh, isAdmin }) {
  const [tab,   setTab]   = useState('settings');
  const [local, setLocal] = useState({ ...config });

  const topics = [...new Set((allWords ?? []).map(w => w.topic).filter(Boolean))].sort();
  const set = (key, val) => setLocal(prev => ({ ...prev, [key]: val }));

  const countAfterFilter = (allWords ?? []).filter(w => {
    const s = stripHarakat(w.word ?? '');
    if (s.length < local.MIN_WORD_LEN) return false;
    if (s.length > local.MAX_WORD_LEN)  return false;
    if (local.TOPIC_FILTER && w.topic !== local.TOPIC_FILTER) return false;
    if (local.GRADE_FILTER) {
      const g = Number(local.GRADE_FILTER);
      if (g < (w.grade_from ?? 1) || g > (w.grade_to ?? 7)) return false;
    }
    return true;
  }).length;

  const tabBtn = (id, label) => (
    <button key={id} onClick={() => setTab(id)} style={{
      flex:1, background: tab === id ? BG : '#f7fafc',
      color: tab === id ? '#fff' : '#718096',
      border:'none', borderRadius:12, padding:'10px', fontWeight:700, fontSize:'.9rem',
      cursor:'pointer', fontFamily:'Cairo,Tajawal,sans-serif', transition:'all .15s',
    }}>{label}</button>
  );

  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, direction:'rtl' }}
      onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:24, padding:'24px 20px', maxWidth:500, width:'100%', boxShadow:'0 24px 64px rgba(0,0,0,.35)', maxHeight:'92vh', overflowY:'auto', fontFamily:'Cairo,Tajawal,sans-serif' }}
        onClick={e => e.stopPropagation()}>

        {/* رأس اللوحة */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <h2 style={{ margin:0, fontSize:'1.2rem', fontWeight:800, color:'#2d3748' }}>⚙️ إعدادات اللعبة</h2>
          <button onClick={onClose} style={{ background:'#f7fafc', border:'none', borderRadius:'50%', width:34, height:34, cursor:'pointer', fontSize:'1.1rem', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
        </div>

        {/* التبويبان — تبويب الكلمات للمشرفين فقط */}
        <div style={{ display:'flex', gap:6, marginBottom:20, background:'#f7fafc', borderRadius:14, padding:4 }}>
          {tabBtn('settings', '⚙️ إعدادات اللعبة')}
          {isAdmin && tabBtn('words', `📖 الكلمات (${allWords.length})`)}
        </div>

        {/* ── تبويب الإعدادات ───────────────────────────────── */}
        {tab === 'settings' && (
          <>
            {countAfterFilter > 0 && (
              <div style={{ background:'#F0FFF4', border:'1px solid #C6F6D5', borderRadius:12, padding:'9px 14px', marginBottom:16, fontSize:'.88rem', color:'#276749', fontWeight:700, textAlign:'center' }}>
                ✅ {countAfterFilter} كلمة ستظهر في اللعبة
              </div>
            )}

            <label style={lbStyle}>🎯 عدد الأسئلة في الجولة</label>
            <div style={rowStyle}>
              {[5, 10, 15, 20, 30, 50].map(n => (
                <button key={n} onClick={() => set('ROUND_SIZE', n)} style={chipStyle(local.ROUND_SIZE === n)}>{n}</button>
              ))}
            </div>

            <label style={lbStyle}>🔤 عدد خيارات الحرف</label>
            <div style={rowStyle}>
              {[[3,'سهل'],[4,''],[5,''],[6,'صعب']].map(([n,hint]) => (
                <button key={n} onClick={() => set('CHOICES_COUNT', n)} style={chipStyle(local.CHOICES_COUNT === n)}>
                  {n}{hint ? ` (${hint})` : ''}
                </button>
              ))}
            </div>

            <label style={lbStyle}>📂 الموضوع</label>
            <div style={{ ...rowStyle, flexWrap:'wrap' }}>
              <button onClick={() => set('TOPIC_FILTER', null)} style={chipStyle(local.TOPIC_FILTER === null)}>الكل</button>
              {topics.map(t => (
                <button key={t} onClick={() => set('TOPIC_FILTER', t)} style={chipStyle(local.TOPIC_FILTER === t)}>
                  {TOPIC_EMOJI[t] ?? '📌'} {t}
                </button>
              ))}
              {topics.length === 0 && <span style={{ color:'#a0aec0', fontSize:'.82rem' }}>لا توجد مواضيع بعد — أضف كلمات من تبويب الكلمات</span>}
            </div>

            <label style={lbStyle}>🎓 المستوى الدراسي</label>
            <div style={rowStyle}>
              <button onClick={() => set('GRADE_FILTER', null)} style={chipStyle(local.GRADE_FILTER === null)}>الكل</button>
              {[1,2,3,4,5,6,7].map(g => (
                <button key={g} onClick={() => set('GRADE_FILTER', g)} style={chipStyle(local.GRADE_FILTER === g)}>{g}</button>
              ))}
            </div>

            <label style={lbStyle}>📏 طول الكلمة (عدد الحروف)</label>
            <div style={{ display:'flex', gap:12, alignItems:'flex-start', marginBottom:20 }}>
              <div style={{ flex:1 }}>
                <div style={{ color:'#718096', fontSize:'.75rem', marginBottom:4, textAlign:'center' }}>الحد الأدنى</div>
                <div style={rowStyle}>{[2,3,4,5].map(n => <button key={n} onClick={() => set('MIN_WORD_LEN', n)} style={chipStyle(local.MIN_WORD_LEN === n)}>{n}</button>)}</div>
              </div>
              <div style={{ color:'#cbd5e0', fontWeight:700, paddingTop:28 }}>—</div>
              <div style={{ flex:1 }}>
                <div style={{ color:'#718096', fontSize:'.75rem', marginBottom:4, textAlign:'center' }}>الحد الأقصى</div>
                <div style={rowStyle}>{[5,6,7,8,10,12].map(n => <button key={n} onClick={() => set('MAX_WORD_LEN', n)} style={chipStyle(local.MAX_WORD_LEN === n)}>{n}</button>)}</div>
              </div>
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => { onSave(local); onClose(); }}
                style={{ flex:1, background:BG, color:'#fff', border:'none', borderRadius:50, padding:'13px', fontSize:'1rem', fontWeight:800, cursor:'pointer', fontFamily:'Cairo,Tajawal,sans-serif' }}>
                ✅ حفظ الإعدادات
              </button>
              <button onClick={() => { onSave(DEFAULT_CONFIG); setLocal({ ...DEFAULT_CONFIG }); }}
                style={{ background:'#f7fafc', color:'#718096', border:'1px solid #e2e8f0', borderRadius:50, padding:'13px 18px', fontSize:'.88rem', fontWeight:700, cursor:'pointer', fontFamily:'Cairo,Tajawal,sans-serif' }}>
                إعادة ضبط
              </button>
            </div>
          </>
        )}

        {/* ── تبويب الكلمات ─────────────────────────────────── */}
        {tab === 'words' && (
          <WordsTab allWords={allWords} onRefresh={onRefresh} isAdmin={isAdmin} />
        )}
      </div>
    </div>
  );
}

// ─── المكوّن الرئيسي ───────────────────────────────────────────────────
export default function LetterCatcherPage() {
  const [config, setConfig] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_CONFIG;
    try {
      const saved = localStorage.getItem('letterCatcherConfig');
      return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
    } catch { return DEFAULT_CONFIG; }
  });

  const [phase,         setPhase]         = useState('loading');
  const [allWords,      setAllWords]      = useState([]);
  const [filteredWords, setFilteredWords] = useState([]);
  const [queue,         setQueue]         = useState([]);
  const [qIdx,          setQIdx]          = useState(0);
  const [current,       setCurrent]       = useState(null);
  const [choices,       setChoices]       = useState([]);
  const [answered,      setAnswered]      = useState(null);
  const [wrongIdx,      setWrongIdx]      = useState(null);
  const [score,         setScore]         = useState(0);
  const [confetti,      setConfetti]      = useState([]);
  const [shaking,       setShaking]       = useState(false);
  const [building,      setBuilding]      = useState(false);
  const [showSettings,  setShowSettings]  = useState(false);
  const [isAdmin,       setIsAdmin]       = useState(false);
  const [canSettings,   setCanSettings]   = useState(false);
  const timer = useRef(null);

  // فحص دور المستخدم الحالي
  useEffect(() => {
    const supabase = createBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      const role = user?.user_metadata?.role ?? '';
      setIsAdmin(role === 'super_admin' || role === 'admin');
      setCanSettings(role === 'super_admin' || role === 'admin' || role === 'teacher');
    });
  }, []);

  useEffect(() => {
    try { localStorage.setItem('letterCatcherConfig', JSON.stringify(config)); } catch {}
  }, [config]);

  // ── جلب الكلمات (قابل للاستدعاء من الإعدادات) ────────────────────────
  const fetchWords = useCallback(() => {
    fetch('/api/student/lexicon')
      .then(r => r.json())
      .then(({ words }) => { setAllWords(words ?? []); setPhase(p => p === 'loading' ? 'intro' : p); })
      .catch(() => { setAllWords([]); setPhase(p => p === 'loading' ? 'intro' : p); });
  }, []);

  useEffect(() => { fetchWords(); }, [fetchWords]);

  // ── تحديث قائمة الكلمات المفلترة (fallback تلقائي لكل الكلمات إذا حجب الفلتر الكل) ──
  useEffect(() => {
    const pool = allWords.filter(w => {
      const s = stripHarakat(w.word ?? '');
      if (s.length < config.MIN_WORD_LEN) return false;
      if (s.length > config.MAX_WORD_LEN)  return false;
      if (config.TOPIC_FILTER && w.topic !== config.TOPIC_FILTER) return false;
      if (config.GRADE_FILTER) {
        const grade = Number(config.GRADE_FILTER);
        if (grade < (w.grade_from ?? 1) || grade > (w.grade_to ?? 7)) return false;
      }
      return true;
    });
    // إذا حجب الفلتر كل الكلمات → استخدم كل البنك تلقائياً
    setFilteredWords(pool.length > 0 ? pool : allWords);
  }, [allWords, config]);

  const buildRound = useCallback(async (words) => {
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    const base = [];
    for (const w of shuffled) {
      if (base.length >= config.ROUND_SIZE) break;
      const miss = pickMissing(w.word);
      if (!miss) continue;
      base.push({ id:w.id, word:w.word, topic:w.topic, has_image:w.has_image, has_audio:w.has_audio, ...miss });
    }
    const rich = await Promise.all(base.map(async item => {
      // جلب الصورة/الصوت لكل كلمة — has_image/has_audio قد تكون undefined فنجلب دائماً
      try {
        const res = await fetch(`/api/student/lexicon/${item.id}`);
        if (!res.ok) return { ...item, image:null, audio:null };
        const { image, audio } = await res.json();
        return { ...item, image:image ?? null, audio:audio ?? null };
      } catch { return { ...item, image:null, audio:null }; }
    }));
    return rich;
  }, [config.ROUND_SIZE]);

  const playItem = useCallback((item) => {
    if (item?.audio) playB64(item.audio);
    else speak(item?.word ?? '');
  }, []);

  const loadQ = useCallback((q, idx) => {
    if (idx >= q.length) { setPhase('victory'); return; }
    const item = q[idx];
    setQueue(q); setQIdx(idx); setCurrent(item);
    setChoices(shuffle([item.letter, ...makeDistractors(item.letter, config.CHOICES_COUNT - 1)]));
    setAnswered(null); setWrongIdx(null);
    setTimeout(() => playItem(item), 350);
  }, [playItem, config.CHOICES_COUNT]);

  const startGame = useCallback(async () => {
    clearTimeout(timer.current);
    setBuilding(true); setScore(0); setPhase('playing');
    try {
      const pool = filteredWords.length > 0
        ? (filteredWords.length >= config.ROUND_SIZE ? filteredWords : [...filteredWords,...filteredWords,...filteredWords])
        : [];
      const q = await buildRound(pool);
      setBuilding(false);
      if (!q.length) { setPhase('intro'); return; }
      loadQ(q, 0);
    } catch (err) {
      console.error('startGame error:', err);
      setBuilding(false);
      setPhase('intro');
    }
  }, [filteredWords, config.ROUND_SIZE, buildRound, loadQ]);

  const handleChoice = (letter, ci) => {
    if (answered || !current) return;
    clearTimeout(timer.current);
    if (letter === current.letter) {
      setAnswered('correct'); setScore(s => s + 1); boom(); playItem(current);
      const nextIdx = qIdx + 1, q = queue;
      timer.current = setTimeout(() => loadQ(q, nextIdx), 1900);
    } else {
      setAnswered('wrong'); setWrongIdx(ci); setShaking(true);
      setTimeout(() => setShaking(false), 500);
      timer.current = setTimeout(() => { setAnswered(null); setWrongIdx(null); }, 950);
    }
  };

  const boom = () => {
    const p = Array.from({ length:24 }, (_,i) => ({ id:Date.now()+i, x:Math.random()*100, color:BUBBLE_COLORS[i%BUBBLE_COLORS.length], delay:Math.random()*0.4, size:8+Math.random()*10 }));
    setConfetti(p); setTimeout(() => setConfetti([]), 2000);
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  const css = `
    @keyframes floatB { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-9px)} }
    @keyframes cfall  { 0%{transform:translateY(-20px) rotate(0);opacity:1} 100%{transform:translateY(100vh) rotate(720deg);opacity:0} }
    @keyframes cpop   { 0%{transform:scale(1)} 40%{transform:scale(1.28)} 100%{transform:scale(1)} }
    @keyframes shake  { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-8px)} 75%{transform:translateX(8px)} }
    @keyframes popIn  { 0%{transform:scale(0);opacity:0} 80%{transform:scale(1.06)} 100%{transform:scale(1);opacity:1} }
    @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
    .bb { border:none; border-radius:50%; cursor:pointer; font-size:1.85rem; font-weight:900; width:80px; height:80px; display:flex; align-items:center; justify-content:center; box-shadow:0 6px 22px rgba(0,0,0,.28); font-family:Cairo,Tajawal,sans-serif; color:#fff; transition:transform .15s; }
    .bb:hover:not(:disabled) { transform:scale(1.13) !important; }
    .stg-btn:hover { background:rgba(255,255,255,.35) !important; }
  `;

  const base = { minHeight:'100vh', fontFamily:'Cairo,Tajawal,sans-serif' };

  const SettingsModal = showSettings && canSettings && (
    <SettingsPanel
      config={config}
      allWords={allWords}
      onSave={setConfig}
      onClose={() => setShowSettings(false)}
      onRefresh={fetchWords}
      isAdmin={isAdmin}
    />
  );

  // ── شاشة التحميل ──────────────────────────────────────────────────────
  if (phase === 'loading') return (
    <div style={{ ...base, background:BG, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <style>{css}</style>
      <div style={{ color:'#fff', fontSize:'1.4rem', fontWeight:700 }}>جاري التحميل… ⏳</div>
    </div>
  );

  // ── شاشة المقدمة ──────────────────────────────────────────────────────
  if (phase === 'intro') {
    const topicLabel = config.TOPIC_FILTER ? ` (${config.TOPIC_FILTER})` : '';
    return (
      <div style={{ ...base, background:BG, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
        <style>{css}</style>
        {SettingsModal}
        <div style={{ background:'#fff', borderRadius:24, padding:'40px 32px', maxWidth:460, width:'100%', textAlign:'center', boxShadow:'0 20px 60px rgba(0,0,0,.25)' }}>
          {canSettings && (
            <div style={{ display:'flex', justifyContent:'flex-start', marginBottom:8 }}>
              <button onClick={() => setShowSettings(true)}
                style={{ background:'#F0F4FF', border:'none', borderRadius:12, padding:'7px 14px', cursor:'pointer', fontSize:'.85rem', fontWeight:700, color:'#667eea', display:'flex', alignItems:'center', gap:6, fontFamily:'Cairo,Tajawal,sans-serif' }}>
                ⚙️ الإعدادات
              </button>
            </div>
          )}

          <div style={{ fontSize:'4rem', marginBottom:8 }}>🦉</div>
          <h1 style={{ fontSize:'1.7rem', fontWeight:800, color:'#2d3748', marginBottom:4 }}>صيّاد الحروف{topicLabel}!</h1>
          <p style={{ color:'#718096', lineHeight:1.9, marginBottom:20 }}>
            سأريك صورة وكلمة فيها حرف ناقص.<br />
            استمع للكلمة، انظر للصورة، ثم اختر الحرف الصحيح!
          </p>

          {canSettings && (
            <div style={{ background:'#F0F4FF', borderRadius:16, padding:'12px 20px', marginBottom:20, fontSize:'.9rem', color:'#4a5568', textAlign:'right' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ color: allWords.length === 0 ? '#E53E3E' : '#667eea', fontWeight:700 }}>
                  {allWords.length === 0 ? 'لا توجد كلمات في البنك بعد' : `${filteredWords.length} كلمة متاحة`}
                </span>
                <span>📚 بنك الكلمات</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ color:'#667eea', fontWeight:700 }}>{config.ROUND_SIZE} سؤال</span>
                <span>🎯 كل جولة</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ color:'#667eea', fontWeight:700 }}>{config.CHOICES_COUNT} خيارات</span>
                <span>🔤 لكل سؤال</span>
              </div>
            </div>
          )}

          {canSettings && allWords.length === 0 ? (
            <button onClick={() => setShowSettings(true)}
              style={{ background:BG, color:'#fff', border:'none', borderRadius:50, padding:'14px 48px', fontSize:'1.1rem', fontWeight:800, cursor:'pointer', boxShadow:'0 6px 20px rgba(102,126,234,.5)', fontFamily:'Cairo,Tajawal,sans-serif' }}>
              ➕ أضف كلمات الآن
            </button>
          ) : (
            <button onClick={startGame}
              style={{ background:BG, color:'#fff', border:'none', borderRadius:50, padding:'14px 48px', fontSize:'1.15rem', fontWeight:800, cursor:'pointer', boxShadow:'0 6px 20px rgba(102,126,234,.5)', fontFamily:'Cairo,Tajawal,sans-serif' }}>
              ابدأ اللعبة 🚀
            </button>
          )}

          <div style={{ marginTop:20 }}>
            <Link href="/library" style={{ color:'#718096', fontSize:'.9rem', textDecoration:'none' }}>← العودة للمكتبة</Link>
          </div>
        </div>
      </div>
    );
  }

  // ── شاشة النجاح ───────────────────────────────────────────────────────
  if (phase === 'victory') {
    const total = queue.length;
    const pct   = total > 0 ? Math.round((score / total) * 100) : 0;
    const stars = pct >= 90 ? 3 : pct >= 60 ? 2 : 1;
    return (
      <div style={{ ...base, background:'linear-gradient(135deg,#f093fb,#f5576c)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
        <style>{css}</style>
        <div style={{ background:'#fff', borderRadius:24, padding:'40px 32px', maxWidth:460, width:'100%', textAlign:'center', boxShadow:'0 20px 60px rgba(0,0,0,.25)', animation:'popIn .5s ease' }}>
          <div style={{ fontSize:'3.5rem' }}>🏆</div>
          <h1 style={{ fontSize:'1.8rem', fontWeight:800, color:'#2d3748', margin:'8px 0 4px' }}>أحسنت!</h1>
          <p style={{ color:'#718096', marginBottom:8 }}>{total} سؤال من بنك يضم {filteredWords.length} كلمة</p>
          <div style={{ fontSize:'2.2rem', margin:'10px 0' }}>{'⭐'.repeat(stars)}{'☆'.repeat(3-stars)}</div>
          <div style={{ fontSize:'3rem', fontWeight:900, color:'#667eea' }}>{score}<span style={{ fontSize:'1.2rem', color:'#718096' }}>/{total}</span></div>
          <div style={{ background:'#F0F4FF', borderRadius:12, padding:'10px 16px', margin:'16px 0', fontSize:'.9rem', color:'#4a5568' }}>
            {pct>=90?'ممتاز! أنت بطل الحروف 🥇':pct>=60?'جيد جداً! استمر في التدريب 💪':'لا تيأس، حاول مرة أخرى! 🎯'}
          </div>
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <button onClick={startGame} style={{ background:BG, color:'#fff', border:'none', borderRadius:50, padding:'12px 32px', fontSize:'1rem', fontWeight:700, cursor:'pointer', fontFamily:'Cairo,Tajawal,sans-serif' }}>جولة جديدة 🔄</button>
            <Link href="/library" style={{ background:'#f7fafc', color:'#4a5568', border:'2px solid #e2e8f0', borderRadius:50, padding:'12px 32px', fontSize:'1rem', fontWeight:700, textDecoration:'none', display:'inline-flex', alignItems:'center' }}>المكتبة 📚</Link>
          </div>
        </div>
      </div>
    );
  }

  // ── شاشة اللعب ────────────────────────────────────────────────────────
  const total    = queue.length;
  const progress = total > 0 ? (qIdx / total) * 100 : 0;

  return (
    <div style={{ ...base, background:BG, padding:'16px 16px 90px', direction:'rtl', position:'relative', overflow:'hidden' }}>
      <style>{css}</style>
      {SettingsModal}

      {confetti.map(p => (
        <div key={p.id} style={{ position:'fixed', top:0, left:`${p.x}%`, zIndex:999, pointerEvents:'none', width:p.size, height:p.size, borderRadius:'50%', background:p.color, animation:`cfall 1.7s ${p.delay}s ease-in forwards` }} />
      ))}

      {building && (
        <div style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(102,126,234,.8)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'#fff', gap:12 }}>
          <div style={{ fontSize:'2rem' }}>⏳</div>
          <div style={{ fontSize:'1.2rem', fontWeight:700 }}>جاري تحضير الأسئلة…</div>
        </div>
      )}

      {/* شريط علوي */}
      <div style={{ maxWidth:560, margin:'0 auto 14px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <Link href="/library" style={{ color:'rgba(255,255,255,.8)', textDecoration:'none', fontSize:'.9rem', fontWeight:600 }}>← مكتبة</Link>
        <span style={{ color:'#fff', fontWeight:800 }}>صيّاد الحروف 🎯</span>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {canSettings && (
            <button className="stg-btn" onClick={() => setShowSettings(true)} title="الإعدادات"
              style={{ background:'rgba(255,255,255,.2)', border:'none', borderRadius:'50%', width:34, height:34, cursor:'pointer', fontSize:'1.1rem', display:'flex', alignItems:'center', justifyContent:'center', transition:'background .15s' }}>
              ⚙️
            </button>
          )}
          <span style={{ background:'rgba(255,255,255,.2)', color:'#fff', borderRadius:50, padding:'4px 14px', fontWeight:700, fontSize:'.9rem' }}>{score} ⭐</span>
        </div>
      </div>

      <div style={{ maxWidth:560, margin:'0 auto 6px', display:'flex', justifyContent:'space-between', color:'rgba(255,255,255,.7)', fontSize:'.82rem' }}>
        <span>السؤال {qIdx + 1}</span>
        <span>من أصل {total}</span>
      </div>
      <div style={{ maxWidth:560, margin:'0 auto 18px', background:'rgba(255,255,255,.25)', borderRadius:50, height:10, overflow:'hidden' }}>
        <div style={{ width:`${progress}%`, height:'100%', background:'#FFE66D', borderRadius:50, transition:'width .4s' }} />
      </div>

      {current && (
        <div style={{ maxWidth:560, margin:'0 auto 24px', background:'#fff', borderRadius:24, padding:'22px 20px', textAlign:'center', boxShadow:'0 12px 40px rgba(0,0,0,.2)', animation: shaking ? 'shake .5s ease' : 'fadeIn .35s ease' }}>
          <div style={{ marginBottom:16 }}>
            {current.image ? (
              <img src={`data:image/jpeg;base64,${current.image}`} alt={current.word}
                style={{ width:120, height:120, objectFit:'cover', borderRadius:16, boxShadow:'0 4px 16px rgba(0,0,0,.15)' }} />
            ) : (
              <div style={{ width:120, height:120, borderRadius:16, background:'linear-gradient(135deg,#f0f4ff,#e8eeff)', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'3.8rem', boxShadow:'0 4px 12px rgba(0,0,0,.1)' }}>
                {TOPIC_EMOJI[current.topic] ?? '📖'}
              </div>
            )}
          </div>
          <WordDisplay stripped={current.stripped} missingIdx={current.missingIdx} />
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, marginTop:14 }}>
            <button onClick={() => playItem(current)} title="استمع للكلمة"
              style={{ background:'#EBF4FF', border:'none', borderRadius:'50%', width:40, height:40, cursor:'pointer', fontSize:'1.25rem', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 8px rgba(0,0,0,.1)' }}>
              🔊
            </button>
            <span style={{ color:'#a0aec0', fontSize:'.82rem' }}>{qIdx + 1} / {total}</span>
          </div>
          {answered === 'correct' && (
            <div style={{ marginTop:10, color:'#38A169', fontWeight:700, fontSize:'1.1rem', animation:'cpop .4s ease' }}>
              ✅ {current.word}
            </div>
          )}
        </div>
      )}

      {current && (
        <div style={{ maxWidth:560, margin:'0 auto', display:'flex', flexWrap:'wrap', gap:16, justifyContent:'center' }}>
          {choices.map((letter, i) => {
            const isRight = answered === 'correct' && letter === current.letter;
            const isWrong = answered === 'wrong'   && i === wrongIdx;
            return (
              <button key={i} disabled={!!answered} className="bb"
                onClick={() => handleChoice(letter, i)}
                style={{ background: isRight ? '#38A169' : isWrong ? '#E53E3E' : BUBBLE_COLORS[i % BUBBLE_COLORS.length], animation: isRight ? 'cpop .4s ease' : isWrong ? 'shake .5s ease' : `floatB 2.5s ${i*0.18}s ease-in-out infinite`, opacity: answered && !isRight && !isWrong ? 0.5 : 1, cursor: answered ? 'default' : 'pointer' }}>
                {letter}
              </button>
            );
          })}
        </div>
      )}

      <div style={{ position:'fixed', bottom:20, left:20, fontSize:'2.8rem', filter:'drop-shadow(0 4px 8px rgba(0,0,0,.3))', animation:'floatB 3s ease-in-out infinite', zIndex:10, userSelect:'none' }}>
        🦉
      </div>
    </div>
  );
}
