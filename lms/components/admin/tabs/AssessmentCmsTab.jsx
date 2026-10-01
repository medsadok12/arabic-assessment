'use client';
import Link from 'next/link';

/* بطاقة رابط بسيطة نحو الصفحة المستقلة /assessment-cms — نفس نمط
   LexiconTab.jsx بالضبط (نظام إدارة كبير ومستقل بحالته الخاصة يستحق صفحة
   قائمة بذاتها بدل حشره داخل حالة bogga/page.jsx المشتركة). ليست تحت
   /bogga/* عمداً — بوابتها الخاصة (assessment-cms/layout.jsx) تسمح أيضاً
   لمعلّم مُخوَّل صراحةً بصلاحية assessment_cms، بمعزل عن بوابة /bogga/*
   الأشمل التي تستبعد المعلمين من كل شيء آخر تحتها. */
export default function AssessmentCmsTab({ lang }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📝</div>
      <h3 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 12 }}>
        {lang === 'ar' ? 'إدارة أسئلة التقييم' : 'Assessment Question Bank'}
      </h3>
      <p style={{ color: 'var(--muted)', marginBottom: 24 }}>
        {lang === 'ar'
          ? 'تصفح الأسئلة حسب المستوى والمهارة، عدّل النصوص والخيارات، أعد الترتيب، فعّل أو عطّل، وعاين شكل السؤال قبل الحفظ.'
          : 'Browse questions by level and skill, edit text and options, reorder, enable/disable, and preview before saving.'}
      </p>
      <Link href="/assessment-cms" className="btn btn-primary btn-lg">
        {lang === 'ar' ? 'فتح لوحة إدارة التقييمات' : 'Open Assessment CMS'}
      </Link>
    </div>
  );
}
