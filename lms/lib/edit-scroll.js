/* ════════════════════════════════════════════════════════════════
   تمرير لوحات إدارة الكلمات في الألعاب
   طلب الأستاذ محمد (2026-10-26): «يجب أن تنبثق شاشة التعديل في نفس مكان طلب
   التعديل، وعند ضغط إتمام أبقى في نفس المكان» — مع 1000 كلمة لا يصحّ الصعود
   لأعلى القائمة ثم البحث من جديد.
   - نموذج التعديل يُعرض تحت صف الكلمة نفسها، والصف لا يتحرك من مكانه على الشاشة
     (keepRowInPlace يعوّض أي تغيّر في الارتفاع فوقه — سفاري لا يدعم overflow-anchor).
   - بعد الحفظ أو الإلغاء تعود القائمة كما كانت لحظة الضغط على ✏️ — حتى لو نزل المعلم
     داخل النموذج ليصل إلى زر الحفظ — مع وميض أخضر يؤكد الحفظ (returnRow + flashRow).
   يعمل مع الحاويات المتداخلة: قائمة قابلة للتمرير داخل نافذة منبثقة داخل الصفحة.
════════════════════════════════════════════════════════════════ */

const rowEl = (id) => (id == null || typeof document === 'undefined'
  ? null
  : document.querySelector(`[data-edit-row="${String(id).replace(/["\\]/g, '\\$&')}"]`));

const pageScroller = () => document.scrollingElement || document.documentElement;

/* الحاويات التي قد تتمرّر (overflow-y: auto|scroll) من الأقرب إلى الأبعد، حتى نافذة ثابتة
   (position:fixed) إن وُجدت — فتمرير الصفحة خلفها لا يحرّك شيئاً ظاهراً */
function containers(el) {
  const list = [];
  for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
    const cs = getComputedStyle(p);
    if (cs.overflowY === 'auto' || cs.overflowY === 'scroll') list.push(p);
    if (cs.position === 'fixed') return { list, fixed: true };
  }
  return { list, fixed: false };
}

/* قابلة للتمرير الآن فعلاً (main و body عندهما overflow-y:auto محسوب بسبب overflow-x:hidden
   لكنهما لا يتمرّران، ونافذة قصيرة قد تصير قابلة للتمرير بعد ظهور النموذج) */
const canScroll = (c) => c === pageScroller() || (c.isConnected && c.scrollHeight > c.clientHeight + 1);

function scrollChain(el) {
  const { list, fixed } = containers(el);
  const chain = list.filter(canScroll);
  if (!fixed) chain.push(pageScroller());
  return chain;
}

/* تمرير فوري بلا حركة: globals.css يجعل html { scroll-behavior: smooth } فيتحرك التصحيح أمام العين
   وتُقرأ المواضع قبل أن يكتمل */
function jump(c, d) {
  const prev = c.style.scrollBehavior;
  c.style.scrollBehavior = 'auto';
  c.scrollTop += d;
  c.style.scrollBehavior = prev;
}

/* المنطقة الظاهرة فعلاً: تقاطع الشاشة مع كل حاوية تمرير فوق العنصر */
function visibleBox(chain) {
  let top = 0, bottom = window.innerHeight;
  chain.forEach(c => {
    if (c === pageScroller()) return;
    const r = c.getBoundingClientRect();
    top = Math.max(top, r.top); bottom = Math.min(bottom, r.bottom);
  });
  return { top, bottom };
}

// موضع الصف على الشاشة لحظة فتح نموذج تعديله، لتعود إليه القائمة عند الإغلاق
let anchor = null;

/* يُستدعى قبل تغيير الحالة؛ يُرجع restore(after?) يُستدعى بعده: يعيد الصف لنفس موضعه على الشاشة
   بعد أن تُرسم التغييرات (فتح النموذج تحته، إغلاقه، تحديث القائمة)، ثم يستدعي after */
export function keepRowInPlace(id) {
  const restore = holdRow(id, null);
  const el = rowEl(id);
  if (el) anchor = { id: String(id), top: el.getBoundingClientRect().top };
  return restore;
}

/* إغلاق النموذج (حفظ أو إلغاء): يعود الصف إلى موضعه لحظة الضغط على ✏️ */
export function returnRow(id) {
  const target = anchor && anchor.id === String(id) ? anchor.top : null;
  anchor = null;
  return holdRow(id, target);
}

function holdRow(id, target) {
  const el = rowEl(id);
  if (!el) return (after) => after?.();
  const { list, fixed } = containers(el);
  // levels[i] يحتويه list[i] مباشرة؛ تُسجَّل المواضع قبل التغيير، وتُحدَّد الحاويات القابلة للتمرير بعده
  const levels = [el, ...list];
  const top0 = levels.map(n => n.getBoundingClientRect().top);
  if (target != null) top0[0] = target;
  return (after) => requestAnimationFrame(() => requestAnimationFrame(() => {
    const now = rowEl(id);
    if (now) {
      levels[0] = now;
      const outer = fixed ? [] : [pageScroller()];
      const scrollerOf = (i) => list.slice(i).find(canScroll) || outer[0];
      // من الخارج إلى الداخل: أقرب حاوية قابلة للتمرير تعيد كل مستوى إلى موضعه السابق
      for (let i = levels.length - 1; i >= 0; i--) {
        if (!levels[i].isConnected) continue;
        const d = levels[i].getBoundingClientRect().top - top0[i];
        const sc = scrollerOf(i);
        if (sc && Math.abs(d) > 1) jump(sc, d);
      }
      // ما بقي (حاوية بلغت أول محتواها أو آخره) تتكفّل به الحاويات الأبعد
      const chain = [...list.filter(canScroll), ...outer];
      for (const c of chain) {
        const d = now.getBoundingClientRect().top - top0[0];
        if (Math.abs(d) <= 1) break;
        jump(c, d);
      }
      // إن صار الصف مقصوصاً (حاوية عادت لارتفاعها بعد إغلاق النموذج) يُمرَّر بأقل قدر ليظهر كاملاً
      const r = now.getBoundingClientRect(), v = visibleBox(chain);
      if (r.top < v.top - 1 || r.bottom > v.bottom + 1) now.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    after?.();
  }));
}

/* نموذج التعديل تحت الصف: إن كان أوله مخفياً أسفل المنطقة الظاهرة يُمرَّر بلطف بقدر يُظهر أعلاه
   (حتى 260px)، مع بقاء صف الكلمة فوقه ظاهراً — لا محاذاة للنموذج كله */
export function revealBelow(el) {
  if (!el) return;
  const chain = scrollChain(el);
  const v = visibleBox(chain), r = el.getBoundingClientRect();
  let delta = Math.min(r.top + Math.min(r.height, 260) - (v.bottom - 12), r.top - (v.top + 70));
  for (const c of chain) {
    if (delta <= 4) break;
    const room = c.scrollHeight - c.clientHeight - c.scrollTop;
    const step = Math.min(delta, Math.max(0, room));
    if (step > 0) c.scrollBy({ top: step, behavior: 'smooth' });
    delta -= step;
  }
}

/* وميض أخضر على الصف المحفوظ — بلا أي تمرير */
export function flashRow(id) {
  const el = rowEl(id);
  if (!el) return;
  el.classList.remove('edit-row-saved');
  void el.offsetWidth; // إعادة تشغيل الوميض إن حُفظت نفس الكلمة مرتين متتاليتين
  el.classList.add('edit-row-saved');
  setTimeout(() => el.classList.remove('edit-row-saved'), 2600);
}
