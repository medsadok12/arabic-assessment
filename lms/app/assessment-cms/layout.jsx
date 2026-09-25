import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase-server';
import { canManageAssessments } from '../../lib/teacher-permissions';

// البوابة الحقيقية الوحيدة لصفحة إدارة أسئلة التقييم — Server Component،
// تُنفَّذ قبل أي عرض. مسار مستقل عن app/bogga/layout.jsx (الذي يمنع أي دور
// غير admin/super_admin من كامل شجرة /bogga/*) عمداً: لو استُخدم ذلك
// الـlayout هنا لتوسيع الوصول لمعلم مُخوَّل، لكان قد فتح أيضاً /bogga/lexicon
// و/bogga/student-view وكل ما تحت /bogga دون قصد. هذا المسار المستقل يمنح
// فقط ما طُلب بدقة: super_admin/admin دائماً، ومعلّم فقط إن مُنح صراحةً
// tab_key 'assessment_cms' (راجع lib/teacher-permissions.js).
export default async function AssessmentCmsLayout({ children }) {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/auth/login');

  if (!(await canManageAssessments(user))) redirect('/dashboard');

  return <>{children}</>;
}
