import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/*
 * مسار مؤقت — تشغيل لمرة واحدة فقط ثم يُحذف فوراً.
 * يرحّل صور base64 في 4 جداول إلى Supabase Storage.
 */

const ONE_TIME_TOKEN = 'mig-4tbl-2026-dc5x1i-9f3c8a2e74b1';

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
  return { mime: m[1].toLowerCase(), base64: m[2] };
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

  result.total = rows?.length ?? 0;

  for (const row of (rows ?? [])) {
    try {
      const parsed = parseDataUrl(row.image_url);
      if (!parsed) throw new Error('صيغة data URL غير صالحة');

      const ext    = MIME_EXT[parsed.mime] || 'jpeg';
      const buffer = Buffer.from(parsed.base64, 'base64');
      const path   = `${prefix}/migrated-${row.id}-${Date.now()}.${ext}`;

      await admin.storage.createBucket('media', { public: true }).catch(() => {});

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

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('token') !== ONE_TIME_TOKEN) {
    return NextResponse.json({ error: 'غير مخول' }, { status: 403 });
  }

  const admin = createAdminClient();
  const results = [];
  for (const { name, prefix } of TABLES) {
    results.push(await migrateTable(admin, name, prefix));
  }

  const totalBefore  = results.reduce((s, r) => s + r.bytesBefore, 0);
  const totalAfter   = results.reduce((s, r) => s + r.bytesAfter,  0);
  const totalRows    = results.reduce((s, r) => s + r.total,       0);
  const totalMig     = results.reduce((s, r) => s + r.migrated,    0);
  const totalFailed  = results.reduce((s, r) => s + r.failed,      0);

  return NextResponse.json({
    summary: { totalRows, totalMigrated: totalMig, totalFailed, totalBytesBefore: totalBefore, totalBytesAfter: totalAfter },
    results,
  });
}
