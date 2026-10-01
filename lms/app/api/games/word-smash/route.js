import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { createClient }      from '../../../../lib/supabase-server';
import { getRole } from '../../../../lib/auth-role';

async function checkAuth() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = getRole(user) ?? '';
  return { user, role, allowed: ['super_admin', 'admin', 'teacher'].includes(role) };
}

function isValid(w) {
  return (
    w.word_text &&
    Array.isArray(w.correct_segments) && w.correct_segments.length > 0 &&
    Array.isArray(w.wrong_options)    && w.wrong_options.length >= 2 &&
    w.rule_text
  );
}

// GET — public, returns syllable_games rows
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const topic = searchParams.get('topic') || '';
    const grade = Number(searchParams.get('grade') || 0);

    const admin = createAdminClient();
    let query = admin.from('syllable_games').select('*').order('created_at', { ascending: false });
    if (topic)    query = query.eq('topic', topic);
    if (grade > 0) query = query.eq('grade_level', grade);

    const { data, error } = await query;
    if (error || !data) return NextResponse.json({ words: [], source: 'error' });

    return NextResponse.json(
      { words: data.filter(isValid), source: 'database' },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } }
    );
  } catch {
    return NextResponse.json({ words: [], source: 'error' });
  }
}

// POST — add word (admin/teacher only)
export async function POST(request) {
  try {
    const { user, allowed } = await checkAuth();
    if (!user || !allowed) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

    const { word_text, correct_segments, wrong_options, rule_text, topic, grade_level, image_url } = await request.json();

    if (!word_text?.trim())
      return NextResponse.json({ error: 'الكلمة مطلوبة' }, { status: 400 });
    if (!Array.isArray(correct_segments) || correct_segments.length === 0)
      return NextResponse.json({ error: 'المقاطع الصحيحة مطلوبة' }, { status: 400 });
    if (!Array.isArray(wrong_options) || wrong_options.length < 2)
      return NextResponse.json({ error: 'خياران خاطئان مطلوبان على الأقل' }, { status: 400 });
    if (!rule_text?.trim())
      return NextResponse.json({ error: 'نص القاعدة مطلوب' }, { status: 400 });

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('syllable_games')
      .insert({
        word_text:        word_text.trim(),
        correct_segments,
        wrong_options,
        rule_text:        rule_text.trim(),
        topic:            topic?.trim() || null,
        grade_level:      grade_level ? Number(grade_level) : null,
        image_url:        image_url || null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ word: data });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'فشل الحفظ' }, { status: 500 });
  }
}

// PUT — edit word (admin/teacher only)
export async function PUT(request) {
  try {
    const { user, allowed } = await checkAuth();
    if (!user || !allowed) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'المعرّف مطلوب' }, { status: 400 });

    const { word_text, correct_segments, wrong_options, rule_text, topic, grade_level, image_url } = await request.json();

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('syllable_games')
      .update({
        word_text:        word_text?.trim(),
        correct_segments,
        wrong_options,
        rule_text:        rule_text?.trim(),
        topic:            topic?.trim() || null,
        grade_level:      grade_level ? Number(grade_level) : null,
        image_url:        image_url ?? null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ word: data });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'فشل التعديل' }, { status: 500 });
  }
}

// DELETE — admin/teacher only
export async function DELETE(request) {
  try {
    const { user, allowed } = await checkAuth();
    if (!user || !allowed) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'معرّف الكلمة مطلوب' }, { status: 400 });

    const admin = createAdminClient();
    const { error } = await admin.from('syllable_games').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'فشل الحذف' }, { status: 500 });
  }
}
