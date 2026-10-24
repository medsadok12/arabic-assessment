import { NextResponse }      from 'next/server';
import { createClient }      from '../../../lib/supabase-server';
import { createAdminClient } from '../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

// GET — تعديلات الإدارة على الحروف الهجائية (صف لكل حرف مُعدَّل).
// تُجلب حيّة بلا كاش؛ الصفحة تدمجها فوق المحتوى الافتراضي (lib/huroof.js)
// وتبقى على الافتراضي بصمت إن فشل الطلب.
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'غير مخول' }, { status: 401, headers: NO_STORE });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('huroof_letters')
    .select('idx, name, word, emoji, sentence, image_url, letter_audio_url, sentence_audio_url')
    .order('idx');
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE });
  return NextResponse.json({ rows: data || [] }, { headers: NO_STORE });
}
