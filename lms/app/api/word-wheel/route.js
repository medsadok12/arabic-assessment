import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../lib/supabase-admin';
import { DEFAULT_CATALOG } from './catalog/route';

export const dynamic = 'force-dynamic';

const LEVELS = [
  { id:1, label:'مبتدئ',  icon:'🟢', desc:'حروف شائعة — 120 ثانية' },
  { id:2, label:'متوسط',  icon:'🟡', desc:'حروف أصعب — 90 ثانية'  },
  { id:3, label:'متقدم',  icon:'🟠', desc:'حروف نادرة — 75 ثانية' },
  { id:4, label:'أسطوري', icon:'🔴', desc:'التحدي الأقصى — 60 ثانية' },
];

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const level = Math.min(4, Math.max(1, parseInt(searchParams.get('level') || '1')));
  const idx   = Math.max(0, parseInt(searchParams.get('index') || '0'));

  const wheels = DEFAULT_CATALOG.filter(w => w.level === level);
  const wheel  = wheels[idx % wheels.length];

  // Merge with Supabase override if available
  let validWords = wheel.valid_words || [];
  let time       = wheel.time;
  let center     = wheel.center;
  let letters    = wheel.letters;

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from('word_wheel_catalog')
      .select('valid_words, time_seconds, center_letter, outer_letters')
      .eq('level', level)
      .eq('wheel_index', idx % wheels.length)
      .maybeSingle();

    if (data) {
      if (data.valid_words?.length)   validWords = data.valid_words;
      if (data.time_seconds)          time       = data.time_seconds;
      if (data.center_letter)         center     = data.center_letter;
      if (data.outer_letters?.length) letters    = data.outer_letters;
    }
  } catch { /* fall back to defaults */ }

  return NextResponse.json({
    level, index: idx % wheels.length, total: wheels.length,
    center, letters, time, valid_words: validWords, levels: LEVELS,
  });
}
