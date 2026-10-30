import { NextResponse } from 'next/server';
import { createClient } from './supabase-server';
import { getRole } from './auth-role';

/* حارس مسارات تحرير القصص (إنشاء/حفظ/رفع/مشاركة) — مصدر واحد للأدوار وللرسائل.
   يفرّق بين حالتين كانتا تظهران معاً بعبارة «غير مخول»:
   - لا جلسة دخول صالحة (انتهت أو أُنهيت بتسجيل خروج) → 401 + رسالة ترشد لإعادة الدخول
     دون إغلاق الصفحة، فلا يضيع ما كتبه المعلم في المحرر.
   - جلسة صالحة لكن الدور لا يسمح بالتحرير → 403 «غير مخول». */

export const STORY_EDITOR_ROLES = ['super_admin', 'admin', 'teacher'];
export const SESSION_EXPIRED_CODE = 'session_expired';
export const SESSION_EXPIRED_MSG =
  'انتهت جلسة الدخول — سجّل الدخول من نافذة جديدة ثم أعد المحاولة، وتعديلاتك باقية في هذه الصفحة';
export const FORBIDDEN_MSG = 'غير مخول';

export function canEditStories(user) {
  return STORY_EDITOR_ROLES.includes(getRole(user) ?? '');
}

/** null إن كان المستخدم يملك التحرير، وإلا { status, body } للرد. */
export function storyAuthFailure(user) {
  if (!user) return { status: 401, body: { error: SESSION_EXPIRED_MSG, code: SESSION_EXPIRED_CODE } };
  if (!canEditStories(user)) return { status: 403, body: { error: FORBIDDEN_MSG } };
  return null;
}

/** يقرأ جلسة الطلب: { user, error } — error ردّ جاهز يُعاد كما هو، أو null. */
export async function requireStoryEditor() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const fail = storyAuthFailure(user);
  return { user, error: fail ? NextResponse.json(fail.body, { status: fail.status }) : null };
}
