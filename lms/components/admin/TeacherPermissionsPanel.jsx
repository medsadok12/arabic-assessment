'use client';
import { useState, useEffect } from 'react';

/*
  لوحة صغيرة مكتفية ذاتياً (حالتها الخاصة، لا props) لمنح/سحب صلاحيات فرعية
  محددة لمعلمين موثوقين — أول استخدام لها: "إدارة التقييمات" (assessment_cms).
  تُعرَض ضمن تبويب "الصلاحيات" (isSuperAdmin فقط بالفعل في bogga/page.jsx)،
  بمعزل عن AdminsTab.jsx (التي تدير حسابات role=admin فقط) لتفادي تعقيد
  تمرير props إضافية عبرها لميزة مستقلة تماماً عنها.
*/

const TAB_OPTIONS = [
  { key: 'assessment_cms', label: '📝 إدارة التقييمات' },
];

export default function TeacherPermissionsPanel() {
  const [teachers, setTeachers] = useState(null); // null = لم يُحمَّل بعد
  const [msg, setMsg] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const res = await fetch('/api/bogga/teacher-permissions').then(r => r.json()).catch(() => null);
    setTeachers(res?.teachers ?? []);
  }

  async function toggle(teacherId, tabKey, granted) {
    const res = await fetch('/api/bogga/teacher-permissions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacher_id: teacherId, tab_key: tabKey, granted }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMsg({ ok: false, text: data.error || 'فشل التحديث' });
      setTimeout(() => setMsg(null), 3000);
      return;
    }
    setTeachers(prev => prev.map(t => {
      if (t.id !== teacherId) return t;
      const tabKeys = granted ? [...t.tabKeys, tabKey] : t.tabKeys.filter(k => k !== tabKey);
      return { ...t, tabKeys };
    }));
  }

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <h3 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 6 }}>🔓 صلاحيات المعلمين الإضافية</h3>
      <p style={{ color: 'var(--muted)', fontSize: '.85rem', marginBottom: 16 }}>
        امنح معلماً موثوقاً وصولاً لميزة إدارية محددة دون ترقيته لمدير — الصلاحية خادمية حقيقية، لا مجرد تبويب ظاهر.
      </p>

      {msg && (
        <div style={{ marginBottom: 12, padding: '8px 14px', borderRadius: 8, fontWeight: 700, fontSize: '.85rem', background: '#FEE2E2', color: '#B91C1C' }}>
          {msg.text}
        </div>
      )}

      {teachers === null ? (
        <div style={{ textAlign: 'center', padding: 20 }}><span className="spinner" /></div>
      ) : teachers.length === 0 ? (
        <div style={{ color: 'var(--muted)', fontSize: '.85rem' }}>لا يوجد حسابات معلمين حالياً.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'right' }}>المعلم</th>
                {TAB_OPTIONS.map(t => <th key={t.key} style={{ textAlign: 'center' }}>{t.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {teachers.map(t => (
                <tr key={t.id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{t.name}</div>
                    <div style={{ fontSize: '.78rem', color: 'var(--muted)' }}>{t.email}</div>
                  </td>
                  {TAB_OPTIONS.map(opt => (
                    <td key={opt.key} style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={t.tabKeys.includes(opt.key)}
                        onChange={e => toggle(t.id, opt.key, e.target.checked)}
                        style={{ width: 18, height: 18, cursor: 'pointer' }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
