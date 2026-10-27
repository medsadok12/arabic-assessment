// قالب اختبار متصفح لمنصة عارم — انسخه إلى مجلد مؤقت (scratchpad) وعدّل قسم «السيناريو».
// يفترض: mock-supabase.mjs يعمل على 54321، و next dev على 3100 بـ NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
// التشغيل: node e2e-template.mjs [مجلد-اللقطات]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright'); // Playwright المثبّت في البيئة — لا تُثبّت نسخة أخرى

const B = process.env.APP_URL || 'http://localhost:3100';
const OUT = path.resolve(process.argv[2] || 'shots');
fs.mkdirSync(OUT, { recursive: true });

let failed = 0;
export const ok = (cond, msg) => { console.log(cond ? '✅' : '❌', msg); if (!cond) { failed++; process.exitCode = 1; } };

// كوكي جلسة Supabase يقرؤها التطبيق؛ الرمز يحدد الدور في الخادم الوهمي
const sbCookie = (token) => 'base64-' + Buffer.from(JSON.stringify({
  access_token: token, refresh_token: 'r', token_type: 'bearer', expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 36000, user: { id: 'x' },
})).toString('base64url');

// الأجهزة الفعلية لطلاب عارم
export const VIEWPORTS = {
  phone:   { width: 390,  height: 844 },
  ipad:    { width: 820,  height: 1180 },
  desktop: { width: 1280, height: 800 },
};

const browser = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});

export async function openPage(vpName, role = 'student') {
  const vp = VIEWPORTS[vpName];
  const touch = vp.width < 700;
  const ctx = await browser.newContext({
    viewport: vp, deviceScaleFactor: 1, hasTouch: touch, isMobile: touch,
    bypassCSP: true,            // وإلا تحجب CSP الاتصال بالخادم الوهمي فلا يُعرَف الدور
    serviceWorkers: 'block', reducedMotion: 'reduce',
  });
  await ctx.addCookies([{ name: 'sb-127-auth-token', value: sbCookie(`${role}-token`), url: B }]);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.accept());
  // إخفاء شارة Next.js في وضع التطوير من اللقطات
  await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => {
    const st = document.createElement('style'); st.textContent = 'nextjs-portal{display:none!important}'; document.head.appendChild(st);
  }));
  // مسارات عامة شائعة — أضف مسارات ميزتك داخل السيناريو بـ page.route
  await page.route('**/api/points**', (r) => r.fulfill({ json: { points: 120 } }));
  await page.route('**/api/game-results**', (r) => r.fulfill({ json: { results: [] } }));
  await page.route('**/api/hero-config**', (r) => r.fulfill({ json: {} }));
  return { ctx, page, errors };
}

// تمرير فوري: globals.css فيه html { scroll-behavior: smooth } فيُقرأ الموضع قبل اكتمال الحركة
export const scrollIntoViewNow = (page, selector) =>
  page.$eval(selector, (el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));

// ═══════════════════ السيناريو — عدّل من هنا ═══════════════════
for (const vpName of Object.keys(VIEWPORTS)) {
  const { ctx, page, errors } = await openPage(vpName, 'student');
  await page.goto(`${B}/library`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  const r = await page.evaluate(() => ({
    hScroll: document.scrollingElement.scrollWidth - window.innerWidth,   // لا تمرير أفقي للصفحة
    smallTaps: [...document.querySelectorAll('button, a[href]')]
      .filter((b) => { const x = b.getBoundingClientRect(); return x.width > 0 && x.height > 0 && (x.height < 40 || x.width < 40); }).length,
  }));
  ok(r.hScroll <= 1, `${vpName}: بلا تمرير أفقي (فائض ${r.hScroll}px)`);
  console.log(`   ${vpName}: عناصر لمس أصغر من 40px: ${r.smallTaps}`);
  ok(errors.length === 0, `${vpName}: بلا أخطاء في الصفحة ${errors.join(' | ')}`);
  await page.screenshot({ path: path.join(OUT, `${vpName}.png`) }); // بلا fullPage: يُعطّل محاكاة اللمس
  await ctx.close();
}
// ═══════════════════ نهاية السيناريو ═══════════════════

await browser.close();
console.log(failed ? `\n❌ ${failed} فحص فشل` : '\n✅ كل الفحوص نجحت', `— اللقطات في ${OUT}`);
