import { createAdminClient } from '../../../../lib/supabase-admin';
import {
  json, requireWwStaff, isMissingSchema, schemaResponse, WORD_COLUMNS, isWordMediaUrl,
} from '../../../../lib/word-wheel-server';
import { sanitizeWordInput } from '../../../../lib/word-wheel';

export const dynamic = 'force-dynamic';

// GET — بنك الكلمات كاملاً (بطاقات التعلّم) للوحة الإدارة
export async function GET() {
  const { error: denied } = await requireWwStaff();
  if (denied) return denied;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from('word_wheel_words').select(WORD_COLUMNS).order('word');
    if (error) return isMissingSchema(error) ? schemaResponse() : json({ error: error.message }, 500);
    return json({ words: data || [] });
  } catch (e) {
    return json({ error: e.message || 'تعذّر تحميل بنك الكلمات' }, 500);
  }
}

// POST — بطاقة كلمة جديدة
export async function POST(req) {
  const { user, error: denied } = await requireWwStaff();
  if (denied) return denied;
  try {
    const { data, error: invalid } = sanitizeWordInput(await req.json().catch(() => null), isWordMediaUrl);
    if (invalid) return json({ error: invalid }, 400);
    const admin = createAdminClient();
    const { data: row, error } = await admin
      .from('word_wheel_words')
      .insert({ ...data, updated_by: user.id, updated_at: new Date().toISOString() })
      .select(WORD_COLUMNS)
      .single();
    if (error) {
      if (error.code === '23505') return json({ error: `«${data.word}» موجودة في بنك الكلمات — عدّل بطاقتها من القائمة` }, 409);
      return isMissingSchema(error) ? schemaResponse() : json({ error: error.message }, 500);
    }
    return json({ word: row });
  } catch (e) {
    return json({ error: e.message || 'تعذّر حفظ الكلمة' }, 500);
  }
}
