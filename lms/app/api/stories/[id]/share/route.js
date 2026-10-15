import { randomBytes }      from 'crypto';
import { NextResponse }     from 'next/server';
import { createAdminClient } from '../../../../../lib/supabase-admin';
import { createClient }      from '../../../../../lib/supabase-server';
import { getRole }           from '../../../../../lib/auth-role';

export const dynamic = 'force-dynamic';

const ALLOWED = ['teacher', 'admin', 'super_admin'];

async function guard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return !!user && ALLOWED.includes(getRole(user) ?? '');
}

// POST — ينشئ رابط مشاركة عاماً للقصة (أو يُرجع الموجود) — قراءة فقط على /story/<token>
export async function POST(req, { params }) {
  if (!await guard()) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });
  try {
    const admin = createAdminClient();
    const { data: current, error: curErr } = await admin
      .from('stories').select('share_token').eq('id', params.id).maybeSingle();
    if (curErr) throw curErr;
    if (!current) return NextResponse.json({ error: 'القصة غير موجودة' }, { status: 404 });
    if (current.share_token) return NextResponse.json({ share_token: current.share_token });

    const share_token = randomBytes(12).toString('base64url'); // 16 حرفاً عشوائياً
    const { error } = await admin.from('stories').update({ share_token }).eq('id', params.id);
    if (error) throw error;
    return NextResponse.json({ share_token });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'تعذّر إنشاء الرابط' }, { status: 500 });
  }
}

// DELETE — يلغي رابط المشاركة فيتوقف الرابط القديم فوراً
export async function DELETE(req, { params }) {
  if (!await guard()) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });
  try {
    const admin = createAdminClient();
    const { error } = await admin.from('stories').update({ share_token: null }).eq('id', params.id);
    if (error) throw error;
    return NextResponse.json({ share_token: null });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'تعذّر إلغاء الرابط' }, { status: 500 });
  }
}
