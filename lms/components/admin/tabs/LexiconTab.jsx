'use client';
import Link from 'next/link';

/* هذا المكوّن استُخرج حرفياً من lms/app/bogga/page.jsx (تفكيك الملف الأحادي).
   الحالة والمعالجات بقيت في الصفحة الأم وتصل هنا كـprops — سلوك مطابق 100%. */
export default function LexiconTab({ lang }) {
  return (
            <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📖</div>
              <h3 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 12 }}>{lang === 'ar' ? 'بنك الكلمات اللغوية' : 'Language Word Bank'}</h3>
              <p style={{ color: 'var(--muted)', marginBottom: 24 }}>{lang === 'ar' ? 'إدارة الكلمات المشكولة وتعديلها وإضافة الجذور والمقاطع الصوتية لكل صف' : 'Manage voweled words, edit them and add roots and syllables per grade'}</p>
              <Link href="/bogga/lexicon" className="btn btn-primary btn-lg">{lang === 'ar' ? 'فتح لوحة بنك الكلمات' : 'Open Word Bank Panel'}</Link>
            </div>
  );
}
