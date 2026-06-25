import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { createClient }      from '../../../../lib/supabase-server';

// Cache GET responses at Vercel's CDN for 5 minutes, serve stale for 10 more
export const revalidate = 300;

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
    let query = admin.from('letter_catcher_words').select('*').order('id');
    if (topic)    query = query.eq('topic', topic);
    if (grade > 0) query = query.eq('grade_level', grade);
    if (category) query = query.eq('category', category);

    const { data, error } = await query;

    if (error || !data) {
      return NextResponse.json({ words: [], source: 'error' });
    }

    const valid = data.filter(w => {
      if (!w.word || !w.missing_letter) return false;
      if (!Array.isArray(w.options) || w.options.filter(Boolean).length === 0) return false;
      const len = w.word.replace(DIACRITICS, '').length;
      if (minLen > 0 && len < minLen) return false;
      if (maxLen < 99 && len > maxLen) return false;
      return true;
    });

    const words = valid.length > 0 ? valid : FALLBACK_WORDS;
    return NextResponse.json(
      { words, source: valid.length > 0 ? 'database' : 'fallback' },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    );
  } catch {
    return NextResponse.json(
      { words: FALLBACK_WORDS, source: 'fallback' },
      { headers: { 'Cache-Control': 'public, s-maxage=60' } }
    );
  }
}

// Built-in fallback words so the game starts instantly even if DB is empty or slow
const FALLBACK_WORDS = [
  { id: 'f1', word: 'قِطَّة', missing_letter: 'ق', options: ['ق','ك','ع','ج','ح'], emoji: '🐱', topic: 'الحيوانات', grade_level: 1, category: null },
  { id: 'f2', word: 'كَلْب', missing_letter: 'ك', options: ['ك','ق','ع','ت','ب'], emoji: '🐶', topic: 'الحيوانات', grade_level: 1, category: null },
  { id: 'f3', word: 'بَيْت', missing_letter: 'ب', options: ['ب','ت','ن','م','ف'], emoji: '🏠', topic: 'الأسرة', grade_level: 1, category: null },
  { id: 'f4', word: 'شَمْس', missing_letter: 'ش', options: ['ش','س','ص','ض','ط'], emoji: '☀️', topic: 'الطقس', grade_level: 1, category: null },
  { id: 'f5', word: 'تُفَّاح', missing_letter: 'ت', options: ['ت','ث','ب','ن','م'], emoji: '🍎', topic: 'الفواكه', grade_level: 1, category: null },
  { id: 'f6', word: 'مَدْرَسَة', missing_letter: 'م', options: ['م','ن','ه','ل','و'], emoji: '🏫', topic: 'المدرسة', grade_level: 2, category: null },
  { id: 'f7', word: 'كِتَاب', missing_letter: 'ك', options: ['ك','ق','ع','ج','ح'], emoji: '📚', topic: 'المدرسة', grade_level: 2, category: null },
  { id: 'f8', word: 'أَسَد', missing_letter: 'أ', options: ['أ','ع','ه','ح','خ'], emoji: '🦁', topic: 'الحيوانات', grade_level: 1, category: null },
  { id: 'f9', word: 'زَهْرَة', missing_letter: 'ز', options: ['ز','ذ','ر','د','س'], emoji: '🌸', topic: 'الأشكال', grade_level: 2, category: null },
  { id: 'f10', word: 'سَمَكَة', missing_letter: 'س', options: ['س','ش','ص','ز','ط'], emoji: '🐟', topic: 'الحيوانات', grade_level: 1, category: null },
];

// POST — add word (admin/teacher only)
export async function POST(request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const role = user?.user_metadata?.role ?? '';
    if (!user || !['super_admin', 'admin', 'teacher'].includes(role)) {
      return NextResponse.json({ error: 'غير مخول' }, { status: 403 });
    }

    const { word, missing_letter, emoji, image_url, audio_url, topic, grade_level, category } = await request.json();

    if (!word?.trim() || !missing_letter?.trim()) {
      return NextResponse.json({ error: 'الكلمة والحرف الناقص مطلوبان' }, { status: 400 });
    }

    const options = buildOptions(missing_letter.trim());
    const admin   = createAdminClient();

    const { data, error } = await admin
      .from('letter_catcher_words')
      .insert({
        word: word.trim(),
        missing_letter: missing_letter.trim(),
        options,
        emoji:       emoji?.trim()       || null,
        image_url:   image_url           || null,
        audio_url:   audio_url           || null,
        topic:       topic?.trim()       || null,
        grade_level: grade_level ? Number(grade_level) : null,
        category:    category?.trim()    || null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ word: data });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'فشل الحفظ' }, { status: 500 });
  }
}

// DELETE — admin/teacher only
export async function DELETE(request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const role = user?.user_metadata?.role ?? '';
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
