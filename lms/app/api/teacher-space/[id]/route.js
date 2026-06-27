import { NextResponse }      from 'next/server';
import { createClient }      from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

const ADMIN_ROLES = ['admin', 'super_admin'];

// DELETE — delete a post (own post or admin)
export async function DELETE(req, { params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const admin = createAdminClient();
  const { data: post } = await admin
    .from('teacher_space_posts').select('author_id').eq('id', params.id).single();

  if (!post) return NextResponse.json({ error: 'المنشور غير موجود' }, { status: 404 });

  const isOwner = post.author_id === user.id;
  const isAdmin = ADMIN_ROLES.includes(user.user_metadata?.role);
  if (!isOwner && !isAdmin)
    return NextResponse.json({ error: 'لا تملك صلاحية الحذف' }, { status: 403 });

  const { error } = await admin.from('teacher_space_posts').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
