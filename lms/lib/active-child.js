import { cookies } from 'next/headers';

export const ACTIVE_CHILD_COOKIE = 'active_child';

/**
 * Resolves which identity — the real logged-in account, or a child added via
 * "إضافة طفل" (Flow A, §13.6) — owns the student data a route is about to
 * read/write. The `active_child` cookie only ever *names* a candidate child;
 * ownership (`students.parent_user_id === user.id`) is re-verified against the
 * DB on every call, so a stale/forged/cross-family cookie can never leak
 * another family's data — it silently falls back to the real account.
 *
 * Every route that reads or writes per-student data (points, streak,
 * flashcards, avatar, homework, sessions…) must resolve identity through this
 * helper instead of using the session's `user.id`/`user.email` directly —
 * otherwise all children under one family login collapse onto the same row.
 */
export async function resolveActiveIdentity(user, admin, req = null) {
  const self = {
    effectiveUserId: user.id,
    effectiveEmail: (user.email ?? '').toLowerCase(),
    viewingChild: null,
  };

  // عنصر عميل يعرف الطفل النشط فعلياً (Navbar, AvatarShop, DashboardHero3D...)
  // يمرّره صراحة كـ?child= لتفادي أي سباق تزامن مع كوكي لم يُكتب بعد على نفس
  // تحميل الصفحة — أولوية على الكوكي متى وُجد ومتحقَّق من ملكيته.
  //
  // ⚠️ حاسم: عرض الحساب الجذر (الوالد نفسه) لا يملك ?child=، فكان يعتمد على
  // «غياب» السياق — لكن الكوكي/التخزين قد يبقى عالقاً على طفل سابق فيُعرَض
  // رصيده على الجذر خطأً (البلاغ الميداني: نقاط الطفل تظهر للأخ الآخر).
  // لذا العميل يرسل ?child=self صراحةً عند عرض الجذر، وهو إشارة قاطعة:
  // «استخدم حساب الدخول الحقيقي وتجاهل الكوكي تماماً» — فلا يُخدَع بأي بقايا.
  let childId = null;
  let fromParam = false;
  try {
    if (req) {
      const p = new URL(req.url).searchParams.get('child');
      if (p) { childId = p; fromParam = true; }
    }
  } catch { childId = null; fromParam = false; }

  // إشارة self الصريحة من العميل → الحساب الحقيقي، وتتجاوز الكوكي بالكامل
  if (fromParam && childId === 'self') return self;

  if (!childId) {
    try { childId = cookies().get(ACTIVE_CHILD_COOKIE)?.value || null; } catch { childId = null; }
  }
  if (!childId || childId === 'self') return self;

  const { data: childRow } = await admin
    .from('students')
    .select('id, full_name, age, grade')
    .eq('id', childId)
    .eq('parent_user_id', user.id)
    .maybeSingle();
  if (!childRow) return self;

  const { data: childAuth } = await admin.auth.admin.getUserById(childRow.id);
  if (!childAuth?.user?.email) return self;

  return {
    effectiveUserId: childRow.id,
    effectiveEmail: childAuth.user.email.toLowerCase(),
    viewingChild: childRow,
  };
}
