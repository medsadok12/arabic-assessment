import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../../lib/supabase-admin';
import { createClient }      from '../../../../../lib/supabase-server';
import { getRole } from '../../../../../lib/auth-role';

export const dynamic = 'force-dynamic';

const MAX_MB = 4;

export async function POST(request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || getRole(user) !== 'super_admin') {
      return NextResponse.json({ error: 'غير مخول' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string') return NextResponse.json({ error: 'الملف مطلوب' }, { status: 400 });
    if (file.size > MAX_MB * 1024 * 1024) return NextResponse.json({ error: `الصورة تتجاوز ${MAX_MB}MB` }, { status: 413 });

    const ext  = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `puzzles/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const admin = createAdminClient();

    await admin.storage.createBucket('media', { public: true }).catch(() => {});

    const bytes  = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const { error: uploadErr } = await admin.storage.from('media').upload(path, buffer, { contentType: file.type || 'image/jpeg', upsert: false });
    if (uploadErr) throw uploadErr;

    const { data: { publicUrl } } = admin.storage.from('media').getPublicUrl(path);
    return NextResponse.json({ url: publicUrl });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'فشل رفع الصورة' }, { status: 500 });
  }
}
