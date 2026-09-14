'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

const LEVEL_SKILLS = {
  1: 'الحروف والمقاطع',
  2: 'القراءة الأساسية',
  3: 'الاستيعاب والفهم',
  4: 'الكتابة والتعبير',
  5: 'اللغة المتقدمة',
};

function ParentCard({ icon, label, value, sub, variant = 'blue' }) {
  const colors = {
    green:  { bg: '#e8f5e9', border: '#a5d6a7', icon: '#2e7d32', val: '#1b5e20' },
    orange: { bg: '#fff3e0', border: '#ffcc80', icon: '#e65100', val: '#bf360c' },
    blue:   { bg: '#e3f2fd', border: '#90caf9', icon: '#1565c0', val: '#0d47a1' },
  };
  const c = colors[variant];
  return (
    <div style={{
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 12, padding: '18px 20px',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <span style={{ fontSize: '1.6rem' }}>{icon}</span>
      <div style={{ fontSize: '.8rem', color: c.icon, fontWeight: 600, marginTop: 4 }}>{label}</div>
      <div style={{ fontSize: '1.7rem', fontWeight: 800, color: c.val, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: '.78rem', color: c.icon, opacity: .8 }}>{sub}</div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#fff', border: '1px solid #e0e0e0', borderRadius: 10,
      padding: '10px 14px', fontFamily: 'Tajawal, sans-serif', fontSize: 13,
      boxShadow: '0 4px 12px rgba(0,0,0,.1)',
    }}>
      <div style={{ color: '#666', marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 700, color: '#185FA5' }}>النتيجة: {payload[0].value}%</div>
    </div>
  );
};

export default function ParentPanel({ assessments }) {
  if (!assessments || assessments.length === 0) {
    return (
      <div className="dash-section">
        <div className="dash-section-title">👨‍👩‍👧 متابعة ولي الأمر</div>
        <div className="empty-state card">
          <span className="empty-icon">📊</span>
          <p>سيظهر تقرير ولي الأمر بعد إجراء أول تقييم.</p>
        </div>
      </div>
    );
  }

  const sorted     = [...assessments].sort((a, b) => new Date(a.completed_at) - new Date(b.completed_at));
  const scores     = assessments.map(a => a.score ?? 0);
  const maxScore   = Math.max(...scores);
  const minScore   = Math.min(...scores);
  const bestAssmt  = assessments.find(a => (a.score ?? 0) === maxScore);
  const weakAssmt  = assessments.find(a => (a.score ?? 0) === minScore);
  const trendDiff  = sorted.length >= 2
    ? (sorted[sorted.length - 1].score ?? 0) - (sorted[0].score ?? 0)
    : null;
  const latestScore = sorted[sorted.length - 1]?.score ?? 0;

  const chartData = sorted.map(a => ({
    date:  a.completed_at ? new Date(a.completed_at).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }) : '—',
    score: a.score ?? 0,
  }));

  return (
    <div className="dash-section">
      <div className="dash-section-title">👨‍👩‍👧 متابعة ولي الأمر</div>

      {/* ── بطاقات الملخص ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16, marginBottom: 20 }}>

        <ParentCard
          icon="⭐"
          label="الأداء الأفضل"
          value={`${maxScore}%`}
          sub={LEVEL_SKILLS[bestAssmt?.level] ?? `المستوى ${bestAssmt?.level ?? '—'}`}
          variant="green"
        />

        <ParentCard
          icon={minScore < 70 ? '💪' : '✅'}
          label={minScore < 70 ? 'يحتاج تعزيزاً' : 'مستوى متماسك'}
          value={`${minScore}%`}
          sub={minScore < 70
            ? `${LEVEL_SKILLS[weakAssmt?.level] ?? ''} — تحتاج ممارسة إضافية`
            : 'أداء منتظم في جميع التقييمات'}
          variant={minScore < 70 ? 'orange' : 'blue'}
        />

        <ParentCard
          icon={trendDiff === null ? '🔄' : trendDiff > 0 ? '📈' : trendDiff < 0 ? '📉' : '➡️'}
          label="اتجاه التطور"
          value={trendDiff === null ? '—' : (trendDiff > 0 ? '+' : '') + trendDiff + '%'}
          sub={trendDiff === null
            ? 'يظهر بعد تقييمين'
            : trendDiff > 5  ? 'تحسن ملحوظ 🎉'
            : trendDiff > 0  ? 'تحسن تدريجي'
            : trendDiff === 0 ? 'مستوى ثابت'
            : 'يحتاج متابعة دقيقة'}
          variant={trendDiff !== null && trendDiff > 0 ? 'green' : trendDiff !== null && trendDiff < 0 ? 'orange' : 'blue'}
        />

        <ParentCard
          icon={latestScore >= 70 ? '🏅' : '📋'}
          label="آخر تقييم"
          value={`${latestScore}%`}
          sub={latestScore >= 80 ? 'ممتاز' : latestScore >= 70 ? 'جيد جداً' : latestScore >= 60 ? 'جيد' : 'يحتاج دعماً'}
          variant={latestScore >= 70 ? 'green' : 'orange'}
        />
      </div>

      {/* ── منحنى التطور ── */}
      <div className="card" style={{ padding: '22px 20px' }}>
        <div style={{ fontWeight: 700, fontSize: '.96rem', color: 'var(--text)', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
          📈 منحنى تطور مستوى الطالب
          {chartData.length < 2 && (
            <span style={{ fontSize: '.75rem', color: 'var(--muted)', fontWeight: 400 }}>
              (يظهر المنحنى بعد تقييمين أو أكثر)
            </span>
          )}
        </div>
        {chartData.length >= 2 ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="parentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#185FA5" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#185FA5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fontFamily: 'Tajawal, sans-serif', fill: '#888' }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: '#888' }}
                tickFormatter={v => v + '%'}
                axisLine={false} tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="score"
                stroke="#185FA5"
                strokeWidth={2.5}
                fill="url(#parentGrad)"
                dot={{ fill: '#185FA5', r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#1e88e5' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{
            height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--muted)', fontSize: '.9rem', background: 'var(--bg)', borderRadius: 8,
          }}>
            أجرِ تقييماً آخر لعرض منحنى التطور
          </div>
        )}
      </div>
    </div>
  );
}
