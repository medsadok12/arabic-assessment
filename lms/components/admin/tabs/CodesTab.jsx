'use client';
import CodesManager from '../../CodesManager';

/* هذا المكوّن استُخرج حرفياً من lms/app/bogga/page.jsx (تفكيك الملف الأحادي).
   الحالة والمعالجات بقيت في الصفحة الأم وتصل هنا كـprops — سلوك مطابق 100%. */
export default function CodesTab({ lang, codesTab, setCodesTab }) {
  return (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 24, background: 'var(--bg)', borderRadius: 12, padding: 6, width: 'fit-content' }}>
                {[
                  { id: 'assessment', label: lang === 'ar' ? '📋 أكواد التقييم'  : '📋 Assessment Codes' },
                  { id: 'students',   label: lang === 'ar' ? '👤 أكواد الطلبة'   : '👤 Student Codes' },
                  { id: 'teachers',   label: lang === 'ar' ? '👨‍🏫 أكواد المعلمين' : '👨‍🏫 Teacher Codes' },
                ].map(st => (
                  <button key={st.id} onClick={() => setCodesTab(st.id)}
                    style={{
                      padding: '8px 18px', borderRadius: 9, border: 'none', cursor: 'pointer',
                      fontFamily: 'inherit', fontSize: '.88rem', fontWeight: 700,
                      background: codesTab === st.id ? '#fff' : 'transparent',
                      color: codesTab === st.id ? 'var(--primary)' : 'var(--muted)',
                      boxShadow: codesTab === st.id ? '0 1px 6px rgba(0,0,0,.1)' : 'none',
                      transition: 'all .15s',
                    }}>
                    {st.label}
                  </button>
                ))}
              </div>
              {codesTab === 'assessment' && <CodesManager type="assessment" />}
              {codesTab === 'students'   && <CodesManager type="student" />}
              {codesTab === 'teachers'   && <CodesManager type="teacher" />}
            </div>
  );
}
