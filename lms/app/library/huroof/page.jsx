'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '../../../components/Navbar';
import { createClient } from '../../../lib/supabase';

const PALETTE = [
  { main: '#185FA5', light: '#dbeafe' },
  { main: '#1a7c40', light: '#dcfce7' },
  { main: '#b45309', light: '#fef3c7' },
  { main: '#7c3aed', light: '#ede9fe' },
  { main: '#be185d', light: '#fce7f3' },
  { main: '#0891b2', light: '#e0f2fe' },
  { main: '#b91c1c', light: '#fee2e2' },
  { main: '#065f46', light: '#d1fae5' },
  { main: '#1e40af', light: '#dbeafe' },
  { main: '#92400e', light: '#fef3c7' },
  { main: '#6b21a8', light: '#f3e8ff' },
  { main: '#166534', light: '#dcfce7' },
];

const LETTERS = [
  { l: 'أ',  name: 'أَلِفْ',  word: 'أَسَدٌ',     emoji: '🦁', sentence: 'الأَسَدُ مَلِكُ الغَابَةْ' },
  { l: 'ب',  name: 'بَاءْ',   word: 'بَيْتٌ',     emoji: '🏠', sentence: 'البَيْتُ دَافِئٌ وَجَمِيلْ' },
  { l: 'ت',  name: 'تَاءْ',   word: 'تُفَّاحَةٌ', emoji: '🍎', sentence: 'التُّفَّاحَةُ حَمْرَاءُ وَحُلْوَةْ' },
  { l: 'ث',  name: 'ثَاءْ',   word: 'ثَعْلَبٌ',   emoji: '🦊', sentence: 'الثَّعْلَبُ حَيَوَانٌ ذَكِيٌّ وَسَرِيعْ' },
  { l: 'ج',  name: 'جِيمْ',   word: 'جَمَلٌ',     emoji: '🐫', sentence: 'الجَمَلُ سَفِينَةُ الصَّحْرَاءْ' },
  { l: 'ح',  name: 'حَاءْ',   word: 'حِصَانٌ',    emoji: '🐴', sentence: 'الحِصَانُ يَرْكُضُ بِسُرْعَةْ' },
  { l: 'خ',  name: 'خَاءْ',   word: 'خُبْزٌ',     emoji: '🍞', sentence: 'الخُبْزُ طَعَامٌ لَذِيذٌ وَمُفِيدْ' },
  { l: 'د',  name: 'دَالْ',   word: 'دَجَاجَةٌ',  emoji: '🐔', sentence: 'الدَّجَاجَةُ تَبِيضُ كُلَّ يَوْمْ' },
  { l: 'ذ',  name: 'ذَالْ',   word: 'ذِئْبٌ',     emoji: '🐺', sentence: 'الذِّئْبُ يَعِيشُ فِي الغَابَةِ البَعِيدَةْ' },
  { l: 'ر',  name: 'رَاءْ',   word: 'رُمَّانٌ',   emoji: '🌺', sentence: 'الرُّمَّانُ فَاكِهَةٌ حُلْوَةٌ وَمُفِيدَةْ' },
  { l: 'ز',  name: 'زَايْ',   word: 'زَرَافَةٌ',  emoji: '🦒', sentence: 'الزَّرَافَةُ أَطْوَلُ الحَيَوَانَاتِ عُنُقًاْ' },
  { l: 'س',  name: 'سِينْ',   word: 'سَمَكَةٌ',   emoji: '🐟', sentence: 'السَّمَكَةُ تَسْبَحُ فِي المَاءْ' },
  { l: 'ش',  name: 'شِينْ',   word: 'شَمْسٌ',     emoji: '☀️', sentence: 'الشَّمْسُ تُضِيءُ النَّهَارَ الجَمِيلْ' },
  { l: 'ص',  name: 'صَادْ',   word: 'صَقْرٌ',     emoji: '🦅', sentence: 'الصَّقْرُ يَطِيرُ عَالِيًا فِي السَّمَاءْ' },
  { l: 'ض',  name: 'ضَادْ',   word: 'ضِفْدَعٌ',   emoji: '🐸', sentence: 'الضِّفْدَعُ يَقْفِزُ بَيْنَ الأَشْجَارْ' },
  { l: 'ط',  name: 'طَاءْ',   word: 'طَائِرٌ',    emoji: '🐦', sentence: 'الطَّائِرُ يُغَنِّي فَوْقَ الشَّجَرَةْ' },
  { l: 'ظ',  name: 'ظَاءْ',   word: 'ظَبْيٌ',     emoji: '🦌', sentence: 'الظَّبْيُ يَرْعَى فِي السَّهْلِ الأَخْضَرْ' },
  { l: 'ع',  name: 'عَيْنْ',  word: 'عِنَبٌ',     emoji: '🍇', sentence: 'العِنَبُ فَاكِهَةٌ لَذِيذَةٌ وَغَنِيَّةْ' },
  { l: 'غ',  name: 'غَيْنْ',  word: 'غَزَالٌ',    emoji: '🦌', sentence: 'الغَزَالُ يَرْكُضُ بِخِفَّةٍ وَرَشَاقَةْ' },
  { l: 'ف',  name: 'فَاءْ',   word: 'فَرَسٌ',     emoji: '🐎', sentence: 'الفَرَسُ حَيَوَانٌ أَصِيلٌ وَجَمِيلْ' },
  { l: 'ق',  name: 'قَافْ',   word: 'قِطَّةٌ',    emoji: '🐱', sentence: 'القِطَّةُ تَلْعَبُ وَتَقْفِزُ بِمَرَحْ' },
  { l: 'ك',  name: 'كَافْ',   word: 'كِتَابٌ',    emoji: '📚', sentence: 'الكِتَابُ خَيْرُ صَدِيقٍ وَرَفِيقْ' },
  { l: 'ل',  name: 'لَامْ',   word: 'لَيْمُونٌ',  emoji: '🍋', sentence: 'اللَّيْمُونُ حَامِضٌ وَمُفِيدٌ لِلصِّحَّةْ' },
  { l: 'م',  name: 'مِيمْ',   word: 'مَوْزَةٌ',   emoji: '🍌', sentence: 'المَوْزَةُ صَفْرَاءُ وَطَعْمُهَا حُلْوْ' },
  { l: 'ن',  name: 'نُونْ',   word: 'نَمِرٌ',     emoji: '🐯', sentence: 'النَّمِرُ حَيَوَانٌ سَرِيعٌ وَشَجَاعْ' },
  { l: 'هـ', name: 'هَاءْ',   word: 'هِلَالٌ',    emoji: '🌙', sentence: 'الهِلَالُ يُضِيءُ اللَّيْلَ الهَادِئَ الجَمِيلْ' },
  { l: 'و',  name: 'وَاوْ',   word: 'وَرْدَةٌ',   emoji: '🌹', sentence: 'الوَرْدَةُ جَمِيلَةٌ وَعَطِرَةٌ وَرَقِيقَةْ' },
  { l: 'ي',  name: 'يَاءْ',   word: 'يَمَامَةٌ',  emoji: '🕊️', sentence: 'اليَمَامَةُ تُغَنِّي بِصَوْتٍ عَذْبٍ جَمِيلْ' },
];

function speak(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  let done = false;
  function go() {
    if (done) return;
    done = true;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ar-SA';
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  }
  if (window.speechSynthesis.getVoices().length > 0) go();
  else {
    window.speechSynthesis.addEventListener('voiceschanged', go, { once: true });
    setTimeout(go, 600);
  }
}

function LetterCard({ data, index, active, onToggle }) {
  const pal = PALETTE[index % PALETTE.length];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', fontFamily: 'Cairo, Tajawal, sans-serif' }}>
      {/* ── Letter button ── */}
      <button
        onClick={() => { speak(data.name); onToggle(index); }}
        style={{
          background: active
            ? `linear-gradient(145deg, ${pal.main}, ${pal.main}dd)`
            : pal.light,
          border: `2.5px solid ${pal.main}`,
          borderRadius: active ? '16px 16px 0 0' : 16,
          padding: '22px 8px 14px',
          cursor: 'pointer',
          transition: 'all .22s ease',
          transform: active ? 'scale(1.03)' : 'scale(1)',
          boxShadow: active
            ? `0 8px 24px ${pal.main}45, inset 0 1px 0 rgba(255,255,255,.25)`
            : '0 2px 8px rgba(0,0,0,.07)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {active && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '14px 14px 0 0',
            background: 'radial-gradient(circle at 50% 40%, rgba(255,255,255,.22), transparent 70%)',
            pointerEvents: 'none',
          }} />
        )}
        {/* Letter */}
        <div style={{
          fontSize: '2.7rem',
          fontWeight: 900,
          color: active ? '#fff' : pal.main,
          lineHeight: 1,
          marginBottom: 7,
          textShadow: active ? '0 2px 8px rgba(0,0,0,.2)' : 'none',
          transition: 'color .22s',
        }}>
          {data.l}
        </div>
        {/* Name */}
        <div style={{
          fontSize: '.68rem',
          color: active ? 'rgba(255,255,255,.88)' : '#64748b',
          fontWeight: 700,
          letterSpacing: '.01em',
          transition: 'color .22s',
        }}>
          {data.name}
        </div>
        {/* Seen dot */}
        {!active && (
          <div style={{
            position: 'absolute', top: 7, left: 8,
            width: 7, height: 7, borderRadius: '50%',
            background: pal.main, opacity: .35,
          }} />
        )}
      </button>

      {/* ── Expanded panel ── */}
      {active && (
        <div style={{
          background: '#fff',
          border: `2.5px solid ${pal.main}`,
          borderTop: 'none',
          borderRadius: '0 0 16px 16px',
          padding: '18px 12px 16px',
          textAlign: 'center',
          animation: 'hfDown .22s ease',
        }}>
          {/* Emoji illustration */}
          <div style={{
            fontSize: '3.2rem',
            lineHeight: 1,
            marginBottom: 10,
            filter: 'drop-shadow(0 3px 6px rgba(0,0,0,.12))',
          }}>
            {data.emoji}
          </div>

          {/* Word */}
          <div style={{
            fontSize: '1.3rem',
            fontWeight: 900,
            color: pal.main,
            marginBottom: 6,
            letterSpacing: '.01em',
          }}>
            {data.word}
          </div>

          {/* Sentence */}
          <div style={{
            fontSize: '.77rem',
            color: '#475569',
            lineHeight: 1.9,
            marginBottom: 13,
            padding: '0 4px',
            background: '#f8faff',
            borderRadius: 8,
            padding: '8px 10px',
            border: `1px solid ${pal.main}22`,
          }}>
            {data.sentence}
          </div>

          {/* Listen button */}
          <button
            onClick={e => { e.stopPropagation(); speak(`${data.word}. ${data.sentence}`); }}
            style={{
              background: `linear-gradient(135deg, ${pal.main}, ${pal.main}cc)`,
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '7px 16px',
              fontSize: '.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
              boxShadow: `0 3px 10px ${pal.main}40`,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              transition: 'opacity .15s, transform .15s',
            }}
            onMouseOver={e => { e.currentTarget.style.opacity = '.88'; e.currentTarget.style.transform = 'scale(1.04)'; }}
            onMouseOut={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            🔊 <span>استمع</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function HuroofPage() {
  const [user,   setUser]   = useState(null);
  const [active, setActive] = useState(null);
  const [seen,   setSeen]   = useState(new Set());

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user: u } }) => setUser(u));
  }, []);

  function toggle(i) {
    setActive(p => (p === i ? null : i));
    setSeen(s => new Set([...s, i]));
  }

  const progress = Math.round((seen.size / LETTERS.length) * 100);

  return (
    <>
      <Navbar user={user} />
      <main className="page-wrap">
        <div className="container" dir="rtl">
          <style>{`
            @keyframes hfDown {
              from { opacity:0; transform:translateY(-8px); }
              to   { opacity:1; transform:translateY(0); }
            }
          `}</style>

          {/* Breadcrumb */}
          <div style={{ marginBottom: 18 }}>
            <Link href="/library"
              style={{ color: '#185FA5', fontSize: '.86rem', fontWeight: 700, textDecoration: 'none' }}>
              ← المكتبة
            </Link>
          </div>

          {/* Header */}
          <div style={{ marginBottom: 22 }}>
            <h1 style={{ fontWeight: 900, color: '#1e293b', fontSize: '1.55rem', margin: '0 0 5px' }}>
              🔤 الحروف الهجائية
            </h1>
            <p style={{ color: '#64748b', fontSize: '.88rem', margin: 0 }}>
              اضغط على أي حرف لسماع نطقه واستكشاف كلمة جديدة — {LETTERS.length} حرفاً
            </p>
          </div>

          {/* Progress bar */}
          {seen.size > 0 && (
            <div style={{ marginBottom: 22 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: '.76rem', color: '#64748b', marginBottom: 5,
              }}>
                <span>تقدمك في الرحلة</span>
                <span style={{ fontWeight: 700 }}>
                  {seen.size} / {LETTERS.length} حرف ({progress}%)
                </span>
              </div>
              <div style={{ height: 9, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #185FA5, #1a7c40)',
                  borderRadius: 99,
                  transition: 'width .4s ease',
                  boxShadow: '0 2px 6px rgba(24,95,165,.35)',
                }} />
              </div>
              {progress === 100 && (
                <div style={{
                  marginTop: 10, textAlign: 'center',
                  background: 'linear-gradient(135deg,#1a7c40,#185FA5)',
                  color: '#fff', borderRadius: 12,
                  padding: '10px 16px', fontSize: '.88rem', fontWeight: 800,
                  animation: 'hfDown .3s ease',
                }}>
                  🎉 أحسنت! تعلمت الحروف الهجائية الثمانية والعشرين كاملة!
                </div>
              )}
            </div>
          )}

          {/* Letters grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(115px, 1fr))',
            gap: 12,
            alignItems: 'start',
          }}>
            {LETTERS.map((data, i) => (
              <LetterCard
                key={data.l}
                data={data}
                index={i}
                active={active === i}
                onToggle={toggle}
              />
            ))}
          </div>

          {/* Footer tip */}
          <p style={{
            textAlign: 'center', color: '#94a3b8',
            fontSize: '.76rem', marginTop: 30, lineHeight: 1.8,
          }}>
            💡 اضغط الحرف مرة أخرى لإغلاقه · زر 🔊 يقرأ الكلمة والجملة كاملة
          </p>
        </div>
      </main>
    </>
  );
}
