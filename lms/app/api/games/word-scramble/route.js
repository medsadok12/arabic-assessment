import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { createClient }      from '../../../../lib/supabase-server';
import { getRole } from '../../../../lib/auth-role';

const DIACRITICS = /[ً-ٰٟ]/g;
const TABLE      = 'word_scramble_words';
const ROLES      = ['super_admin', 'admin', 'teacher'];

async function getUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
function isAuthorized(user) {
  return ROLES.includes(getRole(user) ?? '');
}

// GET — public, with optional filters
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const topic  = searchParams.get('topic') || '';
    const grade  = Number(searchParams.get('grade')  || 0);
    const minLen = Number(searchParams.get('minLen') || 0);
    const maxLen = Number(searchParams.get('maxLen') || 99);

    const admin = createAdminClient();
    let query = admin.from(TABLE).select('*').order('created_at', { ascending: false });
    if (topic)    query = query.eq('topic', topic);
    if (grade > 0) query = query.eq('grade_level', grade);

    const { data, error } = await query;
    if (error || !data) return NextResponse.json({ words: [], source: 'error' });

    const valid = data.filter(w => {
      if (!w.word) return false;
      const len = w.word.replace(DIACRITICS, '').length;
      if (minLen > 0 && len < minLen) return false;
      if (maxLen < 99 && len > maxLen) return false;
      return true;
    });

    return NextResponse.json({ words: valid, source: 'database' });
  } catch {
    return NextResponse.json({ words: [], source: 'error' });
  }
}

// POST — create word (teacher/admin)
export async function POST(request) {
  try {
    const user = await getUser();
    if (!isAuthorized(user)) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

    const { word, emoji, image_url, audio_url, topic, grade_level } = await request.json();
    if (!word?.trim()) return NextResponse.json({ error: 'الكلمة مطلوبة' }, { status: 400 });

    const admin = createAdminClient();
    const { data, error } = await admin.from(TABLE).insert({
      word:        word.trim(),
      emoji:       emoji?.trim()       || null,
      image_url:   image_url           || null,
      audio_url:   audio_url           || null,
      topic:       topic?.trim()       || null,
      grade_level: grade_level ? Number(grade_level) : null,
    }).select().single();

    if (error) throw error;
    return NextResponse.json({ word: data });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'فشل الحفظ' }, { status: 500 });
  }
}

// PUT — update word (teacher/admin)
export async function PUT(request) {
  try {
    const user = await getUser();
    if (!isAuthorized(user)) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });

    const { word, emoji, image_url, audio_url, topic, grade_level } = await request.json();
    if (!word?.trim()) return NextResponse.json({ error: 'الكلمة مطلوبة' }, { status: 400 });

    const admin = createAdminClient();
    const { data, error } = await admin.from(TABLE).update({
      word:        word.trim(),
      emoji:       emoji?.trim()       || null,
      image_url:   image_url           || null,
      audio_url:   audio_url           || null,
      topic:       topic?.trim()       || null,
      grade_level: grade_level ? Number(grade_level) : null,
    }).eq('id', id).select().single();

    if (error) throw error;
    return NextResponse.json({ word: data });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'فشل التعديل' }, { status: 500 });
  }
}

// DELETE — remove word (teacher/admin)
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
