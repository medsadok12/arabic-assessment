import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { createClient }      from '../../../../lib/supabase-server';

async function checkAuth() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = user?.user_metadata?.role ?? '';
  return { user, role, allowed: ['super_admin', 'admin', 'teacher'].includes(role) };
}

function isValid(r) {
  return r.base_letter && r.correct_vowel && r.rule_text;
}

// GET — public, returns vowel_balloons rows
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const topic = searchParams.get('topic') || '';
    const grade = Number(searchParams.get('grade') || 0);

    const admin = createAdminClient();
    let query = admin.from('vowel_balloons').select('*').order('created_at', { ascending: false });
    if (topic)    query = query.eq('topic', topic);
    if (grade > 0) query = query.eq('grade_level', grade);

    const { data, error } = await query;
    if (error || !data) return NextResponse.json({ items: [], source: 'error' });

    return NextResponse.json({ items: data.filter(isValid), source: 'database' });
  } catch {
    return NextResponse.json({ items: [], source: 'error' });
  }
}

// POST — add item (admin/teacher only)
export async function POST(request) {
  try {
    const { user, allowed } = await checkAuth();
    if (!user || !allowed) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

    const { base_letter, correct_vowel, audio_url, rule_text, topic, grade_level } = await request.json();

    if (!base_letter?.trim())
      return NextResponse.json({ error: 'الحرف مطلوب' }, { status: 400 });
    if (!['fatha', 'kasra', 'damma'].includes(correct_vowel))
      return NextResponse.json({ error: 'الحركة الصحيحة مطلوبة' }, { status: 400 });
    if (!rule_text?.trim())
      return NextResponse.json({ error: 'نص القاعدة مطلوب' }, { status: 400 });

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('vowel_balloons')
      .insert({
        base_letter:   base_letter.trim(),
        correct_vowel,
        audio_url:     audio_url || null,
        rule_text:     rule_text.trim(),
        topic:         topic?.trim() || null,
        grade_level:   grade_level ? Number(grade_level) : null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ item: data });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'فشل الحفظ' }, { status: 500 });
  }
}

// PUT — edit item (admin/teacher only)
export async function PUT(request) {
  try {
    const { user, allowed } = await checkAuth();
    if (!user || !allowed) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'المعرّف مطلوب' }, { status: 400 });

    const { base_letter, correct_vowel, audio_url, rule_text, topic, grade_level } = await request.json();

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('vowel_balloons')
      .update({
        base_letter:   base_letter?.trim(),
        correct_vowel,
        audio_url:     audio_url ?? null,
        rule_text:     rule_text?.trim(),
        topic:         topic?.trim() || null,
        grade_level:   grade_level ? Number(grade_level) : null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ item: data });
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
    if (!id) return NextResponse.json({ error: 'معرّف العنصر مطلوب' }, { status: 400 });

    const admin = createAdminClient();
    const { error } = await admin.from('vowel_balloons').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'فشل الحذف' }, { status: 500 });
  }
}
