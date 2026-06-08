import { NextResponse }      from 'next/server';
import { createClient }      from '../../../lib/supabase-server';
import { createAdminClient } from '../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

const ALLOWED = ['teacher', 'supervisor', 'admin', 'super_admin'];

// GET — all posts with comments (newest first)
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ALLOWED.includes(user.user_metadata?.role))
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('teacher_space_posts')
    .select('*, teacher_space_comments(*)')
    .order('created_at', { ascending: false });

  if (error) {
    if (error.code === '42P01') return NextResponse.json({ posts: [] });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ posts: data ?? [] });
}

// POST — create a new post (text + optional media base64)
export async function POST(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ALLOWED.includes(user.user_metadata?.role))
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const body = await req.json();
  const { content, media_type, media_data, media_mime } = body;

  if (!content?.trim() && !media_data)
    return NextResponse.json({ error: 'لا يمكن نشر منشور فارغ' }, { status: 400 });

  // ~3MB base64 limit
  if (media_data && media_data.length > 4_000_000)
    return NextResponse.json({ error: 'حجم الملف كبير جداً (الحد 3MB)' }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('teacher_space_posts')
    .insert({
      author_id:   user.id,
      author_name: user.user_metadata?.full_name ?? user.email,
      author_role: user.user_metadata?.role,
      content:     content?.trim() || null,
      media_type:  media_type || null,
      media_data:  media_data || null,
      media_mime:  media_mime || null,
      likes:       [],
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ post: { ...data, teacher_space_comments: [] } }, { status: 201 });
}
