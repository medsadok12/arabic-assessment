import { createAdminClient } from './supabase-admin';
import { getRole } from './auth-role';

/** هل يملك هذا المعلم صلاحية فرعية محددة (tab_key) مُفوَّضة له صراحة؟ */
export async function hasTeacherPermission(teacherId, tabKey) {
  const admin = createAdminClient();
  const { data } = await admin
    .from('teacher_permissions')
    .select('tab_key')
    .eq('teacher_id', teacherId)
    .eq('tab_key', tabKey)
    .maybeSingle();
  return !!data;
}

/**
 * البوابة الموحَّدة لكل مسارات إدارة أسئلة التقييم — super_admin/admin دائماً
 * مخوَّلون (كما كانت الحال)، ومعلّم مُخوَّل فقط إن مُنح صراحةً tab_key
 * 'assessment_cms' عبر لوحة "صلاحيات المعلمين" في bogga (AdminsTab).
 */
export async function canManageAssessments(user) {
  const role = getRole(user);
  if (role === 'super_admin' || role === 'admin') return true;
  if (role === 'teacher') return hasTeacherPermission(user.id, 'assessment_cms');
  return false;
}
