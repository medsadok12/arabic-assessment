'use client';

import { useEffect, useLayoutEffect, useState } from 'react';

/* ════════════════════════════════════════════════════════════════
   مربعات الحروف في التدريبات — قاعدة دائمة (2026-10-15، طلب الأستاذ محمد)
   - كلمة واحدة: تبقى مربعاتها الكبيرة كما هي تماماً.
   - اسم من كلمتين فأكثر (مثل «حمار وحشي»): تُصغَّر المربعات لتسع سطراً واحداً
     بعرض الحاوية الفعلي، والمسافة بين الكلمتين فراغ لا مربع.
   تُستعمل في كل تدريب يعرض حروف كلمة في مربعات (صيّاد الحروف، ترتيب الحروف…).
════════════════════════════════════════════════════════════════ */

export const TILE_GAP = 4;    // بين حروف الكلمة الواحدة
export const WORD_GAP = 14;   // بين كلمتين

/* أكبر مقاس مربع يجعل letters مربعاً في groups كلمة تسع width في سطر واحد */
export function fitTileSize(width, letters, groups, { max = 40, min = 12, tileGap = TILE_GAP, wordGap = WORD_GAP } = {}) {
  if (!letters) return max;
  if (!width) return min;            // قبل القياس: الأصغر أفضل من سطرين ثم قفزة
  const free = width - Math.max(0, letters - groups) * tileGap - Math.max(0, groups - 1) * wordGap;
  return Math.max(min, Math.min(max, Math.floor(free / letters)));
}

/* أبعاد المربع المصغَّر — يُدمج فوق نمط المربع الأصلي للتدريب */
export function compactTileStyle(size) {
  return {
    width: size, minWidth: 0, height: Math.round(size * 1.3),
    fontSize: Math.max(11, Math.round(size * 0.72)),
    padding: 0, borderRadius: Math.max(6, Math.round(size * 0.24)),
    borderWidth: 2, boxSizing: 'border-box', flex: '0 0 auto', lineHeight: 1,
  };
}

/* نمط الصف والمجموعة في الوضع المصغَّر: سطر واحد بلا التفاف */
export const compactRowStyle   = { width: '100%', flexWrap: 'nowrap', gap: WORD_GAP };
export const compactGroupStyle = { flexWrap: 'nowrap', gap: TILE_GAP };

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/* عرض عنصر بالبكسل ويتحدّث مع تدوير الجهاز/تغيّر الحجم.
   الاستعمال: const [rowEl, setRowEl] = useState(null); const w = useElementWidth(rowEl); <div ref={setRowEl}> */
export function useElementWidth(el) {
  const [width, setWidth] = useState(0);
  useIsoLayoutEffect(() => {
    if (!el) return undefined;
    const update = () => setWidth(el.clientWidth);
    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return width;
}
