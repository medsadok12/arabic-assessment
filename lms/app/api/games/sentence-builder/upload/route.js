import { randomUUID } from 'crypto';
import { createAdminClient } from '../../../../../lib/supabase-admin';
const SCRABBLE_MEDIA = 'sentence-builder/';
import { mediaPublicUrl, normalizeStoryAudioType, STORY_AUDIO_TYPES } from '../../../../../lib/story-audio';
import { sentenceJson as json, sentenceUser } from '../../../../../lib/sentence-builder-server';
export const dynamic = 'force-dynamic';
export async function POST(req) {
  const auth = await sentenceUser(true);
  if (auth.error) return auth.error;
  try {
    if (Number(req.headers.get('content-length')) > 3500000) return json({ error: 'الحد الأقصى للملف 3MB' }, 413);
    const form = await req.formData();
    const file = form.get('file');
    const kind = form.get('kind');
    if (!file || typeof file.arrayBuffer !== 'function' || !file.size || file.size > 3 * 1024 * 1024) return json({ error: 'اختر ملفًا أقل من 3MB' }, 400);
    const types = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
    const type = kind === 'audio' ? normalizeStoryAudioType(file.type, file.name) : file.type;
    const ext = kind === 'audio' ? STORY_AUDIO_TYPES[type] : kind === 'image' ? types[type] : null;
    if (!ext) return json({ error: 'ارفع صورة PNG/JPG/WEBP أو ملفًا صوتيًا مدعومًا' }, 400);
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (kind === 'image') {
      const png = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
      const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
      const webp = String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
      if (!(type === 'image/png' && png || type === 'image/jpeg' && jpg || type === 'image/webp' && webp)) return json({ error: 'محتوى الملف لا يطابق نوع الصورة' }, 400);
    }
    const path = `${SCRABBLE_MEDIA}${kind}/${randomUUID()}.${ext}`;
    const { error } = await createAdminClient().storage.from('media').upload(path, bytes, { contentType: type, upsert: false });
    if (error) throw error;
    return json({ url: mediaPublicUrl(path) });
  } catch { return json({ error: 'تعذّر رفع الملف. جرّب ملفًا أصغر.' }, 500); }
}
