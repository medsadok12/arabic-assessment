import { NextResponse }       from 'next/server';
import { createClient }      from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { getRole }           from '../../../../lib/auth-role';
import {
  STORY_AUDIO_BUCKET, STORY_AUDIO_PREFIX, STORY_AUDIO_TYPES,
  normalizeStoryAudioType, storyAudioPublicUrl,
} from '../../../../lib/story-audio';

export const dynamic = 'force-dynamic';

const ALLOWED = ['teacher', 'admin', 'super_admin'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST — رابط رفع موقَّع لصوت قراءة قصة: المتصفح يرفع الملف مباشرة إلى
// Supabase Storage (بلا مرور بدالة Vercel وحدّها 4.5MB)، ثم يحفظ الرابط
// العام عبر PUT /api/stories/[id] { audio_url }.
export async function POST(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ALLOWED.includes(getRole(user) ?? ''))
    return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  let body;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 }); }

  const { storyId, type, fileName } = body || {};
  if (!UUID_RE.test(String(storyId || '')))
    return NextResponse.json({ error: 'معرّف القصة غير صالح' }, { status: 400 });

  const contentType = normalizeStoryAudioType(type, fileName);
  if (!contentType)
    return NextResponse.json({ error: 'نوع الملف غير مدعوم — استخدم MP3 أو M4A أو WAV أو WEBM أو OGG' }, { status: 400 });

  const ext  = STORY_AUDIO_TYPES[contentType];
  const path = `${STORY_AUDIO_PREFIX}${storyId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(STORY_AUDIO_BUCKET).createSignedUploadUrl(path);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    signedUrl:  data.signedUrl,
    publicUrl:  storyAudioPublicUrl(path),
    contentType,
  });
}
