import { createAdminClient } from '../../../../../lib/supabase-admin';
import {
  json, requireWwStaff, isMissingSchema, schemaResponse, WORD_COLUMNS, isWordMediaUrl, removeWordMedia,
} from '../../../../../lib/word-wheel-server';
import { sanitizeWordInput } from '../../../../../lib/word-wheel';

export const dynamic = 'force-dynamic';

// PUT — تعديل بطاقة كلمة (الصورة، النطق، التشكيل، الشرح، التلميح…)
export async function PUT(req, { params }) {
  const { user, error: denied } = await requireWwStaff();
  if (denied) return denied;
  try {
    const { data, error: invalid } = sanitizeWordInput(await req.json().catch(() => null), isWordMediaUrl, { partial: true });
    if (invalid) return json({ error: invalid }, 400);
    const admin = createAdminClient();
    const { data: cur, error: curErr } = await admin.from('word_wheel_words').select('word, image_url, audio_url').eq('id', params.id).maybeSingle();
    if (curErr) return isMissingSchema(curErr) ? schemaResponse() : json({ error: curErr.message }, 500);
    if (!cur) return json({ error: 'الكلمة غير موجودة' }, 404);
    if (data.vocalized && !data.word) {
      // التشكيل يُطابَق مع الكلمة المحفوظة إن لم تُرسل معه
      const again = sanitizeWordInput({ word: cur.word, vocalized: data.vocalized }, isWordMediaUrl, { partial: true });
      if (again.error) return json({ error: again.error }, 400);
    }
    const { data: row, error } = await admin
      .from('word_wheel_words')
      .update({ ...data, updated_by: user.id, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select(WORD_COLUMNS)
      .maybeSingle();
    if (error) {
      if (error.code === '23505') return json({ error: `«${data.word}» موجودة في بنك الكلمات بالفعل` }, 409);
      return isMissingSchema(error) ? schemaResponse() : json({ error: error.message }, 500);
    }
    if (!row) return json({ error: 'الكلمة غير موجودة' }, 404);
    // الصورة/الصوت المستبدَل أو المُزال يُحذف من التخزين
    const dropped = ['image_url', 'audio_url'].filter(k => data[k] !== undefined && cur[k] && cur[k] !== row[k]).map(k => cur[k]);
    if (dropped.length) await removeWordMedia(admin, dropped);
    return json({ word: row });
  } catch (e) {
    return json({ error: e.message || 'تعذّر حفظ الكلمة' }, 500);
  }
}

// DELETE — حذف بطاقة الكلمة (تبقى الكلمة في عجلاتها، وتظهر بطاقتها مختصرة)
export async function DELETE(req, { params }) {
  const { error: denied } = await requireWwStaff();
  if (denied) return denied;
  try {
    const admin = createAdminClient();
    const { data: rows, error } = await admin.from('word_wheel_words').delete().eq('id', params.id).select('image_url, audio_url');
    if (error) return json({ error: error.message }, 500);
    const files = (rows || []).flatMap(r => [r.image_url, r.audio_url]).filter(Boolean);
    if (files.length) await removeWordMedia(admin, files);
    return json({ ok: true });
  } catch (e) {
    return json({ error: e.message || 'تعذّر حذف الكلمة' }, 500);
  }
}
