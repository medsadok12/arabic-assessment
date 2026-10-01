'use client';
import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';

/*
  لوحة تحليلات ذاتية الاكتفاء (حالتها الخاصة، بلا props) — أول استهلاك فعلي
  لعمود assessments.answers الذي أُضيف لهذا الغرض تحديداً. راجع api/bogga/
  analytics/route.js للتجميع؛ يُحسَب بالكامل في JS إذ حجم الجدول اليوم
  (عشرات الصفوف) تافه لأي شيء أكثر تعقيداً.
*/

function accuracyColor(pct) {
  if (pct >= 70) return 'var(--success)';
  if (pct >= 50) return 'var(--accent)';
  return 'var(--danger)';
}

export default function AnalyticsTab() {
  const [data, setData]     = useState(null); // null = لم يُحمَّل بعد
  const [error, setError]   = useState(null);

  useEffect(() => {
    fetch('/api/bogga/analytics')
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); })
      .catch(() => setError('تعذّر تحميل التحليلات'));
  }, []);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!data) return <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></div>;

  const { overview, skillBreakdown, mostMissed } = data;
  const coveragePct = overview.total > 0 ? Math.round((overview.withDetail / overview.total) * 100) : 0;

  return (
    <div>
      <h2 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 20 }}>📊 تحليلات ذكية</h2>

      {/* نظرة عامة */}
      <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: 20 }}>
        {[
          { icon: '🧾', val: overview.total,               lbl: 'إجمالي التقييمات' },
          { icon: '⭐', val: overview.avgScore + '%',       lbl: 'متوسط النتائج'   },
          { icon: '🌱', val: overview.byLevel[1] ?? 0,       lbl: 'وصلوا للمستوى 1' },
          { icon: '📚', val: overview.byLevel[2] ?? 0,       lbl: 'وصلوا للمستوى 2' },
          { icon: '🎓', val: overview.byLevel[3] ?? 0,       lbl: 'وصلوا للمستوى 3' },
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

      {/* ملاحظة تغطية البيانات — صادقة وواضحة، لا تُخفي محدودية العيّنة الحالية */}
      <div style={{
        background: coveragePct < 50 ? '#fffbeb' : '#eafbf3',
        border: `1px solid ${coveragePct < 50 ? '#fde68a' : '#bbf3d8'}`,
        borderRadius: 10, padding: '10px 16px', marginBottom: 24, fontSize: '.85rem',
        color: coveragePct < 50 ? '#92400e' : '#065f46',
      }}>
        ℹ️ تحليل المهارات والأسئلة أدناه مبني على {overview.withDetail} من أصل {overview.total} تقييماً
        ({coveragePct}%) — التقييمات الأقدم لا تحتوي تفاصيل الإجابات لكل سؤال.
        الدقة تتحسن تلقائياً مع كل تقييم جديد.
      </div>

      {/* دقة كل مهارة */}
      <div className="card" style={{ padding: '24px 20px', marginBottom: 24 }}>
        <div style={{ fontWeight: 800, marginBottom: 16, fontSize: '.95rem', color: 'var(--primary)' }}>
          🎯 نسبة الإجابات الصحيحة حسب المهارة
        </div>
        {skillBreakdown.length === 0 ? (
          <div style={{ color: 'var(--muted)', fontSize: '.85rem' }}>لا توجد بيانات كافية بعد.</div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(160, skillBreakdown.length * 56)}>
            <BarChart data={skillBreakdown} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tickFormatter={v => v + '%'} style={{ fontSize: '.75rem' }} />
              <YAxis type="category" dataKey="name" width={130} style={{ fontSize: '.8rem', fontFamily: 'Cairo,sans-serif' }} />
              <Tooltip
                formatter={(v, n, p) => [`${v}% (${p.payload.correct}/${p.payload.total})`, 'الدقة']}
                contentStyle={{ fontFamily: 'Cairo,sans-serif', direction: 'rtl', fontSize: '.85rem', borderRadius: 8 }}
              />
              <Bar dataKey="accuracy" radius={[0, 6, 6, 0]}>
                {skillBreakdown.map((s) => <Cell key={s.id} fill={accuracyColor(s.accuracy)} />)}
                <LabelList dataKey="accuracy" position="right" formatter={v => v + '%'} style={{ fontSize: '.8rem', fontWeight: 700 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* الأسئلة الأكثر خطأً */}
      <div className="dash-section">
        <div className="dash-section-title">⚠️ الأسئلة الأكثر تكراراً للخطأ</div>
        {mostMissed.length === 0 ? (
          <div className="card" style={{ color: 'var(--muted)', fontSize: '.85rem' }}>لا توجد بيانات كافية بعد.</div>
        ) : (
          <div className="card table-scroll-wrapper" style={{ padding: 0 }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.88rem' }}>
              <thead>
                <tr>
                  {['السؤال', 'المهارة', 'مرات الخطأ', 'نسبة الخطأ'].map(h => (
                    <th key={h} style={{ background: 'var(--primary)', color: '#fff', padding: '10px 16px', textAlign: 'right', fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mostMissed.map((q, i) => (
                  <tr key={q.id} style={{ background: i % 2 === 0 ? '#fff' : '#f9fbff' }}>
                    <td style={{ padding: '9px 16px', maxWidth: 360 }}>{q.text}</td>
                    <td style={{ padding: '9px 16px' }}><span className="badge badge-blue">{q.skill}</span></td>
                    <td style={{ padding: '9px 16px', textAlign: 'center' }}>{q.wrong} / {q.total}</td>
                    <td style={{ padding: '9px 16px', textAlign: 'center' }}>
                      <span className={`badge ${q.wrongRate >= 50 ? 'badge-orange' : 'badge-blue'}`}>{q.wrongRate}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
