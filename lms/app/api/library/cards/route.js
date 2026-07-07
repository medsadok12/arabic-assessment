import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { createClient }      from '../../../../lib/supabase-server';
import { getRole } from '../../../../lib/auth-role';

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
    const { data } = await admin.from('library_card_meta').select('*');
    return NextResponse.json({ cards: data || [] });
  } catch {
    return NextResponse.json({ cards: [] });
  }
}

// PUT — upsert (admin/teacher)
export async function PUT(request) {
  try {
    const { user, allowed } = await checkAuth();
    if (!user || !allowed) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

    const { card_key, icon, image_url, title, description } = await request.json();
    if (!card_key?.trim()) return NextResponse.json({ error: 'مفتاح البطاقة مطلوب' }, { status: 400 });

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('library_card_meta')
      .upsert(
        { card_key: card_key.trim(), icon: icon || null, image_url: image_url || null, title: title || null, description: description || null, updated_at: new Date().toISOString() },
        { onConflict: 'card_key' }
      )
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ card: data });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'فشل الحفظ' }, { status: 500 });
  }
}

// DELETE — reset to default
export async function DELETE(request) {
  try {
    const { user, allowed } = await checkAuth();
    if (!user || !allowed) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const card_key = searchParams.get('card_key');
    if (!card_key) return NextResponse.json({ error: 'مفتاح البطاقة مطلوب' }, { status: 400 });

    const admin = createAdminClient();
    const { error } = await admin.from('library_card_meta').delete().eq('card_key', card_key);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'فشل الحذف' }, { status: 500 });
  }
}
