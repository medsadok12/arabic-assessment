import { randomBytes }      from 'crypto';
import { NextResponse }     from 'next/server';
import { revalidatePath }   from 'next/cache';
import { createAdminClient } from '../../../../../lib/supabase-admin';
import { requireStoryEditor } from '../../../../../lib/story-auth';

export const dynamic = 'force-dynamic';

// POST — ينشئ رابط مشاركة عاماً للقصة (أو يُرجع الموجود) — قراءة فقط على /story/<token>
export async function POST(req, { params }) {
  const { error: authError } = await requireStoryEditor();
  if (authError) return authError;
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

// DELETE — يلغي رابط المشاركة فيتوقف الرابط القديم فوراً. قصة بلا رابط لا تُعرض
// في الصفحة الرئيسية، فتخرج منها أيضاً (featured_home) وتُحدَّث الصفحة فوراً
export async function DELETE(req, { params }) {
  const { error: authError } = await requireStoryEditor();
  if (authError) return authError;
  try {
    const admin = createAdminClient();
    const { error } = await admin.from('stories').update({ share_token: null, featured_home: false }).eq('id', params.id);
    if (error) throw error;
    revalidatePath('/');
    return NextResponse.json({ share_token: null, featured_home: false });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'تعذّر إلغاء الرابط' }, { status: 500 });
  }
}
