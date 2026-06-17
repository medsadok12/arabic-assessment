import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { createClient }      from '../../../../lib/supabase-server';

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

    return NextResponse.json({ words: valid, source: 'database' });
  } catch {
    return NextResponse.json({ words: [], source: 'error' });
  }
}

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
