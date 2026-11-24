import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../../lib/supabase-admin';
import { createClient }      from '../../../../../lib/supabase-server';
import { getRole } from '../../../../../lib/auth-role';
import { lcCategoryAliases, normalizeLcCategory, normalizeLcCategoryMeta } from '../../../../../lib/letter-catcher-categories';

export const dynamic = 'force-dynamic';
const liveCategories = categories => NextResponse.json({ categories }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
const categoryLoadFailure = () => NextResponse.json(
  { categories: [], error: 'تعذّر عرض صور العوالم. حاول مرة أخرى.' },
  { status: 503, headers: { 'Cache-Control': 'no-store, max-age=0' } }
);

async function checkAuth() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = getRole(user) ?? '';
  return { user, allowed: ['super_admin', 'admin', 'teacher'].includes(role) };
}

// GET — public
export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from('lc_category_meta').select('*');
    if (error) return categoryLoadFailure();
    return liveCategories(normalizeLcCategoryMeta(data));
  } catch {
    return categoryLoadFailure();
  }
}

// PUT — upsert category metadata (teacher/admin)
export async function PUT(request) {
  try {
    const { user, allowed } = await checkAuth();
    if (!user || !allowed) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

    const { name, emoji, image_url } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: 'اسم التصنيف مطلوب' }, { status: 400 });

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('lc_category_meta')
      .upsert(
        { name: normalizeLcCategory(name), emoji: emoji?.trim() || null, image_url: image_url || null, updated_at: new Date().toISOString() },
        { onConflict: 'name' }
      )
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ category: data });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'فشل الحفظ' }, { status: 500 });
  }
}

// DELETE — remove custom meta for a category
export async function DELETE(request) {
  try {
    const { user, allowed } = await checkAuth();
    if (!user || !allowed) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    if (!name) return NextResponse.json({ error: 'اسم التصنيف مطلوب' }, { status: 400 });

    const admin = createAdminClient();
    const { error } = await admin.from('lc_category_meta').delete().in('name', lcCategoryAliases(name));
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'فشل الحذف' }, { status: 500 });
  }
}
