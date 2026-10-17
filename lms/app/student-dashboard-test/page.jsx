'use client';

/* ─────────────────────────────────────────────────────────────────────────
   صفحة تجريبية — نفس لوحة الطالب الحالية لكن بخلفية الباستيل الجديدة فقط
   المسار: /student-dashboard-test
───────────────────────────────────────────────────────────────────────── */

const STYLE = `
  .sdt-page {
    min-height: 100vh;
    /* ── خلفية الباستيل المبهجة ── */
    background-color: oklch(0.975 0.018 78);
    background-image:
      radial-gradient(at 12%  8%,  oklch(0.93 0.07 350 / 0.7)  0px, transparent 45%),
      radial-gradient(at 88%  10%, oklch(0.9  0.08 230 / 0.65) 0px, transparent 45%),
      radial-gradient(at 80%  92%, oklch(0.92 0.09 165 / 0.6)  0px, transparent 45%),
      radial-gradient(at 18%  88%, oklch(0.95 0.1  95  / 0.6)  0px, transparent 45%);
    font-family: 'Cairo','Tajawal',sans-serif;
    direction: rtl;
    color: #1e293b;
    padding: 28px 18px 80px;
  }

  .sdt-wrap { max-width: 820px; margin: 0 auto; }

  /* بنر تجريبي */
  .sdt-banner {
    background: rgba(255,255,255,0.65);
    backdrop-filter: blur(8px);
    border: 1.5px dashed #94a3b8;
    border-radius: 14px;
    padding: 9px 18px;
    color: #475569;
    font-size: .82rem;
    font-weight: 700;
    margin-bottom: 22px;
    text-align: center;
  }

  /* ── نفس أسلوب البطاقات الأصلي ── */
  .sdt-stat {
    background: #fff;
    border: 1.5px solid #e2e8f0;
    border-radius: 14px;
    padding: 14px 16px;
    flex: 1;
    min-width: 120px;
    text-align: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  }
  .sdt-stats { display:flex; gap:12px; flex-wrap:wrap; margin-bottom:16px; }
  .sdt-stat-val { font-size:1.7rem; font-weight:900; line-height:1.1; margin-bottom:4px; }
  .sdt-stat-lbl { font-size:.75rem; color:#64748b; font-weight:600; }

  .sdt-card {
    background: #fff;
    border: 1.5px solid #e2e8f0;
    border-radius: 18px;
    padding: 18px 20px;
    margin-bottom: 14px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.06);
  }

  .sdt-card-streak {
    background: linear-gradient(135deg,#fff7ed,#fef3c7);
    border-color: #fcd34d;
  }

  .sdt-card-progress {
    background: linear-gradient(160deg,#f0f9ff,#eef5fe);
    border-color: #bae6fd;
  }

  .sdt-card-session {
    background: linear-gradient(135deg,#185FA5,#1d4ed8);
    border: none;
    color: #fff;
    box-shadow: 0 6px 28px rgba(24,95,165,.22);
  }

  .sdt-section-title {
    font-size: 1rem;
    font-weight: 800;
    color: #1e293b;
    margin: 18px 0 10px;
    display: flex;
    align-items: center;
    gap: 7px;
  }

  .sdt-hw { display:flex; flex-direction:column; gap:10px; margin-bottom:16px; }
  .sdt-hw-card {
    background: #fff;
    border: 1.5px solid #e2e8f0;
    border-radius: 14px;
    padding: 14px 16px;
    display: flex;
    align-items: center;
    gap: 14px;
    box-shadow: 0 1px 5px rgba(0,0,0,0.05);
  }
  .sdt-hw-card.done { background:#f0fdf4; border-color:#6ee7b7; }
  .sdt-hw-card.late { background:#fff5f5; border-color:#fca5a5; }

  .sdt-actions { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-top:16px; }
  .sdt-action {
    border-radius: 16px;
    padding: 20px 14px;
    text-align: center;
    text-decoration: none;
    display: block;
    color: #fff;
    box-shadow: 0 4px 14px rgba(0,0,0,0.1);
    transition: transform .18s, box-shadow .18s;
  }
  .sdt-action:hover { transform:translateY(-3px); box-shadow:0 8px 22px rgba(0,0,0,0.15); }
  .sdt-action-blue   { background: linear-gradient(135deg,#185FA5,#1d4ed8); }
  .sdt-action-purple { background: linear-gradient(135deg,#7c3aed,#a855f7); }
  .sdt-action-green  { background: linear-gradient(135deg,#059669,#10b981); }
  .sdt-action-icon { font-size:2.2rem; margin-bottom:8px; }
  .sdt-action-lbl  { font-size:.82rem; font-weight:800; }

  .sdt-progress-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-top:14px; }
  .sdt-progress-cell { background:rgba(255,255,255,.6); border-radius:12px; padding:12px 10px; text-align:center; }
  .sdt-progress-val  { font-size:1.4rem; font-weight:900; color:#0369a1; }
  .sdt-progress-lbl  { font-size:.72rem; color:#64748b; margin-top:3px; }
  .sdt-bar-wrap { background:rgba(186,230,253,.4); border-radius:99px; height:7px; margin-top:8px; overflow:hidden; }
  .sdt-bar      { height:100%; border-radius:99px; background:linear-gradient(90deg,#0369a1,#0ea5e9); }

  .sdt-streak-dots { display:flex; gap:6px; margin-top:12px; }
  .sdt-dot {
    width:36px; height:36px; border-radius:50%;
    display:flex; align-items:center; justify-content:center;
    font-size:.72rem; font-weight:700;
  }
  .sdt-dot-done  { background:#185FA5; color:#fff; }
  .sdt-dot-today { background:#185FA5; color:#fff; box-shadow:0 0 0 3px rgba(24,95,165,.3); }
  .sdt-dot-miss  { background:#f1f5f9; color:#94a3b8; }

  .sdt-badge {
    display:inline-flex; align-items:center; gap:5px;
    background:rgba(255,255,255,.2); border:1px solid rgba(255,255,255,.3);
    border-radius:99px; padding:3px 12px;
    font-size:.78rem; font-weight:700; margin-bottom:10px;
  }

  .sdt-session-btn {
    background:#fff; color:#185FA5; border:none;
    border-radius:10px; padding:10px 20px;
    font-family:inherit; font-size:.88rem; font-weight:800;
    cursor:pointer; margin-top:12px;
    box-shadow:0 3px 10px rgba(0,0,0,0.15);
  }

  .sdt-note {
    background:#fffbeb; border:1.5px solid #fcd34d;
    border-radius:14px; padding:14px 18px; margin-bottom:10px;
  }
  .sdt-note-text { font-size:.88rem; font-weight:600; color:#451a03; margin:0 0 5px; }
  .sdt-note-meta { font-size:.73rem; color:#92400e; }

  @media (max-width:600px) {
    .sdt-actions { grid-template-columns:1fr; }
    .sdt-progress-grid { grid-template-columns:1fr; }
  }
`;

const MOCK = {
  name: 'أحمد محمد',
  streak: 10,
  attendance: 92,
  words: 45,
  assessments: 3,
  last7: [
    { label:'ج', done:true  }, { label:'خ', done:true  }, { label:'س', done:true  },
    { label:'أ', done:false }, { label:'إ', done:true  }, { label:'ث', done:true  },
    { label:'ي', today:true },
  ],
  homework: [
    { title:'قراءة قصة الأرنب والسلحفاة', due:'غداً',  status:'pending' },
    { title:'تمارين الحروف المتحركة',      due:'اليوم', status:'done'    },
    { title:'كتابة عشر جمل بسيطة',         due:'أمس',  status:'late'    },
  ],
  notes: [
    { text:'أحمد يتقدم بشكل رائع في القراءة هذا الأسبوع! استمر هكذا 🌟', date:'أمس' },
    { text:'يجب التركيز أكثر على حروف المد', date:'منذ يومين' },
  ],
};

export default function StudentDashboardTest() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLE }} />
      <div className="sdt-page">
        <div className="sdt-wrap">

          <div className="sdt-banner">
            🎨 معاينة تجريبية — نفس الداشبورد بخلفية الباستيل الجديدة فقط
          </div>

          {/* الترحيب */}
          <h1 style={{ fontSize:'clamp(1.4rem,4vw,1.85rem)', fontWeight:900, color:'var(--primary,#185FA5)', margin:'0 0 4px' }}>
            👋 أهلاً، {MOCK.name}!
          </h1>
          <p style={{ color:'#64748b', fontSize:'.9rem', margin:'0 0 24px' }}>
            مرحباً بك في أكاديمية عارم
          </p>

          {/* الإحصاءات */}
          <div className="sdt-stats">
            {[
              { val:`${MOCK.attendance}%`, lbl:'🏫 الحضور',       color:'#059669' },
              { val:'1',                   lbl:'📝 واجبات معلّقة', color:'#d97706' },
              { val:MOCK.assessments,      lbl:'📊 تقييماتي',      color:'#185FA5' },
              { val:'2',                   lbl:'📅 حصص قادمة',     color:'#7c3aed' },
            ].map((s, i) => (
              <div key={i} className="sdt-stat">
                <div className="sdt-stat-val" style={{ color: s.color }}>{s.val}</div>
                <div className="sdt-stat-lbl">{s.lbl}</div>
              </div>
            ))}
          </div>

          {/* streak */}
          <div className="sdt-card sdt-card-streak">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontSize:'1.5rem', fontWeight:900, color:'#b45309' }}>
                  🔥 {MOCK.streak} أيام متتالية
                </div>
                <div style={{ color:'#78350f', fontSize:'.82rem', fontWeight:600, marginTop:3 }}>
                  {MOCK.streak} يوماً بلا توقف — إنجاز رائع! 🏅
                </div>
              </div>
              <div style={{
                background:'rgba(245,158,11,.2)', border:'1px solid #fcd34d',
                borderRadius:99, padding:'4px 14px',
                fontSize:'.78rem', fontWeight:800, color:'#92400e',
              }}>
                ✅ لعبت اليوم
              </div>
            </div>
            <div className="sdt-streak-dots">
              {MOCK.last7.map((d, i) => (
                <div key={i} className={`sdt-dot ${d.today ? 'sdt-dot-today' : d.done ? 'sdt-dot-done' : 'sdt-dot-miss'}`}>
                  {d.today ? '⭐' : d.label}
                </div>
              ))}
            </div>
          </div>

          {/* التقدم */}
          <div className="sdt-card sdt-card-progress">
            <div style={{ fontWeight:800, color:'#0369a1', fontSize:'.95rem' }}>📈 تقدمك الشخصي</div>
            <div className="sdt-progress-grid">
              {[
                { val:MOCK.words,           lbl:'كلمة محفوظة',  pct:(MOCK.words/100)*100 },
                { val:`${MOCK.attendance}%`, lbl:'نسبة الحضور', pct:MOCK.attendance      },
                { val:'87%',                lbl:'آخر تقييم',    pct:87                   },
              ].map((m, i) => (
                <div key={i} className="sdt-progress-cell">
                  <div className="sdt-progress-val">{m.val}</div>
                  <div className="sdt-progress-lbl">{m.lbl}</div>
                  <div className="sdt-bar-wrap">
                    <div className="sdt-bar" style={{ width:`${m.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* الحصة القادمة */}
          <div className="sdt-card sdt-card-session" style={{ display:'flex', gap:16, alignItems:'flex-start', flexWrap:'wrap' }}>
            <div style={{ flex:1, minWidth:200 }}>
              <div className="sdt-badge">📅 الحصة القادمة</div>
              <p style={{ fontSize:'1.05rem', fontWeight:900, margin:'0 0 4px' }}>حصة القراءة والاستيعاب</p>
              <p style={{ fontSize:'.82rem', opacity:.8, margin:0 }}>مع الأستاذ سامي · غداً الساعة 5:00 م</p>
              <button className="sdt-session-btn">🔗 انضم إلى الحصة</button>
            </div>
            <div style={{
              background:'rgba(255,255,255,.15)', border:'1.5px solid rgba(255,255,255,.25)',
              borderRadius:14, padding:'14px 20px', textAlign:'center', minWidth:110,
            }}>
              <div style={{ fontSize:'.72rem', opacity:.7, marginBottom:5 }}>ينطلق خلال</div>
              <div style={{ fontSize:'1.6rem', fontWeight:900, lineHeight:1 }}>18:42</div>
              <div style={{ fontSize:'.7rem', opacity:.65, marginTop:4 }}>س : د</div>
            </div>
          </div>

          {/* الواجبات */}
          <div className="sdt-section-title">📝 الواجبات</div>
          <div className="sdt-hw">
            {MOCK.homework.map((hw, i) => (
              <div key={i} className={`sdt-hw-card ${hw.status === 'done' ? 'done' : hw.status === 'late' ? 'late' : ''}`}>
                <span style={{ fontSize:'1.6rem' }}>
                  {hw.status === 'done' ? '✅' : hw.status === 'late' ? '⚠️' : '📖'}
                </span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'.88rem', fontWeight:700, margin:'0 0 2px' }}>{hw.title}</div>
                  <div style={{ fontSize:'.75rem', color:'#64748b' }}>📆 الموعد: {hw.due}</div>
                </div>
                <div style={{
                  fontSize:'.74rem', fontWeight:800, padding:'4px 12px', borderRadius:99,
                  background: hw.status==='done' ? '#dcfce7' : hw.status==='late' ? '#fee2e2' : '#f1f5f9',
                  color:       hw.status==='done' ? '#15803d' : hw.status==='late' ? '#dc2626' : '#64748b',
                }}>
                  {hw.status==='done' ? 'مكتمل' : hw.status==='late' ? 'متأخر' : 'قيد التنفيذ'}
                </div>
              </div>
            ))}
          </div>

          {/* ملاحظات المعلم */}
          <div className="sdt-section-title">💬 ملاحظات المعلم</div>
          {MOCK.notes.map((n, i) => (
            <div key={i} className="sdt-note">
              <p className="sdt-note-text">"{n.text}"</p>
              <div className="sdt-note-meta">🕐 {n.date}</div>
            </div>
          ))}

          {/* بطاقات الإجراءات السريعة */}
          <div className="sdt-section-title">🚀 استكشف المزيد</div>
          <div className="sdt-actions">
            <a href="/library"            className="sdt-action sdt-action-blue">
              <div className="sdt-action-icon">📚</div>
              <div className="sdt-action-lbl">المكتبة التعليمية</div>
            </a>
            <a href="/library/flashcards" className="sdt-action sdt-action-purple">
              <div className="sdt-action-icon">🎴</div>
              <div className="sdt-action-lbl">بطاقات المفردات</div>
            </a>
            <a href="/progress"           className="sdt-action sdt-action-green">
              <div className="sdt-action-icon">📈</div>
              <div className="sdt-action-lbl">تقدمي</div>
            </a>
          </div>

        </div>
      </div>
    </>
  );
}
