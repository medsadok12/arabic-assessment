import { randomBytes }      from 'crypto';
import { NextResponse }     from 'next/server';
import { revalidatePath }   from 'next/cache';
import { createAdminClient } from '../../../../../lib/supabase-admin';
import { requireStoryEditor } from '../../../../../lib/story-auth';
import { isAdmin }          from '../../../../../lib/auth-role';
import { homeFeatureProblem } from '../../../../../lib/story-preview';

export const dynamic = 'force-dynamic';

// قصة الصفحة الرئيسية (قسم «معاينة من داخل المنصة» على aarem.net) — قرار المشرف وحده.
// قصة واحدة على الأكثر (stories.featured_home + فهرس فريد جزئي)، وتحتاج رابط
// مشاركة («اقرأ القصة كاملة») يُنشأ تلقائياً إن لم يوجد. الصفحة الرئيسية تُحدَّث فوراً.

async function requireAdmin() {
  const { user, error } = await requireStoryEditor();
  if (error) return error;
  if (!isAdmin(user)) return NextResponse.json({ error: 'اختيار قصة الصفحة الرئيسية للمشرفين فقط' }, { status: 403 });
  return null;
}

// POST — اعرض هذه القصة في الصفحة الرئيسية بدل أي قصة أخرى
export async function POST(req, { params }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const admin = createAdminClient();
    const { data: story, error: curErr } = await admin
      .from('stories').select('id, status, content, page_audio, share_token').eq('id', params.id).maybeSingle();
    if (curErr) throw curErr;
    if (!story) return NextResponse.json({ error: 'القصة غير موجودة' }, { status: 404 });

    const problem = homeFeatureProblem(story);
    if (problem) return NextResponse.json({ error: problem }, { status: 409 });

    // القصة السابقة أولاً (الفهرس الفريد لا يقبل قصتين معاً)
    const { error: offErr } = await admin
      .from('stories').update({ featured_home: false }).eq('featured_home', true).neq('id', story.id);
    if (offErr) throw offErr;

    const share_token = story.share_token || randomBytes(12).toString('base64url');
    const { data, error } = await admin
      .from('stories').update({ featured_home: true, share_token }).eq('id', story.id).select().single();
    if (error) throw error;

    revalidatePath('/');
    return NextResponse.json({ story: data });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'تعذّر عرض القصة في الصفحة الرئيسية' }, { status: 500 });
  }
}

// DELETE — أزلها من الصفحة الرئيسية (تعود الصفحة لأحدث قصة مشارَكة)
export async function DELETE(req, { params }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('stories').update({ featured_home: false }).eq('id', params.id).select().maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'القصة غير موجودة' }, { status: 404 });
    revalidatePath('/');
    return NextResponse.json({ story: data });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'تعذّر إزالة القصة من الصفحة الرئيسية' }, { status: 500 });
  }
}
