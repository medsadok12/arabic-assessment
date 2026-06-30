import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { createClient }      from '../../../../lib/supabase-server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/*
 * مسار مؤقت — تشغيل لمرة واحدة يدوياً فقط لترحيل صور base64 المتبقية
 * في 4 جداول (syllable_games, lc_category_meta, word_image_matches, team_members)
 * إلى Supabase Storage، بنفس نمط ترحيل letter_catcher_words.
 * يُحذف من الكود فور التأكد من نجاح التشغيل.
 */

const TABLES = [
  { name: 'syllable_games',     prefix: 'word-smash' },
  { name: 'lc_category_meta',   prefix: 'lc-category' },
  { name: 'word_image_matches', prefix: 'word-image-match' },
  { name: 'team_members',       prefix: 'team-members' },
];

const MIME_EXT = {
  'image/jpeg': 'jpeg',
  'image/jpg':  'jpeg',
  'image/png':  'png',
  'image/webp': 'webp',
  'image/gif':  'gif',
};

function parseDataUrl(dataUrl) {
  const m = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl);
  if (!m) return null;
  return { mime: m[1], base64: m[2] };
}

async function migrateTable(admin, table, prefix) {
  const result = { table, total: 0, migrated: 0, failed: 0, bytesBefore: 0, bytesAfter: 0, errors: [] };

  const { data: rows, error } = await admin
    .from(table)
    .select('id, image_url')
    .like('image_url', 'data:image%');

  if (error) {
    result.errors.push({ id: null, error: `فشل القراءة: ${error.message}` });
    return result;
  }

  result.total = rows.length;

  for (const row of rows) {
    try {
      const parsed = parseDataUrl(row.image_url);
      if (!parsed) throw new Error('صيغة data URL غير صالحة');

      const ext    = MIME_EXT[parsed.mime] || 'jpeg';
      const buffer = Buffer.from(parsed.base64, 'base64');
      const path   = `${prefix}/migrated-${row.id}-${Date.now()}.${ext}`;

      const { error: uploadErr } = await admin.storage
        .from('media')
        .upload(path, buffer, { contentType: parsed.mime, upsert: false });
      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = admin.storage.from('media').getPublicUrl(path);

      const { error: updateErr } = await admin
        .from(table)
        .update({ image_url: publicUrl })
        .eq('id', row.id);
      if (updateErr) throw updateErr;

      result.bytesBefore += Buffer.byteLength(row.image_url, 'utf8');
      result.bytesAfter  += Buffer.byteLength(publicUrl, 'utf8');
      result.migrated++;
    } catch (e) {
      result.failed++;
      result.errors.push({ id: row.id, error: e.message || String(e) });
    }
  }

  return result;
}

export async function POST(request) {
  const secret = request.headers.get('x-migration-secret');
  if (!process.env.MIGRATION_SECRET || secret !== process.env.MIGRATION_SECRET) {
    return NextResponse.json({ error: 'غير مخول' }, { status: 403 });
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'super_admin') {
    return NextResponse.json({ error: 'غير مخول' }, { status: 403 });
  }

  const admin = createAdminClient();
  const results = [];
  for (const { name, prefix } of TABLES) {
    results.push(await migrateTable(admin, name, prefix));
  }

  return NextResponse.json({ results });
}
