import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { createClient }      from '../../../../lib/supabase-server';
import { getRole } from '../../../../lib/auth-role';
import { storableAudioUrl, healAudioRows } from '../../../../lib/game-audio';

// المعلم يعدّل المحتوى من لوحة اللعبة، فالقراءة حيّة دائماً (القسم 9.5):
// كاش Vercel لساعة كان يُرجع القائمة القديمة بعد الحفظ فيبدو أن التعديل لم يُسجَّل
export const dynamic = 'force-dynamic';
const NO_STORE = { 'Cache-Control': 'no-store' };

async function checkAuth() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = getRole(user) ?? '';
  return { user, role, allowed: ['super_admin', 'admin', 'teacher'].includes(role) };
}

function isValid(r) {
  return r.target_text && r.correct_option && r.rule_text;
}

// GET — public
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const topic = searchParams.get('topic') || '';
    const grade = Number(searchParams.get('grade') || 0);

    const admin = createAdminClient();
    let query = admin.from('vowel_balloon_games').select('*').order('created_at', { ascending: false });
    if (topic)    query = query.eq('topic', topic);
    if (grade > 0) query = query.eq('grade_level', grade);

    const { data, error } = await query;
    if (error || !data) return NextResponse.json({ items: [], source: 'error' }, { headers: NO_STORE });

    await healAudioRows(admin, 'vowel_balloon_games', 'vowel-balloon', data);

    return NextResponse.json(
      { items: data.filter(isValid), source: 'database' },
      { headers: NO_STORE }
    );
  } catch {
    return NextResponse.json({ items: [], source: 'error' }, { headers: NO_STORE });
  }
}

// POST — add (admin/teacher only)
export async function POST(request) {
  try {
    const { user, allowed } = await checkAuth();
    if (!user || !allowed) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

    const { target_text, correct_option, wrong_option_1, wrong_option_2, audio_url, rule_text, topic, grade_level } = await request.json();

    if (!target_text?.trim())
      return NextResponse.json({ error: 'الصوت أو المقطع المستهدف مطلوب' }, { status: 400 });
    if (!correct_option?.trim())
      return NextResponse.json({ error: 'الخيار الصحيح مطلوب' }, { status: 400 });
    if (!rule_text?.trim())
      return NextResponse.json({ error: 'نص القاعدة مطلوب' }, { status: 400 });

    const admin = createAdminClient();
    const audio = await storableAudioUrl(admin, 'vowel-balloon', audio_url);
    const { data, error } = await admin
      .from('vowel_balloon_games')
      .insert({
        target_text:    target_text.trim(),
        correct_option: correct_option.trim(),
        wrong_option_1: wrong_option_1?.trim() || null,
        wrong_option_2: wrong_option_2?.trim() || null,
        audio_url:      audio || null,
        rule_text:      rule_text.trim(),
        topic:          topic?.trim() || null,
        grade_level:    grade_level ? Number(grade_level) : null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ item: data });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'فشل الحفظ' }, { status: 500 });
  }
}

// PUT — edit (admin/teacher only)
export async function PUT(request) {
  try {
    const { user, allowed } = await checkAuth();
    if (!user || !allowed) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'المعرّف مطلوب' }, { status: 400 });

    const { target_text, correct_option, wrong_option_1, wrong_option_2, audio_url, rule_text, topic, grade_level } = await request.json();

    const admin = createAdminClient();
    const audio = await storableAudioUrl(admin, 'vowel-balloon', audio_url);
    const { data, error } = await admin
      .from('vowel_balloon_games')
      .update({
        target_text:    target_text?.trim(),
        correct_option: correct_option?.trim(),
        wrong_option_1: wrong_option_1?.trim() || null,
        wrong_option_2: wrong_option_2?.trim() || null,
        audio_url:      audio ?? null,
        rule_text:      rule_text?.trim(),
        topic:          topic?.trim() || null,
        grade_level:    grade_level ? Number(grade_level) : null,
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
    const { error } = await admin.from('vowel_balloon_games').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'فشل الحذف' }, { status: 500 });
  }
}
