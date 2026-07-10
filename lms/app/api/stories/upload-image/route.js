import { createAdminClient } from '../../../../lib/supabase-admin';
import { createClient }      from '../../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = user?.user_metadata?.role ?? '';
  if (!user || !['super_admin', 'admin', 'teacher'].includes(role)) {
    return Response.json({ error: 'غير مخول' }, { status: 403 });
  }

  let file;
  try {
    const form = await request.formData();
    file = form.get('file');
  } catch {
    return Response.json({ error: 'طلب غير صالح' }, { status: 400 });
  }

  if (!file || typeof file === 'string') return Response.json({ error: 'لا يوجد ملف' }, { status: 400 });
  if (!file.type?.startsWith('image/'))   return Response.json({ error: 'يجب أن يكون ملف صورة' }, { status: 400 });

  const bytes  = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const ext    = file.type === 'image/png'  ? 'png'
               : file.type === 'image/gif'  ? 'gif'
               : file.type === 'image/webp' ? 'webp'
               : 'jpg';
  const path   = `pages/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const admin = createAdminClient();
  await admin.storage.createBucket('stories', { public: true }).catch(() => {});

  const { error } = await admin.storage.from('stories').upload(path, buffer, {
    contentType: file.type || 'image/jpeg',
    upsert: false,
  });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const { data: urlData } = admin.storage.from('stories').getPublicUrl(path);
  return Response.json({ url: urlData.publicUrl });
}
