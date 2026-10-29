'use client';
/* ════════════════════════════════════════════════════════════════
   نص القصة بتنسيقه، منقّى في المتصفح فقط.
   كان isomorphic-dompurify يحمّل jsdom على الخادم فتنهار صفحتا القصص على Vercel
   (ERR_REQUIRE_ESM — 19 مرة لـ16 مستخدماً حتى 2026-10-29، على /story/[token] و/library/stories/[slug]).
   الآن: الخادم والرسم الأول يعرضان النص بلا وسوم (React يهرّبه، فلا خطر حقن)،
   ثم يظهر التنسيق فور تنقيته بـDOMPurify في المتصفح.
════════════════════════════════════════════════════════════════ */
import { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { htmlToText } from '../lib/html-text';

export default function SafeHtml({ html, style, ...props }) {
  const [clean, setClean] = useState(null);
  useEffect(() => { setClean(DOMPurify.sanitize(html || '')); }, [html]);
  if (clean === null) return <div {...props} style={{ ...style, whiteSpace: 'pre-line' }}>{htmlToText(html)}</div>;
  return <div {...props} style={style} dangerouslySetInnerHTML={{ __html: clean }} />;
}
