'use client';
import { useState, useMemo } from 'react';

const WORD_TYPES = [
  { value: 'اسم', label: '🏷️ اسم' },
  { value: 'فعل', label: '⚡ فعل' },
  { value: 'صفة', label: '🎨 صفة' },
  { value: 'حرف', label: '🔗 حرف' },
];

const TYPE_COLORS = {
  'اسم':  { bg: '#e8f0fb', text: '#185FA5', border: '#b8d0f5' },
  'فعل':  { bg: '#fef3dc', text: '#b56a00', border: '#f5d9a0' },
  'صفة':  { bg: '#e6f4ec', text: '#1a7c40', border: '#a8ddc0' },
  'حرف':  { bg: '#f3e8fb', text: '#6a1ab5', border: '#d5b8f5' },
};

const SAMPLE_WORDS = [
  { id: 1, word: 'كِتَابٌ',  sentence: 'قَرَأْتُ كِتَاباً مُفِيداً.',       type: 'اسم' },
  { id: 2, word: 'كَتَبَ',   sentence: 'كَتَبَ التِّلْمِيذُ الدَّرْسَ.',    type: 'فعل' },
  { id: 3, word: 'جَمِيلٌ',  sentence: 'الْيَوْمُ جَمِيلٌ وَمُشْرِقٌ.',     type: 'صفة' },
];

let nextId = 4;

export default function DemoPage() {
  const [words, setWords]         = useState(SAMPLE_WORDS);
  const [form, setForm]           = useState({ word: '', sentence: '', type: 'اسم' });
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch]       = useState('');
  const [flash, setFlash]         = useState(null);
  const [activeCard, setActiveCard] = useState(null);

  const filtered = useMemo(
    () => words.filter(w =>
      w.word.includes(search) || w.sentence.includes(search) || w.type.includes(search)
    ),
    [words, search]
  );

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.word.trim()) return;

    if (editingId !== null) {
      setWords(prev => prev.map(w => w.id === editingId ? { ...w, ...form } : w));
      setFlash({ id: editingId, type: 'edit' });
      setEditingId(null);
    } else {
      const newWord = { id: nextId++, ...form };
      setWords(prev => [...prev, newWord]);
      setFlash({ id: newWord.id, type: 'add' });
      setActiveCard(newWord.id);
    }
    setForm({ word: '', sentence: '', type: 'اسم' });
    setTimeout(() => setFlash(null), 1800);
  }

  function startEdit(w) {
    setForm({ word: w.word, sentence: w.sentence, type: w.type });
    setEditingId(w.id);
    setActiveCard(w.id);
  }

  function cancelEdit() {
    setForm({ word: '', sentence: '', type: 'اسم' });
    setEditingId(null);
  }

  function deleteWord(id) {
    setWords(prev => prev.filter(w => w.id !== id));
    if (editingId === id) cancelEdit();
    if (activeCard === id) setActiveCard(null);
  }

  return (
    <div dir="rtl" style={{
      minHeight: '100vh', background: '#f0f4f8',
      fontFamily: "'Tajawal', 'Cairo', sans-serif",
      padding: '0',
    }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #185FA5 0%, #0e3d70 100%)',
        color: '#fff', padding: '14px 28px',
        display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: '0 3px 12px rgba(14,61,112,.3)',
      }}>
        <span style={{ fontSize: '1.4rem' }}>📚</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: .3 }}>
            أكاديمية عارم — بنك الكلمات
          </div>
          <div style={{ fontSize: '.75rem', opacity: .7, marginTop: 2 }}>
            نموذج تجريبي تفاعلي — لوحة المدير / لوحة الطالب
          </div>
        </div>
        <div style={{
          marginRight: 'auto', fontSize: '.7rem', background: 'rgba(255,255,255,.12)',
          padding: '4px 10px', borderRadius: 20, border: '1px solid rgba(255,255,255,.2)',
        }}>
          🔴 تجريبي فقط — البيانات في الذاكرة
        </div>
      </header>

      {/* Split Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 0, minHeight: 'calc(100vh - 62px)',
      }}>

        {/* ── RIGHT: Admin Panel ── */}
        <div style={{
          background: '#fff', borderLeft: '3px solid #e2e8f0',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Panel header */}
          <div style={{
            background: '#185FA5', color: '#fff',
            padding: '12px 20px', fontSize: '.85rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span>🛠️</span> لوحة المدير
            <span style={{
              marginRight: 'auto', fontSize: '.7rem', opacity: .7,
              background: 'rgba(255,255,255,.15)', padding: '2px 8px', borderRadius: 12,
            }}>
              {words.length} كلمة
            </span>
          </div>

          <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{
              background: editingId ? '#fff8ec' : '#f7faff',
              border: `2px solid ${editingId ? '#F5A623' : '#d0e4f7'}`,
              borderRadius: 14, padding: 18, marginBottom: 22,
              transition: 'all .3s',
            }}>
              <div style={{
                fontSize: '.8rem', fontWeight: 800, color: editingId ? '#b56a00' : '#185FA5',
                marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {editingId ? '✏️ تعديل الكلمة' : '➕ إضافة كلمة جديدة'}
              </div>

              {/* Word field */}
              <label style={labelStyle}>الكلمة (مُشَكَّلة)</label>
              <input
                value={form.word}
                onChange={e => setForm(p => ({ ...p, word: e.target.value }))}
                placeholder="مثال: كِتَابٌ"
                required
                style={{ ...inputStyle, fontSize: '1.4rem', fontWeight: 800, textAlign: 'center' }}
              />

              {/* Sentence field */}
              <label style={{ ...labelStyle, marginTop: 10 }}>جملة مثال</label>
              <textarea
                value={form.sentence}
                onChange={e => setForm(p => ({ ...p, sentence: e.target.value }))}
                placeholder="مثال: قَرَأْتُ كِتَاباً مُفِيداً."
                rows={2}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.8 }}
              />

              {/* Type select */}
              <label style={{ ...labelStyle, marginTop: 10 }}>نوع الكلمة</label>
              <select
                value={form.type}
                onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                style={inputStyle}
              >
                {WORD_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button type="submit" style={{
                  flex: 1, padding: '10px', borderRadius: 9, border: 'none',
                  background: editingId ? '#F5A623' : '#185FA5',
                  color: '#fff', fontWeight: 800, fontSize: '.88rem',
                  cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: '0 3px 10px rgba(24,95,165,.2)',
                  transition: 'transform .15s',
                }}>
                  {editingId ? '💾 حفظ التعديل' : '✅ إضافة الكلمة'}
                </button>
                {editingId && (
                  <button type="button" onClick={cancelEdit} style={{
                    padding: '10px 14px', borderRadius: 9,
                    border: '1.5px solid #e2e8f0', background: '#fff',
                    color: '#64748b', cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: '.85rem',
                  }}>
                    إلغاء
                  </button>
                )}
              </div>
            </form>

            {/* Words table */}
            <div style={{ fontSize: '.8rem', fontWeight: 800, color: '#475569', marginBottom: 10 }}>
              📋 الكلمات المضافة
            </div>
            <div style={{
              border: '1.5px solid #e2e8f0', borderRadius: 12, overflow: 'hidden',
            }}>
              {words.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: '.85rem' }}>
                  لا توجد كلمات بعد — أضف كلمة من النموذج أعلاه
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.8rem' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={thStyle}>الكلمة</th>
                      <th style={thStyle}>النوع</th>
                      <th style={thStyle}>الجملة</th>
                      <th style={thStyle}>إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {words.map((w, i) => {
                      const isActive = activeCard === w.id;
                      const isFlash  = flash?.id === w.id;
                      return (
                        <tr key={w.id}
                          onClick={() => setActiveCard(w.id)}
                          style={{
                            background: isFlash
                              ? (flash?.type === 'edit' ? '#fff8ec' : '#f0fff4')
                              : isActive ? '#f0f7ff' : i % 2 === 0 ? '#fff' : '#fafbfc',
                            cursor: 'pointer',
                            transition: 'background .4s',
                            borderTop: '1px solid #f1f5f9',
                          }}>
                          <td style={{ ...tdStyle, fontWeight: 800, fontSize: '1rem', direction: 'rtl' }}>
                            {w.word}
                          </td>
                          <td style={tdStyle}>
                            <span style={{
                              padding: '2px 8px', borderRadius: 20,
                              background: TYPE_COLORS[w.type]?.bg,
                              color: TYPE_COLORS[w.type]?.text,
                              fontSize: '.72rem', fontWeight: 700,
                            }}>
                              {w.type}
                            </span>
                          </td>
                          <td style={{ ...tdStyle, color: '#64748b', maxWidth: 160,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {w.sentence}
                          </td>
                          <td style={tdStyle}>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={e => { e.stopPropagation(); startEdit(w); }}
                                style={actionBtnStyle('#185FA5')}>✏️</button>
                              <button onClick={e => { e.stopPropagation(); deleteWord(w.id); }}
                                style={actionBtnStyle('#e53e3e')}>🗑️</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

          </div>
        </div>

        {/* ── LEFT: Student Panel ── */}
        <div style={{
          background: '#f8faff',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Panel header */}
          <div style={{
            background: '#1a7c40', color: '#fff',
            padding: '12px 20px', fontSize: '.85rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span>🎒</span> لوحة الطالب
            <span style={{
              marginRight: 'auto', fontSize: '.7rem', opacity: .7,
              background: 'rgba(255,255,255,.15)', padding: '2px 8px', borderRadius: 12,
            }}>
              {filtered.length} كلمة
            </span>
          </div>

          <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>

            {/* Search bar */}
            <div style={{ position: 'relative', marginBottom: 18 }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="🔍 ابحث عن كلمة..."
                style={{
                  width: '100%', padding: '10px 16px 10px 40px',
                  borderRadius: 50, border: '2px solid #d0e4f7',
                  fontSize: '.88rem', outline: 'none', fontFamily: 'inherit',
                  background: '#fff', boxSizing: 'border-box',
                  boxShadow: '0 2px 8px rgba(24,95,165,.08)',
                  transition: 'border-color .2s',
                }}
                onFocus={e => e.target.style.borderColor = '#185FA5'}
                onBlur={e => e.target.style.borderColor = '#d0e4f7'}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#94a3b8', fontSize: '1rem', lineHeight: 1,
                }}>✕</button>
              )}
            </div>

            {/* Word cards */}
            {filtered.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '60px 20px',
                color: '#94a3b8', fontSize: '.9rem',
              }}>
                {search ? '🔍 لا توجد نتائج للبحث' : '📭 لا توجد كلمات بعد'}
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: 14,
              }}>
                {filtered.map(w => {
                  const colors = TYPE_COLORS[w.type] || TYPE_COLORS['اسم'];
                  const isHighlighted = activeCard === w.id;
                  const isNew = flash?.id === w.id && flash?.type === 'add';
                  return (
                    <div
                      key={w.id}
                      onClick={() => setActiveCard(isHighlighted ? null : w.id)}
                      style={{
                        background: '#fff',
                        borderRadius: 16,
                        border: `2.5px solid ${isHighlighted ? colors.border : '#e8eef5'}`,
                        padding: '18px 14px 14px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        boxShadow: isHighlighted
                          ? `0 6px 24px rgba(24,95,165,.18)`
                          : '0 2px 8px rgba(0,0,0,.06)',
                        transform: isHighlighted ? 'translateY(-3px) scale(1.02)' : 'none',
                        transition: 'all .25s cubic-bezier(.34,1.56,.64,1)',
                        animation: isNew ? 'popIn .5s cubic-bezier(.34,1.56,.64,1)' : 'none',
                        position: 'relative', overflow: 'hidden',
                      }}
                    >
                      {/* Type badge */}
                      <div style={{
                        position: 'absolute', top: 10, right: 10,
                        background: colors.bg, color: colors.text,
                        borderRadius: 20, padding: '2px 8px',
                        fontSize: '.64rem', fontWeight: 800,
                        border: `1px solid ${colors.border}`,
                      }}>
                        {w.type}
                      </div>

                      {/* The word */}
                      <div style={{
                        fontSize: '2rem', fontWeight: 900,
                        color: '#1a2d4a', lineHeight: 1.3,
                        marginTop: 16, marginBottom: 10,
                        letterSpacing: 1,
                        textShadow: isHighlighted ? '0 2px 8px rgba(24,95,165,.15)' : 'none',
                      }}>
                        {w.word}
                      </div>

                      {/* Divider */}
                      <div style={{
                        width: 40, height: 2.5,
                        background: colors.border,
                        borderRadius: 2, margin: '0 auto 10px',
                      }} />

                      {/* Sentence */}
                      <div style={{
                        fontSize: '.75rem', color: '#64748b',
                        lineHeight: 1.7, direction: 'rtl',
                      }}>
                        {w.sentence}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>

      </div>

      {/* Animated arrow indicator */}
      <div style={{
        position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(14,61,112,.85)', color: '#fff', backdropFilter: 'blur(8px)',
        borderRadius: 30, padding: '8px 20px', fontSize: '.75rem',
        display: 'flex', alignItems: 'center', gap: 10, pointerEvents: 'none',
        boxShadow: '0 4px 20px rgba(0,0,0,.2)',
      }}>
        <span>🛠️ لوحة المدير</span>
        <span style={{ opacity: .5 }}>←→</span>
        <span>🎒 لوحة الطالب</span>
        <span style={{ opacity: .6, fontSize: '.68rem' }}>• التعديل يظهر فوراً</span>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800;900&display=swap');
        @keyframes popIn {
          0%   { transform: scale(.7) translateY(10px); opacity: 0; }
          60%  { transform: scale(1.06) translateY(-3px); opacity: 1; }
          100% { transform: scale(1) translateY(0); }
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
      `}</style>
    </div>
  );
}

/* ── shared micro-styles ── */
const labelStyle = {
  display: 'block', fontSize: '.72rem', fontWeight: 700,
  color: '#475569', marginBottom: 5,
};

const inputStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 9,
  border: '1.5px solid #d0e4f7', fontSize: '.88rem',
  fontFamily: "'Tajawal', 'Cairo', sans-serif",
  outline: 'none', background: '#fff', direction: 'rtl',
  transition: 'border-color .2s',
};

const thStyle = {
  padding: '8px 10px', textAlign: 'right',
  fontWeight: 700, fontSize: '.72rem', color: '#64748b',
  borderBottom: '1.5px solid #e2e8f0',
};

const tdStyle = {
  padding: '9px 10px', textAlign: 'right', verticalAlign: 'middle',
};

const actionBtnStyle = (color) => ({
  background: 'none', border: `1.5px solid ${color}22`,
  borderRadius: 7, cursor: 'pointer', padding: '4px 7px',
  fontSize: '.75rem', color, transition: 'background .15s',
});
