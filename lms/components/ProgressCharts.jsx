'use client';
import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

const LEVEL_DESC = {
  1: 'مبتدئ', 2: 'أساسي', 3: 'متوسط دنيا',
  4: 'متوسط', 5: 'فوق المتوسط', 6: 'متقدم', 7: 'ممتاز',
};

function Stars({ value, sessionId, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: 'flex', gap: 2, direction: 'ltr' }}>
      {[1,2,3,4,5].map(n => (
        <button
          key={n}
          onClick={() => onChange(sessionId, n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '1.15rem', padding: '0 1px', lineHeight: 1,
            color: n <= (hover || value || 0) ? '#f59e0b' : '#d1d5db',
            transition: 'color .1s',
          }}
          title={`${n} نجوم`}
        >★</button>
      ))}
    </div>
  );
}

export default function ProgressCharts({ assessments, pastSessions: initialSessions }) {
  const [pastSessions, setPastSessions] = useState(initialSessions ?? []);
  const [ratingMsg, setRatingMsg] = useState({});

  async function handleRate(sessionId, rating) {
    const res = await fetch('/api/student/sessions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: sessionId, rating }),
    });
    if (res.ok) {
      setPastSessions(prev => prev.map(s => s.id === sessionId ? { ...s, rating } : s));
      setRatingMsg(prev => ({ ...prev, [sessionId]: '✅' }));
      setTimeout(() => setRatingMsg(prev => { const n = {...prev}; delete n[sessionId]; return n; }), 1500);
    }
  }

  if (!assessments.length && !pastSessions.length) {
    return (
      <div className="empty-state card">
        <span className="empty-icon">📊</span>
        <p>لا توجد بيانات بعد — أكمل تقييمك الأول للبدء</p>
      </div>
    );
  }

  const avgScore  = assessments.length ? Math.round(assessments.reduce((s,a) => s + (a.score ?? 0), 0) / assessments.length) : null;
  const bestScore = assessments.length ? Math.max(...assessments.map(a => a.score ?? 0)) : null;
  const latest    = assessments[assessments.length - 1];

  const chartData = assessments.map(a => ({
    date: new Date(a.completed_at).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
    score: a.score ?? 0,
  }));

  return (
    <div>
      {/* Stats */}
      {assessments.length > 0 && (
        <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: 24 }}>
          {[
            { icon: '🎯', val: assessments.length,                  lbl: 'عدد التقييمات'  },
            { icon: '⭐', val: avgScore != null ? avgScore + '%' : '—', lbl: 'متوسط النتائج'  },
            { icon: '🏆', val: bestScore != null ? bestScore + '%' : '—', lbl: 'أفضل نتيجة'    },
            { icon: '📚', val: latest?.level ? `المستوى ${latest.level}` : '—', lbl: 'المستوى الحالي' },
          ].map(s => (
            <div key={s.lbl} className="stat-card">
              <span className="stat-icon">{s.icon}</span>
              <div>
                <div className="stat-val">{s.val}</div>
                <div className="stat-lbl">{s.lbl}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Score chart */}
      {assessments.length > 1 && (
        <div className="card" style={{ padding: '24px 20px', marginBottom: 24 }}>
          <div style={{ fontWeight: 800, marginBottom: 16, fontSize: '.95rem', color: 'var(--primary)' }}>
            📈 تطور النتائج عبر الزمن
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#185FA5" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#185FA5" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
              <XAxis dataKey="date" style={{ fontSize: '.75rem', fontFamily: 'Cairo,sans-serif' }} />
              <YAxis domain={[0, 100]} style={{ fontSize: '.75rem' }} tickFormatter={v => v + '%'} />
              <Tooltip
                formatter={v => [`${v}%`, 'النتيجة']}
                contentStyle={{ fontFamily: 'Cairo,sans-serif', direction: 'rtl', fontSize: '.85rem', borderRadius: 8 }}
              />
              <Area type="monotone" dataKey="score" stroke="#185FA5" strokeWidth={2.5}
                fill="url(#sg)" dot={{ r: 5, fill: '#185FA5', strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Assessment history */}
      {assessments.length > 0 && (
        <div className="dash-section">
          <div className="dash-section-title">📋 سجل التقييمات</div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.9rem' }}>
              <thead>
                <tr>
                  {['التاريخ','المستوى','النتيجة','الوصف'].map(h => (
                    <th key={h} style={{ background: 'var(--primary)', color: '#fff', padding: '10px 16px', textAlign: 'right', fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...assessments].reverse().map((a, i) => (
                  <tr key={a.id} style={{ background: i % 2 === 0 ? '#fff' : '#f9fbff' }}>
                    <td style={{ padding: '9px 16px', color: 'var(--muted)', fontSize: '.84rem', direction: 'ltr', textAlign: 'right' }}>
                      {a.completed_at ? new Date(a.completed_at).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td style={{ padding: '9px 16px' }}>
                      <span className="badge badge-blue">المستوى {a.level}</span>
                    </td>
                    <td style={{ padding: '9px 16px', textAlign: 'center' }}>
                      <span className={`badge ${(a.score ?? 0) >= 70 ? 'badge-green' : 'badge-orange'}`}>
                        {a.score ?? 0}%
                      </span>
                    </td>
                    <td style={{ padding: '9px 16px', color: 'var(--muted)', fontSize: '.85rem' }}>
                      {LEVEL_DESC[a.level] || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Past sessions with notes + rating */}
      {pastSessions.length > 0 && (
        <div className="dash-section" style={{ marginTop: 24 }}>
          <div className="dash-section-title">🎥 حصصي السابقة</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pastSessions.map(s => (
              <div key={s.id} className="card" style={{ padding: '14px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '1.6rem' }}>
                    {s.status === 'cancelled' ? '❌' : '✅'}
                  </span>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontWeight: 800, fontSize: '.95rem', marginBottom: 3 }}>
                      {s.subject || 'حصة عامة'}
                    </div>
                    <div style={{ fontSize: '.82rem', color: 'var(--muted)', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                      <span>👤 {s.teacher_name}</span>
                      <span>📅 {new Date(s.session_date).toLocaleDateString('en-GB')}</span>
                      <span>⏰ {s.start_time?.slice(0,5)}</span>
                    </div>
                    {s.notes && (
                      <div style={{ marginTop: 8, padding: '8px 12px', background: '#fffbeb', borderRadius: 8, fontSize: '.85rem', color: '#92400e', borderRight: '3px solid #f59e0b' }}>
                        📝 <strong>ملاحظة المعلم:</strong> {s.notes}
                      </div>
                    )}
                    {s.recording_url && (
                      <a href={s.recording_url} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '7px 14px', background: '#eef5ff', borderRadius: 8, fontSize: '.85rem', color: '#185FA5', fontWeight: 700, textDecoration: 'none' }}>
                        🎬 مشاهدة تسجيل الحصة
                      </a>
                    )}
                  </div>
                  {s.status !== 'cancelled' && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <div style={{ fontSize: '.75rem', color: 'var(--muted)', marginBottom: 2 }}>
                        {s.rating ? 'تقييمك:' : 'قيّم الحصة:'}
                      </div>
                      <Stars value={s.rating} sessionId={s.id} onChange={handleRate} />
                      {ratingMsg[s.id] && (
                        <span style={{ fontSize: '.78rem', color: '#1a7c40' }}>{ratingMsg[s.id]}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
