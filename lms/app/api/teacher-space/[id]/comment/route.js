import { NextResponse }      from 'next/server';
import { createClient }      from '../../../../../lib/supabase-server';
import { createAdminClient } from '../../../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

const ALLOWED = ['teacher', 'supervisor', 'admin', 'super_admin'];

// POST — add comment
export async function POST(req, { params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ALLOWED.includes(user.user_metadata?.role))
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const { content } = await req.json();
  if (!content?.trim())
    return NextResponse.json({ error: 'التعليق لا يمكن أن يكون فارغاً' }, { status: 400 });

  const admin = createAdminClient();

  const { data: postExists } = await admin
    .from('teacher_space_posts').select('id').eq('id', params.id).single();
  if (!postExists) return NextResponse.json({ error: 'المنشور غير موجود' }, { status: 404 });

  const { data, error } = await admin
    .from('teacher_space_comments')
    .insert({
      post_id:     params.id,
      author_id:   user.id,
      author_name: user.user_metadata?.full_name ?? user.email,
      author_role: user.user_metadata?.role,
      content:     content.trim(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comment: data }, { status: 201 });
}
