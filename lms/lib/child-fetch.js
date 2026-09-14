'use client';

// ── عزل الطفل النشط عبر التبويبات (per-tab) ──────────────────────────────
// كوكي `active_child` مشترك على مستوى المتصفح كله (كل التبويبات)، لذا لو فُتح
// تبويبان لطفلين مختلفين، آخر تبويب يكتب الكوكي «يفوز» — فتُنسب نقاط لعبة لُعبت
// في التبويب القديم للطفل الخطأ. الحل: كل تبويب يحفظ طفله المقصود في
// sessionStorage (معزول لكل تبويب بطبيعته)، وكل طلب بيانات طالب يُلحق
// `?child=` من هذا المصدر. بما أن `?child=` يتفوّق على الكوكي في
// resolveActiveIdentity على الخادم، فالتبويب الذي أنشأ الطلب يفوز دائماً —
// لا تصادم عبر التبويبات رغم أن الكوكي عام.
//
// السلامة: إذا كان sessionStorage فارغاً (تبويب لا يعرف طفله) يتصرّف childFetch
// تماماً كـfetch العادي → يسقط للكوكي → سلوك مطابق للحالة السابقة. لذا لا
// انحدار إطلاقاً في حالة التبويب الواحد (sessionStorage = نفس طفل الكوكي).

export const ACTIVE_CHILD_SS_KEY = 'aa_active_child';

// يُسجّل أي طفل يعرضه هذا التبويب الآن. تُستدعى من DashboardContent عند كل
// تحميل/تبديل. عرض الحساب الجذر يخزّن السنتينل 'self' (لا يمسح المفتاح) —
// حتى ترسل الألعاب/الودجات المنتقَل إليها من الجذر ?child=self صراحةً فتتجاوز
// أي كوكي عالق على طفل سابق، بدل السقوط للكوكي (الذي كان يعرض رصيد الطفل
// على الجذر خطأً).
export function setActiveChildTab(childId) {
  try {
    sessionStorage.setItem(ACTIVE_CHILD_SS_KEY, childId || 'self');
  } catch {}
}

export function getActiveChildTab() {
  try { return sessionStorage.getItem(ACTIVE_CHILD_SS_KEY) || null; } catch { return null; }
}

// بديل fetch: يُلحق ?child=<طفل هذا التبويب> بأي طلب /api/ لبيانات طالب.
// - إن كان الرابط يحمل child= مسبقاً (المُتصِل مرّره صراحة) لا يلمسه.
// - إن لم يوجد طفل نشط لهذا التبويب، يعمل كـfetch عادي تماماً.
export function childFetch(url, opts) {
  try {
    const child = getActiveChildTab();
    if (child && typeof url === 'string' && url.startsWith('/api/') && !/[?&]child=/.test(url)) {
      url += (url.includes('?') ? '&' : '?') + 'child=' + encodeURIComponent(child);
    }
  } catch {}
  return fetch(url, opts);
}
