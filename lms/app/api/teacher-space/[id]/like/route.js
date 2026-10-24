import { NextResponse }      from 'next/server';
import { createClient }      from '../../../../../lib/supabase-server';
import { createAdminClient } from '../../../../../lib/supabase-admin';
import { getRole } from '../../../../../lib/auth-role';

export const dynamic = 'force-dynamic';

const ALLOWED = ['teacher', 'supervisor', 'admin', 'super_admin'];

// POST — toggle like
export async function POST(req, { params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ALLOWED.includes(getRole(user)))
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const admin = createAdminClient();
  const { data: post, error: fetchErr } = await admin
    .from('teacher_space_posts').select('likes').eq('id', params.id).single();

  if (fetchErr || !post) return NextResponse.json({ error: 'المنشور غير موجود' }, { status: 404 });

  const likes = Array.isArray(post.likes) ? post.likes : [];
  const already = likes.includes(user.id);
  const newLikes = already ? likes.filter(id => id !== user.id) : [...likes, user.id];

  const { error } = await admin
    .from('teacher_space_posts').update({ likes: newLikes }).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ liked: !already, count: newLikes.length });
}
