'use client';
import LessonLogbookView from '../../LessonLogbookView';

/* هذا المكوّن استُخرج حرفياً من lms/app/bogga/page.jsx (تفكيك الملف الأحادي).
   الحالة والمعالجات بقيت في الصفحة الأم وتصل هنا كـprops — سلوك مطابق 100%. */
export default function LogbookTab({ lang }) {
  return (
            <div>
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 4 }}>
                  📓 {lang === 'ar' ? 'كراس الدروس الرقمي' : 'Digital Lesson Logbook'}
                </h2>
                <p style={{ color: 'var(--muted)', fontSize: '.88rem' }}>
                  {lang === 'ar'
                    ? 'اعرض كراس أي معلم، تابع خططه وتقدمه، وأضف توجيهات تربوية تصله فوراً'
                    : 'View any teacher\'s logbook, track lesson plans & progress, and send instant pedagogical guidance'}
                </p>
              </div>
              <div style={{
                background: '#fff', borderRadius: 20,
                border: '1.5px solid var(--border)',
                padding: '24px',
                boxShadow: '0 2px 12px rgba(24,95,165,.05)',
              }}>
                <LessonLogbookView lang={lang} />
              </div>
            </div>
  );
}
