import { NextResponse }      from 'next/server';
import { createClient }      from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { getRole }           from '../../../../lib/auth-role';
import { STORY_AUDIO_TYPES, normalizeStoryAudioType, mediaPublicUrl } from '../../../../lib/story-audio';
import {
  HUROOF_BUCKET, HUROOF_COUNT, HUROOF_IMAGE_TYPES, HUROOF_PREFIX, HUROOF_UPLOAD_KINDS,
} from '../../../../lib/huroof';

export const dynamic = 'force-dynamic';

const ALLOWED = ['teacher', 'admin', 'super_admin'];

// POST — رابط رفع موقَّع لصورة حرف أو صوته: المتصفح يرفع الملف مباشرة إلى
// Supabase Storage، ثم يُحفظ الرابط العام مع الحرف عبر PUT /api/huroof/[idx].
export async function POST(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ALLOWED.includes(getRole(user) ?? ''))
    return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  let body;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 }); }

  const { idx, kind, type, fileName } = body || {};
  if (!Number.isInteger(idx) || idx < 0 || idx >= HUROOF_COUNT)
    return NextResponse.json({ error: 'حرف غير موجود' }, { status: 400 });
  if (!HUROOF_UPLOAD_KINDS[kind])
    return NextResponse.json({ error: 'نوع الرفع غير معروف' }, { status: 400 });

  let contentType, ext;
  if (kind === 'image') {
    contentType = String(type || '').split(';')[0].trim().toLowerCase();
    ext = HUROOF_IMAGE_TYPES[contentType];
    if (!ext) return NextResponse.json({ error: 'الصورة يجب أن تكون WEBP أو JPG أو PNG' }, { status: 400 });
  } else {
    contentType = normalizeStoryAudioType(type, fileName);
    if (!contentType)
      return NextResponse.json({ error: 'نوع الملف غير مدعوم — استخدم MP3 أو M4A أو WAV أو WEBM أو OGG' }, { status: 400 });
    ext = STORY_AUDIO_TYPES[contentType];
  }

  const path = `${HUROOF_PREFIX}${idx + 1}-${HUROOF_UPLOAD_KINDS[kind]}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(HUROOF_BUCKET).createSignedUploadUrl(path);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ signedUrl: data.signedUrl, publicUrl: mediaPublicUrl(path), contentType });
}
