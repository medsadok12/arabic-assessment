import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { createClient }      from '../../../../lib/supabase-server';
import { getRole } from '../../../../lib/auth-role';
import { storableAudioUrl, healAudioRows } from '../../../../lib/game-audio';
import { LC_GAME_ID, letterCount, normalizeLcSettings } from '../../../../lib/letter-catcher';
import { canonicalLcWord, lcCategoryMatchesWord } from '../../../../lib/letter-catcher-categories';

export const runtime = 'edge';
// المعلم يعدّل الكلمات من لوحة اللعبة، فالقراءة حيّة دائماً (القسم 9.5):
// كاش Vercel لساعة كان يُرجع القائمة القديمة بعد الحفظ فيبدو أن التعديل لم يُسجَّل
export const dynamic = 'force-dynamic';
const NO_STORE = { 'Cache-Control': 'no-store' };

const ARABIC_LETTERS = 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي';
const DIACRITICS     = /[ً-ْٰ]/g;

function buildOptions(correctLetter, total = 5) {
  const stripped = (correctLetter || '').replace(DIACRITICS, '');
  const pool = ARABIC_LETTERS.split('').filter(l => l !== stripped);
  const opts = [stripped];
  while (opts.length < total && pool.length > 0) {
    const i = Math.floor(Math.random() * pool.length);
    opts.push(...pool.splice(i, 1));
  }
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return opts;
}

// GET — returns only words from letter_catcher_words, filtered by query params
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const topic    = searchParams.get('topic')    || '';
    const grade    = Number(searchParams.get('grade')  || 0);
    const minLen   = Number(searchParams.get('minLen') || 0);
    const maxLen   = Number(searchParams.get('maxLen') || 99);
    const category = searchParams.get('category') || '';

    const admin = createAdminClient();
    let query = admin
      .from('letter_catcher_words')
      .select('id, word, missing_letter, options, emoji, image_url, audio_url, topic, grade_level, category')
      .order('id');
    if (grade > 0) query = query.eq('grade_level', grade);

    // إعدادات الجولة (عدد الكلمات والخيارات) تصل مع الكلمات في نفس الطلب
    const [{ data, error }, { data: settingsRow }] = await Promise.all([
      query,
      admin.from('game_settings').select('settings').eq('game_id', LC_GAME_ID).maybeSingle(),
    ]);
    const settings = normalizeLcSettings(settingsRow?.settings);

    if (error || !data) {
      return NextResponse.json({ words: [], settings, source: 'error' }, { headers: NO_STORE });
    }

    await healAudioRows(admin, 'letter_catcher_words', 'letter-catcher', data);

    const valid = data.map(canonicalLcWord).filter(w => {
      if (!w.word || !w.missing_letter) return false;
      if (!Array.isArray(w.options) || w.options.filter(Boolean).length === 0) return false;
      if (topic && !lcCategoryMatchesWord(w, topic)) return false;
      if (category && !lcCategoryMatchesWord(w, category)) return false;
      const len = letterCount(w.word); // الحروف فقط — المسافة بين كلمتين لا تُحسب
      if (minLen > 0 && len < minLen) return false;
      if (maxLen < 99 && len > maxLen) return false;
      return true;
    });

    return NextResponse.json(
      { words: valid, settings, source: 'database' },
      { headers: NO_STORE }
    );
  } catch {
    return NextResponse.json(
      { words: [], settings: normalizeLcSettings(null), source: 'error' },
      { headers: NO_STORE }
    );
  }
}

// POST — add word (admin/teacher only)
export async function POST(request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const role = getRole(user) ?? '';
    if (!user || !['super_admin', 'admin', 'teacher'].includes(role)) {
      return NextResponse.json({ error: 'غير مخول' }, { status: 403 });
    }

    const { word, missing_letter, emoji, image_url, audio_url, topic, grade_level, category } = await request.json();

    if (!word?.trim() || !missing_letter?.trim()) {
      return NextResponse.json({ error: 'الكلمة والحرف الناقص مطلوبان' }, { status: 400 });
    }

    const grouping = canonicalLcWord({ word: word.trim(), missing_letter: missing_letter.trim(), topic: topic?.trim(), category: category?.trim() });
    const options = buildOptions(missing_letter.trim());
    const admin   = createAdminClient();
    const audio   = await storableAudioUrl(admin, 'letter-catcher', audio_url);

    const { data, error } = await admin
      .from('letter_catcher_words')
      .insert({
        word: word.trim(),
        missing_letter: missing_letter.trim(),
        options,
        emoji:       emoji?.trim()       || null,
        image_url:   image_url           || null,
        audio_url:   audio               || null,
        topic:       grouping.topic      || null,
        grade_level: grade_level ? Number(grade_level) : null,
        category:    grouping.category   || null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ word: data });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'فشل الحفظ' }, { status: 500 });
  }
}

// PUT — update word in place (admin/teacher only)
export async function PUT(request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const role = getRole(user) ?? '';
    if (!user || !['super_admin', 'admin', 'teacher'].includes(role)) {
      return NextResponse.json({ error: 'غير مخول' }, { status: 403 });
    }

    const { id, word, missing_letter, emoji, image_url, audio_url, topic, grade_level, category } = await request.json();

    if (!id) return NextResponse.json({ error: 'معرف الكلمة مطلوب' }, { status: 400 });
    if (!word?.trim() || !missing_letter?.trim()) {
      return NextResponse.json({ error: 'الكلمة والحرف الناقص مطلوبان' }, { status: 400 });
    }

    const grouping = canonicalLcWord({ word: word.trim(), missing_letter: missing_letter.trim(), topic: topic?.trim(), category: category?.trim() });
    const options = buildOptions(missing_letter.trim());
    const admin   = createAdminClient();
    const audio   = await storableAudioUrl(admin, 'letter-catcher', audio_url);

    const { data, error } = await admin
      .from('letter_catcher_words')
      .update({
        word: word.trim(),
        missing_letter: missing_letter.trim(),
        options,
        emoji:       emoji?.trim()       || null,
        image_url:   image_url           || null,
        audio_url:   audio               || null,
        topic:       grouping.topic      || null,
        grade_level: grade_level ? Number(grade_level) : null,
        category:    grouping.category   || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ word: data });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'فشل التحديث' }, { status: 500 });
  }
}

// DELETE — admin/teacher only
export async function DELETE(request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const role = getRole(user) ?? '';
    if (!user || !['super_admin', 'admin', 'teacher'].includes(role)) {
      return NextResponse.json({ error: 'غير مخول' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'معرف الكلمة مطلوب' }, { status: 400 });

    const admin = createAdminClient();
    const { error } = await admin.from('letter_catcher_words').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'فشل الحذف' }, { status: 500 });
  }
}

