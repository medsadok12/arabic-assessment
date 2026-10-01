import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { createClient }      from '../../../../lib/supabase-server';
import { getRole } from '../../../../lib/auth-role';

const TABLE = 'word_image_matches';
const ROLES = ['super_admin', 'admin', 'teacher'];

async function getUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
function isAuthorized(user) {
  return ROLES.includes(getRole(user) ?? '');
}

// GET — public, optional ?topic= &grade=
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const topic = searchParams.get('topic') || '';
    const grade = Number(searchParams.get('grade') || 0);

    const admin = createAdminClient();
    let query = admin.from(TABLE).select('*').order('created_at', { ascending: false });
    if (topic)    query = query.eq('topic', topic);
    if (grade > 0) query = query.eq('grade_level', grade);

    const { data, error } = await query;
    if (error || !data) return NextResponse.json({ pairs: [], source: 'error' });

    const valid = data.filter(p => p.word_text?.trim() && p.image_url);
    return NextResponse.json(
      { pairs: valid, source: 'database' },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } }
    );
  } catch {
    return NextResponse.json({ pairs: [], source: 'error' });
  }
}

// POST — create pair (teacher/admin)
export async function POST(request) {
  try {
    const user = await getUser();
    if (!isAuthorized(user)) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

    const { word_text, audio_url, image_url, topic, grade_level } = await request.json();
    if (!word_text?.trim())  return NextResponse.json({ error: 'الكلمة مطلوبة' }, { status: 400 });
    if (!image_url)          return NextResponse.json({ error: 'الصورة مطلوبة' }, { status: 400 });

    const admin = createAdminClient();
    const { data, error } = await admin.from(TABLE).insert({
      word_text:   word_text.trim(),
      audio_url:   audio_url   || null,
      image_url,
      topic:       topic?.trim()  || null,
      grade_level: grade_level ? Number(grade_level) : null,
    }).select().single();

    if (error) throw error;
    return NextResponse.json({ pair: data });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'فشل الحفظ' }, { status: 500 });
  }
}

// PUT — update pair by ?id= (teacher/admin)
export async function PUT(request) {
  try {
    const user = await getUser();
    if (!isAuthorized(user)) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });

    const { word_text, audio_url, image_url, topic, grade_level } = await request.json();
    if (!word_text?.trim()) return NextResponse.json({ error: 'الكلمة مطلوبة' }, { status: 400 });

    const admin = createAdminClient();
    const { data, error } = await admin.from(TABLE).update({
      word_text:   word_text.trim(),
      audio_url:   audio_url !== undefined ? (audio_url || null) : undefined,
      image_url:   image_url  || null,
      topic:       topic?.trim()  || null,
      grade_level: grade_level ? Number(grade_level) : null,
    }).eq('id', id).select().single();

    if (error) throw error;
    return NextResponse.json({ pair: data });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'فشل التعديل' }, { status: 500 });
  }
}

// DELETE — remove pair by ?id= (teacher/admin)
export async function DELETE(request) {
  try {
    const user = await getUser();
    if (!isAuthorized(user)) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });

    const admin = createAdminClient();
    const { error } = await admin.from(TABLE).delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'فشل الحذف' }, { status: 500 });
  }
}
