import { NextResponse }      from 'next/server';
import { createClient }      from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

const ALLOWED_READ = ['supervisor', 'admin', 'super_admin'];

// POST — public: parent sends a message
export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const { parent_name, student_name, phone, message } = body;

  if (!parent_name?.trim() || !message?.trim())
    return NextResponse.json({ error: 'الاسم والرسالة مطلوبان' }, { status: 400 });

  if (message.trim().length > 1000)
    return NextResponse.json({ error: 'الرسالة طويلة جداً (الحد 1000 حرف)' }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('parent_messages')
    .insert({
      parent_name:  parent_name.trim(),
      student_name: student_name?.trim() || null,
      phone:        phone?.trim() || null,
      message:      message.trim(),
    })
    .select()
    .single();

  if (error) {
    if (error.code === '42P01')
      return NextResponse.json({ error: 'الجدول غير موجود — يرجى تشغيل parent_messages.sql في Supabase' }, { status: 500 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true, id: data.id }, { status: 201 });
}

// GET — supervisor/admin: fetch all messages
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ALLOWED_READ.includes(user.user_metadata?.role))
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('parent_messages')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    if (error.code === '42P01') return NextResponse.json({ messages: [] });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ messages: data ?? [] });
}

// PATCH — mark message as read
export async function PATCH(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ALLOWED_READ.includes(user.user_metadata?.role))
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id مطلوب' }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin
    .from('parent_messages')
    .update({ is_read: true })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
