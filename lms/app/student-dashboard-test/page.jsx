'use client';

/* ─────────────────────────────────────────────────────────────────────────
   صفحة تجريبية — لوحة الطالب بلوحة ألوان الباستيل المبهجة
   المسار: /student-dashboard-test
   ملاحظة: بيانات ثابتة للمعاينة فقط — لا تُعدّل الداشبورد الأصلي
───────────────────────────────────────────────────────────────────────── */

const STYLE = `
  :root {
    --bg:           oklch(0.975 0.018 78);
    --fg:           oklch(0.32  0.045 32);
    --card:         oklch(0.995 0.006 80);
    --border:       oklch(0.9   0.025 70);
    --primary:      oklch(0.74  0.13  28);
    --primary-fg:   oklch(0.99  0.01  80);
    --mint:         oklch(0.9   0.08  165);
    --mint-fg:      oklch(0.4   0.08  165);
    --sky:          oklch(0.89  0.07  230);
    --sky-fg:       oklch(0.4   0.09  245);
    --sunny:        oklch(0.93  0.09  95);
    --sunny-fg:     oklch(0.45  0.09  75);
    --bubble:       oklch(0.91  0.07  350);
    --bubble-fg:    oklch(0.46  0.12  5);
    --muted:        oklch(0.56  0.04  40);
    --radius:       1.25rem;
  }

  .sdt-page {
    min-height: 100vh;
    background-color: var(--bg);
    background-image:
      radial-gradient(at 12%  8%,  oklch(0.93 0.07 350 / 0.7)  0px, transparent 45%),
      radial-gradient(at 88%  10%, oklch(0.9  0.08 230 / 0.65) 0px, transparent 45%),
      radial-gradient(at 80%  92%, oklch(0.92 0.09 165 / 0.6)  0px, transparent 45%),
      radial-gradient(at 18%  88%, oklch(0.95 0.1  95  / 0.6)  0px, transparent 45%);
    font-family: 'Cairo','Tajawal',sans-serif;
    direction: rtl;
    color: var(--fg);
    padding: 28px 18px 80px;
  }

  .sdt-wrap { max-width: 820px; margin: 0 auto; }

  /* ── بنر تجريبي ── */
  .sdt-banner {
    background: var(--sunny);
    border: 1.5px dashed var(--sunny-fg);
    border-radius: var(--radius);
    padding: 10px 18px;
    color: var(--sunny-fg);
    font-size: .82rem;
    font-weight: 700;
    margin-bottom: 22px;
    text-align: center;
  }

  /* ── رأس الصفحة ── */
  .sdt-hello {
    font-size: clamp(1.4rem, 4vw, 1.85rem);
    font-weight: 900;
    color: var(--primary);
    margin: 0 0 4px;
  }
  .sdt-sub {
    color: var(--muted);
    font-size: .9rem;
    margin: 0 0 24px;
  }

  /* ── إحصاءات ── */
  .sdt-stats {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 18px;
  }
  .sdt-stat {
    background: var(--card);
    border: 1.5px solid var(--border);
    border-radius: var(--radius);
    padding: 14px 16px;
    flex: 1;
    min-width: 120px;
    text-align: center;
    box-shadow: 0 2px 8px oklch(0 0 0 / 0.06);
  }
  .sdt-stat-val {
    font-size: 1.7rem;
    font-weight: 900;
    line-height: 1.1;
    margin-bottom: 4px;
  }
  .sdt-stat-lbl {
    font-size: .75rem;
    color: var(--muted);
    font-weight: 600;
  }

  /* ── كرت streak ── */
  .sdt-streak {
    background: var(--sunny);
    border: 2px solid oklch(0.82 0.12 95);
    border-radius: var(--radius);
    padding: 18px 20px;
    margin-bottom: 16px;
  }
  .sdt-streak-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
  }
  .sdt-streak-num {
    font-size: 2rem;
    font-weight: 900;
    color: var(--sunny-fg);
  }
  .sdt-streak-dots {
    display: flex;
    gap: 6px;
  }
  .sdt-dot {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: .72rem;
    font-weight: 700;
  }
  .sdt-dot-done  { background: oklch(0.74 0.13 28); color: white; }
  .sdt-dot-today { background: oklch(0.74 0.13 28); color: white; box-shadow: 0 0 0 3px oklch(0.74 0.13 28 / 0.3); }
  .sdt-dot-miss  { background: oklch(0.88 0.03 80); color: var(--muted); }

  /* ── كرت التقدم ── */
  .sdt-progress {
    background: var(--sky);
    border: 1.5px solid oklch(0.75 0.07 230);
    border-radius: var(--radius);
    padding: 18px 20px;
    margin-bottom: 16px;
  }
  .sdt-progress-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-top: 14px;
  }
  .sdt-progress-cell {
    background: oklch(0.97 0.02 230 / 0.7);
    border-radius: calc(var(--radius) * 0.7);
    padding: 12px 10px;
    text-align: center;
  }
  .sdt-progress-val {
    font-size: 1.4rem;
    font-weight: 900;
    color: var(--sky-fg);
  }
  .sdt-progress-lbl {
    font-size: .72rem;
    color: var(--sky-fg);
    opacity: .75;
    margin-top: 3px;
  }
  .sdt-bar-wrap {
    background: oklch(0.97 0.02 230 / 0.5);
    border-radius: 99px;
    height: 7px;
    margin-top: 8px;
    overflow: hidden;
  }
  .sdt-bar {
    height: 100%;
    border-radius: 99px;
    background: linear-gradient(90deg, var(--sky-fg), oklch(0.65 0.1 200));
  }

  /* ── كرت الحصة القادمة ── */
  .sdt-session {
    background: linear-gradient(135deg, var(--primary) 0%, oklch(0.64 0.13 28) 100%);
    border-radius: var(--radius);
    padding: 22px;
    margin-bottom: 16px;
    color: var(--primary-fg);
    box-shadow: 0 8px 28px oklch(0.74 0.13 28 / 0.35);
    display: flex;
    gap: 16px;
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .sdt-session-left { flex: 1; min-width: 200px; }
  .sdt-session-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: oklch(0.99 0.01 80 / 0.2);
    border: 1px solid oklch(0.99 0.01 80 / 0.3);
    border-radius: 99px;
    padding: 3px 12px;
    font-size: .78rem;
    font-weight: 700;
    margin-bottom: 10px;
  }
  .sdt-session-title {
    font-size: 1.05rem;
    font-weight: 900;
    margin: 0 0 4px;
  }
  .sdt-session-meta { font-size: .82rem; opacity: .8; margin: 0; }
  .sdt-session-btn {
    background: white;
    color: var(--primary);
    border: none;
    border-radius: calc(var(--radius) * 0.7);
    padding: 10px 20px;
    font-family: inherit;
    font-size: .88rem;
    font-weight: 800;
    cursor: pointer;
    margin-top: 12px;
    box-shadow: 0 3px 10px oklch(0 0 0 / 0.15);
  }

  /* ── الواجبات ── */
  .sdt-section-title {
    font-size: 1rem;
    font-weight: 800;
    color: var(--fg);
    margin: 18px 0 10px;
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .sdt-hw {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 18px;
  }
  .sdt-hw-card {
    background: var(--card);
    border: 1.5px solid var(--border);
    border-radius: calc(var(--radius) * 0.8);
    padding: 14px 16px;
    display: flex;
    align-items: center;
    gap: 14px;
    box-shadow: 0 1px 5px oklch(0 0 0 / 0.05);
  }
  .sdt-hw-card.done  { background: var(--mint); border-color: oklch(0.76 0.1 165); }
  .sdt-hw-card.late  { background: var(--bubble); border-color: oklch(0.76 0.1 350); }
  .sdt-hw-title { font-size: .88rem; font-weight: 700; margin: 0 0 2px; }
  .sdt-hw-due   { font-size: .75rem; color: var(--muted); }

  /* ── بطاقات الإجراءات ── */
  .sdt-actions {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-top: 18px;
  }
  .sdt-action {
    border-radius: var(--radius);
    padding: 20px 14px;
    text-align: center;
    cursor: pointer;
    transition: transform .18s, box-shadow .18s;
    text-decoration: none;
    display: block;
  }
  .sdt-action:hover { transform: translateY(-3px); box-shadow: 0 8px 22px oklch(0 0 0 / 0.13); }
  .sdt-action-mint   { background: var(--mint);   color: var(--mint-fg);   border: 1.5px solid oklch(0.76 0.1 165); }
  .sdt-action-sky    { background: var(--sky);    color: var(--sky-fg);    border: 1.5px solid oklch(0.75 0.09 230); }
  .sdt-action-bubble { background: var(--bubble); color: var(--bubble-fg); border: 1.5px solid oklch(0.76 0.1 350); }
  .sdt-action-icon { font-size: 2.2rem; margin-bottom: 8px; }
  .sdt-action-lbl  { font-size: .82rem; font-weight: 800; }

  /* ── ملاحظات المعلم ── */
  .sdt-notes { display: flex; flex-direction: column; gap: 10px; margin-bottom: 18px; }
  .sdt-note {
    background: var(--sunny);
    border: 1.5px solid oklch(0.82 0.12 95);
    border-radius: calc(var(--radius) * 0.8);
    padding: 14px 18px;
  }
  .sdt-note-text { font-size: .88rem; font-weight: 600; color: var(--sunny-fg); margin: 0 0 5px; }
  .sdt-note-meta { font-size: .73rem; color: oklch(0.55 0.08 75); }

  /* ── ريسبونسف ── */
  @media (max-width: 600px) {
    .sdt-actions { grid-template-columns: 1fr; }
    .sdt-progress-grid { grid-template-columns: 1fr; }
  }
  @media (max-width: 420px) {
    .sdt-stats .sdt-stat { min-width: 100%; }
  }
`;

/* ── بيانات تجريبية ────────────────────────────────────────────────────── */
const MOCK = {
  name:       'أحمد محمد',
  streak:     10,
  attendance: 92,
  words:      45,
  assessments: 3,
  last7: [
    { label:'ج', done: true  },
    { label:'خ', done: true  },
    { label:'س', done: true  },
    { label:'أ', done: false },
    { label:'إ', done: true  },
    { label:'ث', done: true  },
    { label:'ي', today: true },
  ],
  homework: [
    { title: 'قراءة قصة الأرنب والسلحفاة', due: 'غداً',   status: 'pending' },
    { title: 'تمارين الحروف المتحركة',      due: 'اليوم', status: 'done'    },
    { title: 'كتابة عشر جمل بسيطة',         due: 'أمس',   status: 'late'   },
  ],
  notes: [
    { text: 'أحمد يتقدم بشكل رائع في القراءة هذا الأسبوع! استمر هكذا 🌟', date: 'أمس' },
    { text: 'يجب التركيز أكثر على حروف المد', date: 'منذ يومين' },
  ],
};

export default function StudentDashboardTest() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLE }} />
      <div className="sdt-page">
        <div className="sdt-wrap">

          {/* بنر تجريبي */}
          <div className="sdt-banner">
            🎨 صفحة تجريبية — معاينة لوحة الألوان الباستيل الجديدة
          </div>

          {/* الترحيب */}
          <h1 className="sdt-hello">👋 أهلاً، {MOCK.name}!</h1>
          <p className="sdt-sub">مرحباً بك في أكاديمية عارم — يوم رائع! 🌈</p>

          {/* الإحصاءات */}
          <div className="sdt-stats">
            <div className="sdt-stat">
              <div className="sdt-stat-val" style={{ color: 'oklch(0.5 0.12 165)' }}>
                {MOCK.attendance}%
              </div>
              <div className="sdt-stat-lbl">🏫 الحضور</div>
            </div>
            <div className="sdt-stat">
              <div className="sdt-stat-val" style={{ color: 'oklch(0.55 0.13 28)' }}>
                1
              </div>
              <div className="sdt-stat-lbl">📝 واجبات معلّقة</div>
            </div>
            <div className="sdt-stat">
              <div className="sdt-stat-val" style={{ color: 'oklch(0.45 0.1 245)' }}>
                {MOCK.assessments}
              </div>
              <div className="sdt-stat-lbl">📊 تقييماتي</div>
            </div>
            <div className="sdt-stat">
              <div className="sdt-stat-val" style={{ color: 'oklch(0.5 0.1 350)' }}>
                2
              </div>
              <div className="sdt-stat-lbl">📅 حصص قادمة</div>
            </div>
          </div>

          {/* ستريك */}
          <div className="sdt-streak">
            <div className="sdt-streak-top">
              <div>
                <div className="sdt-streak-num">🔥 {MOCK.streak} أيام متتالية</div>
                <div style={{ color: 'oklch(0.55 0.09 75)', fontSize: '.82rem', fontWeight: 600, marginTop: 3 }}>
                  {MOCK.streak} يوماً بلا توقف — إنجاز رائع! 🏅
                </div>
              </div>
              <div style={{
                background: 'oklch(0.85 0.13 95)',
                color: 'var(--sunny-fg)',
                borderRadius: '99px',
                padding: '4px 14px',
                fontSize: '.78rem',
                fontWeight: 800,
              }}>
                ✅ لعبت اليوم
              </div>
            </div>
            <div className="sdt-streak-dots">
              {MOCK.last7.map((d, i) => (
                <div
                  key={i}
                  className={`sdt-dot ${d.today ? 'sdt-dot-today' : d.done ? 'sdt-dot-done' : 'sdt-dot-miss'}`}
                >
                  {d.today ? '⭐' : d.label}
                </div>
              ))}
            </div>
          </div>

          {/* التقدم الشخصي */}
          <div className="sdt-progress">
            <div style={{ fontWeight: 800, color: 'var(--sky-fg)', fontSize: '.95rem' }}>
              📈 تقدمك الشخصي
            </div>
            <div className="sdt-progress-grid">
              <div className="sdt-progress-cell">
                <div className="sdt-progress-val">{MOCK.words}</div>
                <div className="sdt-progress-lbl">كلمة محفوظة</div>
                <div className="sdt-bar-wrap">
                  <div className="sdt-bar" style={{ width: `${(MOCK.words / 100) * 100}%` }} />
                </div>
              </div>
              <div className="sdt-progress-cell">
                <div className="sdt-progress-val">{MOCK.attendance}%</div>
                <div className="sdt-progress-lbl">نسبة الحضور</div>
                <div className="sdt-bar-wrap">
                  <div className="sdt-bar" style={{ width: `${MOCK.attendance}%` }} />
                </div>
              </div>
              <div className="sdt-progress-cell">
                <div className="sdt-progress-val">87%</div>
                <div className="sdt-progress-lbl">آخر تقييم</div>
                <div className="sdt-bar-wrap">
                  <div className="sdt-bar" style={{ width: '87%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* الحصة القادمة */}
          <div className="sdt-session">
            <div className="sdt-session-left">
              <div className="sdt-session-badge">📅 الحصة القادمة</div>
              <p className="sdt-session-title">حصة القراءة والاستيعاب</p>
              <p className="sdt-session-meta">مع الأستاذ سامي · غداً الساعة 5:00 م</p>
              <button className="sdt-session-btn">🔗 انضم إلى الحصة</button>
            </div>
            <div style={{
              background: 'oklch(0.99 0.01 80 / 0.15)',
              border: '1.5px solid oklch(0.99 0.01 80 / 0.25)',
              borderRadius: 'calc(var(--radius) * 0.7)',
              padding: '14px 20px',
              textAlign: 'center',
              minWidth: 110,
            }}>
              <div style={{ fontSize: '.72rem', opacity: .7, marginBottom: 5 }}>ينطلق خلال</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, lineHeight: 1 }}>18:42</div>
              <div style={{ fontSize: '.7rem', opacity: .65, marginTop: 4 }}>س : د</div>
            </div>
          </div>

          {/* الواجبات */}
          <div className="sdt-section-title">📝 الواجبات</div>
          <div className="sdt-hw">
            {MOCK.homework.map((hw, i) => (
              <div key={i} className={`sdt-hw-card ${hw.status === 'done' ? 'done' : hw.status === 'late' ? 'late' : ''}`}>
                <span style={{ fontSize: '1.6rem' }}>
                  {hw.status === 'done' ? '✅' : hw.status === 'late' ? '⚠️' : '📖'}
                </span>
                <div style={{ flex: 1 }}>
                  <div className="sdt-hw-title" style={{
                    color: hw.status === 'done'
                      ? 'var(--mint-fg)'
                      : hw.status === 'late'
                        ? 'var(--bubble-fg)'
                        : 'var(--fg)',
                  }}>
                    {hw.title}
                  </div>
                  <div className="sdt-hw-due">
                    📆 الموعد: {hw.due}
                  </div>
                </div>
                <div style={{
                  fontSize: '.74rem',
                  fontWeight: 800,
                  padding: '4px 12px',
                  borderRadius: '99px',
                  background: hw.status === 'done'
                    ? 'oklch(0.76 0.1 165)'
                    : hw.status === 'late'
                      ? 'oklch(0.76 0.1 350)'
                      : 'oklch(0.85 0.06 80)',
                  color: hw.status === 'done'
                    ? 'var(--mint-fg)'
                    : hw.status === 'late'
                      ? 'var(--bubble-fg)'
                      : 'var(--muted)',
                }}>
                  {hw.status === 'done' ? 'مكتمل' : hw.status === 'late' ? 'متأخر' : 'قيد التنفيذ'}
                </div>
              </div>
            ))}
          </div>

          {/* ملاحظات المعلم */}
          <div className="sdt-section-title">💬 ملاحظات المعلم</div>
          <div className="sdt-notes">
            {MOCK.notes.map((n, i) => (
              <div key={i} className="sdt-note">
                <p className="sdt-note-text">"{n.text}"</p>
                <div className="sdt-note-meta">🕐 {n.date}</div>
              </div>
            ))}
          </div>

          {/* بطاقات الإجراءات */}
          <div className="sdt-section-title">🚀 استكشف المزيد</div>
          <div className="sdt-actions">
            <a href="/library" className="sdt-action sdt-action-mint">
              <div className="sdt-action-icon">📚</div>
              <div className="sdt-action-lbl">المكتبة التعليمية</div>
            </a>
            <a href="/library/flashcards" className="sdt-action sdt-action-sky">
              <div className="sdt-action-icon">🎴</div>
              <div className="sdt-action-lbl">بطاقات المفردات</div>
            </a>
            <a href="/progress" className="sdt-action sdt-action-bubble">
              <div className="sdt-action-icon">📈</div>
              <div className="sdt-action-lbl">تقدمي</div>
            </a>
          </div>

        </div>
      </div>
    </>
  );
}
