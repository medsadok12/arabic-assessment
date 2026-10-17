/* ════════════════════════════════════════════════════════════════
   تمرير لوحات إدارة الكلمات في الألعاب
   - الضغط على ✏️ يُظهر نموذج التعديل أمام المعلم مباشرة (بدل الصعود يدوياً
     لأعلى قائمة طويلة).
   - بعد حفظ التعديل يعود المعلم إلى نفس الكلمة في القائمة مع وميض أخضر
     يؤكد الحفظ، ليكمل من حيث توقف.
   يعمل داخل النوافذ المنبثقة القابلة للتمرير وفي الصفحة نفسها.
════════════════════════════════════════════════════════════════ */

export function bringIntoView(el, block = 'start') {
  if (!el) return;
  requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block }));
}

/* الصف يحمل data-edit-row={id}؛ يُنتظَر إطاران حتى تُرسَم القائمة المحدَّثة */
export function flashSavedRow(id) {
  if (id == null || typeof document === 'undefined') return;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const sel = `[data-edit-row="${String(id).replace(/["\\]/g, '\\$&')}"]`;
    const el = document.querySelector(sel);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.remove('edit-row-saved');
    void el.offsetWidth; // إعادة تشغيل الوميض إن حُفظت نفس الكلمة مرتين متتاليتين
    el.classList.add('edit-row-saved');
    setTimeout(() => el.classList.remove('edit-row-saved'), 2600);
  }));
}
