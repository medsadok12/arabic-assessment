import { NextResponse } from 'next/server';
import { createClient }      from '../../../../../lib/supabase-server';
import { createAdminClient } from '../../../../../lib/supabase-admin';

// GET — single word with media, for expanded card view
export async function GET(req, { params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول أولاً' }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('lexicon_words')
    .select('id, image_base64, audio_base64')
    .eq('id', params.id)
    .single();

  if (error || !data) return NextResponse.json({ image: null, audio: null });
  return NextResponse.json({ image: data.image_base64 ?? null, audio: data.audio_base64 ?? null });
}
