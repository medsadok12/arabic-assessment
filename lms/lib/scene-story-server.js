import { NextResponse } from 'next/server';
import { createClient } from './supabase-server';
import { getRole, isAdmin } from './auth-role';
import { resolveActiveIdentity } from './active-child';
import { mediaPathFromUrl } from './story-audio';
import { SCENE_MEDIA_PREFIX, STUDENT_MEDIA_BUCKET } from './scene-story';

/* ════════════════════════════════════════════════════════════════
   «مشهدٌ وحكاية» — مساعدات مسارات الخادم (/api/scenes/*)
   الأدوار: الطالب (أي حساب غير طاقم، عبر هوية الطفل النشط) يرى المشاهد ويرسل
   ردّه. المعلم يدير مشاهده ويقيّم ردود طلابه (teacher_students) وردود مشاهده.
   المشرف والمدير المطلق: كل المشاهد وكل الردود.
════════════════════════════════════════════════════════════════ */

export const SCENE_STAFF = ['teacher', 'admin', 'super_admin'];
export const NON_STUDENT = ['teacher', 'admin', 'super_admin', 'supervisor'];
export const SCENE_COLUMNS = 'id, title, image_url, prompt, prompt_audio_url, words, tiles, starters, hotspots, what_if, feeling_q, modes, band, audience, is_active, publish_at, sort_order, created_by, created_at, updated_at';
export const RESPONSE_COLUMNS = 'id, scene_id, student_id, student_email, student_name, student_grade, text, audio_path, photo_path, feeling, word_count, gold_used, status, review, reviewed_by, reviewed_at, created_at, updated_at';
const NO_STORE = { 'Cache-Control': 'no-store' };

export const json = (body, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

export function isMissingSchema(error) {
  return ['42703', '42P01', 'PGRST204', 'PGRST205'].includes(error?.code);
}
export const schemaResponse = () => json({ error: 'قاعدة البيانات تحتاج تحديث «مشهدٌ وحكاية» (lms/supabase/scene_story.sql)', need_sql: true }, 503);

export async function currentUser() {
  const { data: { user } } = await createClient().auth.getUser();
  return user || null;
}

/* المعلم/الإدارة — { user } أو { error: ردّ جاهز } */
export async function requireSceneStaff() {
  const user = await currentUser();
  if (!user) return { error: json({ error: 'انتهت جلسة الدخول — سجّل الدخول ثم أعد المحاولة' }, 401) };
  if (!SCENE_STAFF.includes(getRole(user) ?? '')) return { error: json({ error: 'إدارة المشاهد للمعلمين والإدارة فقط' }, 403) };
  return { user };
}

/* الطالب أو أي زائر مسجَّل — بهوية الطفل النشط (حسابات العائلة §13) */
export async function requireViewer(admin, req) {
  const user = await currentUser();
  if (!user) return { error: json({ error: 'انتهت جلسة الدخول — سجّل الدخول ثم أعد المحاولة' }, 401) };
  const role = getRole(user) ?? '';
  const staff = SCENE_STAFF.includes(role);
  const identity = staff ? { effectiveUserId: user.id, effectiveEmail: (user.email || '').toLowerCase(), viewingChild: null }
    : await resolveActiveIdentity(user, admin, req);
  const child = identity.viewingChild;
  const grade = Number(child?.grade ?? user.user_metadata?.grade) || null;
  const name = child?.full_name || user.app_metadata?.display_name || user.user_metadata?.full_name || user.email || 'طالب';
  return { user, role, staff, canSubmit: !NON_STUDENT.includes(role), identity, grade, name };
}

/* معلمو الطالب (teacher_students) */
export async function teacherIdsFor(admin, email) {
  if (!email) return [];
  const { data } = await admin.from('teacher_students').select('teacher_id').eq('student_email', email.toLowerCase());
  return [...new Set((data || []).map(r => r.teacher_id).filter(Boolean))];
}
/* بُرد طلاب المعلم */
export async function studentEmailsOf(admin, teacherId) {
  const { data } = await admin.from('teacher_students').select('student_email').eq('teacher_id', teacherId);
  return [...new Set((data || []).map(r => (r.student_email || '').toLowerCase()).filter(Boolean))];
}

export const canManageScene = (user, scene) => isAdmin(user) || (!!scene?.created_by && scene.created_by === user.id);
export const canReviewResponse = (user, response, scene, myEmails = []) =>
  isAdmin(user) || myEmails.includes((response?.student_email || '').toLowerCase()) || (!!scene?.created_by && scene.created_by === user.id);

/* صور المشاهد وأصوات أسئلتها: مجلد scenes/ في الدلو العام media فقط */
export const isSceneMediaUrl = (url) => !!mediaPathFromUrl(url, SCENE_MEDIA_PREFIX);
export async function removeSceneMedia(admin, urls) {
  const paths = urls.map(u => mediaPathFromUrl(u, SCENE_MEDIA_PREFIX)).filter(Boolean);
  if (!paths.length) return;
  try { await admin.storage.from('media').remove(paths); } catch {}
}

/* روابط موقَّعة مؤقتة لملفات الطلاب في الدلو الخاص — { path: url } */
export async function signStudentMedia(admin, paths, expiresIn = 60 * 60) {
  const list = [...new Set(paths.filter(Boolean))];
  if (!list.length) return {};
  try {
    const { data } = await admin.storage.from(STUDENT_MEDIA_BUCKET).createSignedUrls(list, expiresIn);
    return Object.fromEntries((data || []).filter(x => x.signedUrl).map(x => [x.path, x.signedUrl]));
  } catch {
    return {};
  }
}
export async function removeStudentMedia(admin, paths) {
  const list = paths.filter(Boolean);
  if (!list.length) return;
  try { await admin.storage.from(STUDENT_MEDIA_BUCKET).remove(list); } catch {}
}

/* ردّ للعرض: روابط الملفات الموقَّعة بدل المسارات */
export function withMediaUrls(response, urls) {
  if (!response) return null;
  return {
    ...response,
    audio_url: response.audio_path ? urls[response.audio_path] || null : null,
    photo_url: response.photo_path ? urls[response.photo_path] || null : null,
  };
}
