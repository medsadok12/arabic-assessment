import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';

export async function GET(_req, { params }) {
  const { id } = params;

  const supabase = createAdminClient();
  const { data: word, error } = await supabase
    .from('lexicon_words')
    .select('image_base64')
    .eq('id', id)
    .single();

  if (error || !word?.image_base64) {
    return new NextResponse(null, { status: 404 });
  }

  const raw = word.image_base64;
  let mimeType = 'image/jpeg';
  let base64Data = raw;

  if (raw.startsWith('data:')) {
    const commaIdx = raw.indexOf(',');
    const header   = raw.slice(0, commaIdx);
    base64Data     = raw.slice(commaIdx + 1);
    mimeType       = header.match(/data:([^;]+)/)?.[1] ?? 'image/jpeg';
  }

  const buffer = Buffer.from(base64Data, 'base64');

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': mimeType,
      // مخزّنة في الـ edge لمدة يوم — تتجدد تلقائياً عند تغيير الصورة
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
    },
  });
}
