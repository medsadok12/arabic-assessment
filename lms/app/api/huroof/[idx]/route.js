import { NextResponse }      from 'next/server';
import { createClient }      from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { getRole }           from '../../../../lib/auth-role';
import {
  HUROOF_BUCKET, HUROOF_COUNT, HUROOF_LIST_FIELDS, HUROOF_MEDIA_FIELDS, HUROOF_TEXT_FIELDS,
  huroofMediaPathFromUrl, sanitizeHuroofPatch,
} from '../../../../lib/huroof';
import { HUROOF_SELECT } from '../../../../lib/huroof-server';

const ALL_FIELDS = [...HUROOF_TEXT_FIELDS, ...HUROOF_MEDIA_FIELDS, ...HUROOF_LIST_FIELDS];

export const dynamic = 'force-dynamic';

const ALLOWED = ['teacher', 'admin', 'super_admin'];

async function getStaff() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user && ALLOWED.includes(getRole(user) ?? '') ? user : null;
}

function parseIdx(raw) {
  const idx = Number(raw);
  return Number.isInteger(idx) && idx >= 0 && idx < HUROOF_COUNT ? idx : null;
}

// يحذف من التخزين ملفات الحرف التي لم تعد مستخدمة (استبدال/إزالة/إعادة الافتراضي)
async function removeFiles(admin, urls) {
  const paths = urls.map(huroofMediaPathFromUrl).filter(Boolean);
  if (!paths.length) return;
  try { await admin.storage.from(HUROOF_BUCKET).remove(paths); } catch {}
}

// PUT — حفظ تعديل حرف (نص/صورة/أصوات/لغز فهيم/الإجابة وقواعد الإملاء) — معلم أو مدير
export async function PUT(req, { params }) {
  const user = await getStaff();
  if (!user) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });
  const idx = parseIdx(params.idx);
  if (idx === null) return NextResponse.json({ error: 'حرف غير موجود' }, { status: 400 });

  let body;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 }); }
  const { fields, error: badInput } = sanitizeHuroofPatch(idx, body);
  if (badInput) return NextResponse.json({ error: badInput }, { status: 400 });

  try {
    const admin = createAdminClient();
    const { data: current } = await admin.from('huroof_letters').select('*').eq('idx', idx).maybeSingle();
    const next = { ...(current || {}), ...fields, idx };

    const hasAnything = ALL_FIELDS.some(f => (HUROOF_LIST_FIELDS.includes(f) ? Array.isArray(next[f]) : next[f]));
    let row = null;
    if (hasAnything) {
      const { data, error } = await admin
        .from('huroof_letters')
        .upsert({
          idx,
          ...Object.fromEntries(ALL_FIELDS.map(f => [f, next[f] ?? null])),
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        }, { onConflict: 'idx' })
        .select(HUROOF_SELECT)
        .single();
      if (error) throw error;
      row = data;
    } else if (current) {
      // كل الحقول عادت للافتراضي — لا داعي لصف
      const { error } = await admin.from('huroof_letters').delete().eq('idx', idx);
      if (error) throw error;
    }

    const dropped = HUROOF_MEDIA_FIELDS
      .map(f => current?.[f])
      .filter(u => u && !HUROOF_MEDIA_FIELDS.some(f => next[f] === u));
    if (dropped.length) await removeFiles(admin, dropped);

    return NextResponse.json({ row });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'تعذّر الحفظ' }, { status: 500 });
  }
}

// DELETE — إعادة الحرف لمحتواه الافتراضي (يحذف صوره وأصواته المرفوعة)
export async function DELETE(req, { params }) {
  const user = await getStaff();
  if (!user) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });
  const idx = parseIdx(params.idx);
  if (idx === null) return NextResponse.json({ error: 'حرف غير موجود' }, { status: 400 });

  try {
    const admin = createAdminClient();
    const { data: current } = await admin.from('huroof_letters').select('*').eq('idx', idx).maybeSingle();
    const { error } = await admin.from('huroof_letters').delete().eq('idx', idx);
    if (error) throw error;
    await removeFiles(admin, HUROOF_MEDIA_FIELDS.map(f => current?.[f]).filter(Boolean));
    return NextResponse.json({ row: null });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'تعذّرت الإعادة' }, { status: 500 });
  }
}
