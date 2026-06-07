'use client';
import { useState, useRef, useEffect } from 'react';

const FAQ_ITEMS = [
  {
    q: 'ما هي أسعار الاشتراك في الأكاديمية؟',
    a: 'نقدّم حصصاً فردية ومجموعات بأسعار تنافسية مناسبة لجميع الأسر. تواصل معنا عبر واتساب للحصول على باقة تناسب طفلك وجدولك.',
  },
  {
    q: 'ما الأعمار المناسبة لبرامج عارم؟',
    a: 'تستقبل أكاديمية عارم الأطفال من سن 5 إلى 14 سنة، سواءً كانوا ناطقين باللغة العربية أو غير ناطقين، مع مناهج مُصمَّمة لكل مرحلة.',
  },
  {
    q: 'كيف يعمل نظام التقييم الذكي؟',
    a: 'نظام التقييم التشخيصي يقيس مستوى طفلك في القراءة والكتابة والاستماع والتحدث عبر 10 تدريبات تفاعلية، ثم يُرسل تقريراً تفصيلياً فورياً لولي الأمر — مجاناً وبدون تسجيل.',
  },
  {
    q: 'هل يوجد نادٍ صيفي أو برامج موسمية؟',
    a: 'نعم! نُنظّم برامج صيفية مكثفة وممتعة تجمع بين تعلم اللغة والأنشطة الإبداعية. تابع صفحاتنا أو تواصل معنا لمعرفة مواعيد البرنامج القادم.',
  },
];

const ASSESSMENT_URL = 'https://arabic-assessment.vercel.app';

export default function SmartFAQ() {
  const [openIdx, setOpenIdx]   = useState(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [displayed, setDisplayed] = useState('');
  const inputRef  = useRef(null);
  const timerRef  = useRef(null);

  // Typing effect
  useEffect(() => {
    clearTimeout(timerRef.current);
    if (!answer) { setDisplayed(''); return; }
    let i = 0;
    setDisplayed('');
    function tick() {
      i++;
      setDisplayed(answer.slice(0, i));
      if (i < answer.length) timerRef.current = setTimeout(tick, 18);
    }
    timerRef.current = setTimeout(tick, 18);
    return () => clearTimeout(timerRef.current);
  }, [answer]);

  async function handleAsk(e) {
    e.preventDefault();
    const q = question.trim();
    if (!q || loading) return;
    setLoading(true);
    setAnswer('');
    setDisplayed('');
    try {
      const res = await fetch('/api/visitor-faq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      setAnswer(data.reply || 'نعتذر، حدث خطأ ما. حاول مرة أخرى.');
    } catch {
      setAnswer('نعتذر، حدث خطأ ما. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={{
      background: 'linear-gradient(160deg, #f0f6ff 0%, #ffffff 100%)',
      padding: '80px 0',
    }}>
      <div className="container">

        {/* Section header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--primary)', marginBottom: 10 }}>
            الأسئلة الشائعة
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '1rem' }}>
            كل ما يحتاج أن يعرفه ولي الأمر قبل الانضمام
          </p>
        </div>

        {/* Two-column layout */}
        <div style={{
          display: 'flex',
          gap: 36,
          alignItems: 'flex-start',
          flexWrap: 'wrap',
        }}>

          {/* ── Right: Classic Accordion ── */}
          <div style={{ flex: '1 1 340px', minWidth: 0 }}>
            {FAQ_ITEMS.map((item, idx) => (
              <div key={idx} style={{
                background: '#fff',
                borderRadius: 14,
                marginBottom: 14,
                boxShadow: openIdx === idx
                  ? '0 4px 20px rgba(24,95,165,0.13)'
                  : '0 2px 8px rgba(24,95,165,0.07)',
                border: openIdx === idx
                  ? '1.5px solid var(--primary)'
                  : '1.5px solid transparent',
                transition: 'box-shadow .25s, border-color .25s',
                overflow: 'hidden',
              }}>
                <button
                  onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '18px 20px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'right',
                    fontFamily: 'inherit',
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: openIdx === idx ? 'var(--primary)' : 'var(--text)',
                    transition: 'color .2s',
                  }}
                >
                  <span>{item.q}</span>
                  <span style={{
                    flexShrink: 0,
                    fontSize: '1.1rem',
                    transform: openIdx === idx ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform .25s',
                    color: 'var(--primary)',
                  }}>▾</span>
                </button>

                <div style={{
                  maxHeight: openIdx === idx ? '200px' : '0',
                  overflow: 'hidden',
                  transition: 'max-height .35s ease',
                }}>
                  <p style={{
                    padding: '0 20px 18px',
                    margin: 0,
                    color: '#444',
                    fontSize: '.95rem',
                    lineHeight: 1.85,
                  }}>
                    {item.a}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Left: AI Chat Box ── */}
          <div style={{ flex: '1 1 340px', minWidth: 0 }}>

            {/* Wrapper for floating avatar */}
            <div style={{ position: 'relative', paddingTop: 56 }}>

              {/* Floating Faheem avatar */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 5,
                animation: 'faheemFloat 3s ease-in-out infinite',
              }}>
                {/* Sparkle decorations */}
                <span style={{ position:'absolute', top:0, right:-24, fontSize:'1.1rem', animation:'sparkle 2.2s ease-in-out infinite' }}>✨</span>
                <span style={{ position:'absolute', top:14, left:-26, fontSize:'.95rem', animation:'sparkle 2.2s ease-in-out .6s infinite' }}>⭐</span>
                <span style={{ position:'absolute', bottom:30, right:-20, fontSize:'.8rem', animation:'sparkle 2.2s ease-in-out 1.1s infinite' }}>✨</span>

                {/* Avatar ring + character */}
                <div style={{
                  width: 114,
                  height: 114,
                  borderRadius: '50%',
                  background: 'linear-gradient(145deg, #fff9e6 0%, #fde68a 60%, #fbbf24 100%)',
                  border: '4px solid #fff',
                  boxShadow: '0 8px 32px rgba(245,166,35,0.45), 0 0 0 6px rgba(245,166,35,0.18)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                }}>
                  {/* Faheem SVG — same character as the widget */}
                  <svg viewBox="0 0 120 158" width="102" height="134" style={{ marginBottom: -10 }}>
                    {/* Body */}
                    <rect x="22" y="118" width="76" height="44" rx="18" fill="#1f2d5a" />
                    {/* Collar accent */}
                    <path d="M40,120 L60,133 L80,120" fill="none" stroke="#d4952a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    {/* Badge */}
                    <circle cx="60" cy="142" r="8" fill="#d4952a" />
                    <text x="60" y="146.5" textAnchor="middle" fontSize="8.5" fill="#1f2d5a" fontFamily="serif" fontWeight="900">&#x639;</text>
                    {/* Skin */}
                    <circle cx="60" cy="64" r="49" fill="#fce8c8" />
                    {/* Hair */}
                    <ellipse cx="60" cy="21" rx="49" ry="28" fill="#3d2510" />
                    <ellipse cx="60" cy="16" rx="44" ry="22" fill="#4a2f15" />
                    <path d="M63,2 Q74,-4 72,14" fill="none" stroke="#3d2510" strokeWidth="5.5" strokeLinecap="round" />
                    {/* Ears */}
                    <ellipse cx="11" cy="66" rx="9" ry="12" fill="#f5c47e" />
                    <ellipse cx="8.5" cy="66" rx="5" ry="7.5" fill="#e8a860" />
                    <ellipse cx="109" cy="66" rx="9" ry="12" fill="#f5c47e" />
                    <ellipse cx="111.5" cy="66" rx="5" ry="7.5" fill="#e8a860" />
                    {/* Left eye */}
                    <ellipse cx="40" cy="63" rx="12" ry="14" fill="white" />
                    <circle cx="41" cy="65" r="8.5" fill="#1a2d4a" />
                    <circle cx="41" cy="65" r="4.2" fill="#080808" />
                    <circle cx="43.5" cy="62" r="2.5" fill="white" />
                    {/* Right eye */}
                    <ellipse cx="80" cy="63" rx="12" ry="14" fill="white" />
                    <circle cx="81" cy="65" r="8.5" fill="#1a2d4a" />
                    <circle cx="81" cy="65" r="4.2" fill="#080808" />
                    <circle cx="83.5" cy="62" r="2.5" fill="white" />
                    {/* Happy eyebrows */}
                    <path d="M28,50 Q40,44 52,50" fill="none" stroke="#3d2510" strokeWidth="3.2" strokeLinecap="round" />
                    <path d="M68,50 Q80,44 92,50" fill="none" stroke="#3d2510" strokeWidth="3.2" strokeLinecap="round" />
                    {/* Nose */}
                    <circle cx="60" cy="79" r="2.8" fill="#d4956a" opacity=".45" />
                    {/* Cheeks */}
                    <circle cx="19" cy="82" r="10" fill="#f08070" opacity=".3" />
                    <circle cx="101" cy="82" r="10" fill="#f08070" opacity=".3" />
                    {/* Big happy smile */}
                    <path d="M42,92 Q60,116 78,92" fill="none" stroke="#c0392b" strokeWidth="3.5" strokeLinecap="round" />
                  </svg>
                </div>

                {/* Name badge */}
                <span style={{
                  background: 'linear-gradient(90deg, #f59e0b, #f97316)',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '.82rem',
                  padding: '3px 14px',
                  borderRadius: 20,
                  boxShadow: '0 3px 12px rgba(245,158,11,0.5)',
                  letterSpacing: .5,
                }}>✨ فهيم</span>
              </div>

            <div style={{
              background: 'linear-gradient(145deg, #185FA5 0%, #104880 100%)',
              borderRadius: 20,
              padding: '68px 28px 28px',
              boxShadow: '0 8px 32px rgba(24,95,165,0.22)',
              color: '#fff',
            }}>

              {/* Header */}
              <div style={{ marginBottom: 20, textAlign: 'center' }}>
                <h3 style={{
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  marginBottom: 6,
                  lineHeight: 1.6,
                }}>
                  لم تجد إجابتك؟ اسأل{' '}
                  <span style={{ color: 'var(--accent)', textShadow: '0 1px 8px rgba(245,166,35,0.4)' }}>
                    فهيم
                  </span>{' '}
                  مباشرة!
                </h3>
                <p style={{ fontSize: '.88rem', opacity: .75, margin: 0 }}>
                  مساعدنا الذكي يجيبك في ثوانٍ
                </p>
              </div>

              {/* Input */}
              <form onSubmit={handleAsk} style={{ marginBottom: 16 }}>
                <div style={{
                  display: 'flex',
                  gap: 8,
                  background: 'rgba(255,255,255,0.12)',
                  borderRadius: 12,
                  padding: '4px 4px 4px 8px',
                  border: '1.5px solid rgba(255,255,255,0.2)',
                }}>
                  <input
                    ref={inputRef}
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    placeholder="مثال: كم سعر الاشتراك؟ أو كيف يساعدني فهيم؟"
                    disabled={loading}
                    style={{
                      flex: 1,
                      background: 'none',
                      border: 'none',
                      outline: 'none',
                      color: '#fff',
                      fontFamily: 'inherit',
                      fontSize: '.95rem',
                      padding: '10px 8px',
                      direction: 'rtl',
                      minWidth: 0,
                    }}
                  />
                  <button
                    type="submit"
                    disabled={loading || !question.trim()}
                    style={{
                      flexShrink: 0,
                      background: loading ? 'rgba(255,255,255,.2)' : 'var(--accent)',
                      border: 'none',
                      borderRadius: 9,
                      width: 42,
                      height: 42,
                      cursor: loading || !question.trim() ? 'not-allowed' : 'pointer',
                      fontSize: '1.1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background .2s, transform .15s',
                      transform: loading ? 'scale(.95)' : 'scale(1)',
                    }}
                    aria-label="إرسال"
                  >
                    {loading ? (
                      <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
                    ) : '✈️'}
                  </button>
                </div>
              </form>

              {/* Answer area */}
              {(displayed || loading) && (
                <div style={{
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: 12,
                  padding: '16px 18px',
                  marginBottom: 16,
                  minHeight: 60,
                }}>
                  {loading && !displayed ? (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', opacity: .7 }}>
                      {[0, 1, 2].map(i => (
                        <span key={i} style={{
                          width: 8, height: 8,
                          background: '#fff',
                          borderRadius: '50%',
                          display: 'inline-block',
                          animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                        }} />
                      ))}
                    </div>
                  ) : (
                    <p style={{
                      margin: 0,
                      fontSize: '.95rem',
                      lineHeight: 1.85,
                      color: '#fff',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      overflowWrap: 'anywhere',
                    }}>
                      {displayed}
                      {displayed.length < answer.length && (
                        <span style={{ opacity: .6, animation: 'blink 1s step-end infinite' }}>|</span>
                      )}
                    </p>
                  )}
                </div>
              )}

              {/* CTA button — shown after answer is ready */}
              {answer && displayed.length >= answer.length && (
                <a
                  href={ASSESSMENT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    background: 'var(--accent)',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: '.95rem',
                    padding: '12px 20px',
                    borderRadius: 12,
                    textDecoration: 'none',
                    transition: 'opacity .2s, transform .15s',
                    boxShadow: '0 4px 16px rgba(245,166,35,0.4)',
                    animation: 'fadeUp .4s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '.88'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  ✨ ابدأ تقييم طفلك الآن
                </a>
              )}

              {/* Fallback CTA before any answer */}
              {!answer && !loading && (
                <a
                  href={ASSESSMENT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    background: 'rgba(255,255,255,0.15)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '.9rem',
                    padding: '11px 18px',
                    borderRadius: 12,
                    textDecoration: 'none',
                    border: '1.5px solid rgba(255,255,255,0.3)',
                    transition: 'background .2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                >
                  ✨ ابدأ تقييم طفلك الآن — مجاناً
                </a>
              )}
            </div>
            </div>{/* /position:relative wrapper */}
          </div>

        </div>
      </div>

      <style jsx global>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-6px); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes blink {
          50% { opacity: 0; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes faheemFloat {
          0%, 100% { transform: translateY(0px); }
          50%      { transform: translateY(-7px); }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 1; transform: scale(1) rotate(0deg); }
          50%       { opacity: .4; transform: scale(1.3) rotate(20deg); }
        }
        input::placeholder { color: rgba(255,255,255,.5); }
      `}</style>
    </section>
  );
}
