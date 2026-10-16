import { NextResponse }       from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { requireStoryEditor } from '../../../../lib/story-auth';

export const dynamic = 'force-dynamic';

const MAX_MB    = 5;

export async function POST(req) {
  const { error: authError } = await requireStoryEditor();
  if (authError) return authError;

  let form;
  try { form = await req.formData(); }
  catch { return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 }); }

  const file = form.get('file');
  if (!file || typeof file === 'string')
    return NextResponse.json({ error: 'لا يوجد ملف' }, { status: 400 });

  if (file.size > MAX_MB * 1024 * 1024)
    return NextResponse.json({ error: `الحجم الأقصى ${MAX_MB}MB` }, { status: 413 });

  const ext  = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const name = `stories/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const buf  = Buffer.from(await file.arrayBuffer());

  const admin = createAdminClient();
  const { error } = await admin.storage.from('media').upload(name, buf, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: { publicUrl } } = admin.storage.from('media').getPublicUrl(name);
  return NextResponse.json({ url: publicUrl });
}
