---
name: aarem-feature
description: خريطة ملفات منصة أكاديمية عارم (lms/) وطريقة بناء أي ميزة أو تدريب أو لعبة جديدة فيها — أين يوضع كل ملف، ومسارات API المحمية، وجداول Supabase مع RLS، والتحكم الإداري الكامل من أول دفعة، والمحتوى الحيّ بلا كاش. استخدمها عند إضافة ميزة أو صفحة أو مسار API أو جدول، أو عند إعادة تنظيم الملفات. Use when adding a feature, page, API route, Supabase table, admin panel, or reorganizing files in lms/.
---

# بناء ميزة جديدة في منصة عارم — وتنظيم ملفاتها

المرجع: `CLAUDE.md` (الأقسام 7.3، 9.5، 11، 12). القاعدة الأولى: **تحسين لا إعادة بناء**. ابنِ على البنية القائمة، وانسخ أقرب نمط موجود يعمل بدل اختراع نمط جديد.

## 1. خريطة الملفات — كل شيء في مكانه

| ماذا | أين | مثال قائم |
|---|---|---|
| منطق خالص قابل للاختبار (بلا React ولا Supabase) | `lms/lib/<ميزة>.js` + اختباره `lms/lib/<ميزة>.test.js` | `huroof-spell.js`، `letter-catcher.js` |
| قراءة/كتابة قاعدة البيانات على الخادم | `lms/lib/<ميزة>-server.js` | `huroof-server.js`، `points-server.js` |
| مساعدات خاصة بالمتصفح | `lms/lib/<ميزة>-client.js` | `huroof-client.js` |
| مسار API | `lms/app/api/<ميزة>/route.js`، والعنصر الواحد في `[id]/route.js` | `app/api/huroof/[idx]/route.js` |
| صفحة الطفل | `lms/app/library/<ميزة>/page.jsx`، والمكوّنات الخاصة بها بجانبها | `app/library/huroof/Challenge.jsx` |
| لوحة المعلم داخل الصفحة | ملف مستقل بجانب الصفحة (`_teacher-panel.jsx` أو `<ميزة>Admin.jsx`) | `letter-catcher/_teacher-panel.jsx` |
| تبويب في لوحة الإدارة bogga | `lms/components/admin/tabs/<اسم>Tab.jsx`، والحالة المشتركة تبقى في `app/bogga/page.jsx` | `StoriesTab.jsx` |
| مكوّن مشترك بين صفحات | `lms/components/` | `AudioUploadButton.jsx`، `GameScene.jsx` |
| هجرة قاعدة البيانات | `lms/supabase/<اسم>.sql` + **دائماً** `<اسم>_rollback.sql` | `huroof_challenge.sql` |
| أصول ثابتة (صور، GLB، خطوط) | `lms/public/` — مستضافة ذاتياً، لا روابط CDN خارجية | `public/models/*.glb` |

- **لا تنسخ مكوّناً لتعدّل فيه سطرين.** وحّده بإعدادات، كما في `CodesManager.jsx`.
- ملف واحد يتجاوز 1500 سطر علامة على تفكيكه: الغلاف يحتفظ بالحالة المشتركة، وكل جزء مستقل في ملفه (نمط تفكيك bogga).
- الثوابت والكتالوجات (ألغاز، مستويات، قطع) في `lib/` وتُختبر هناك، لا داخل JSX.

## 2. مسار API — النمط المعتمد

```js
import { NextResponse }      from 'next/server';
import { createClient }      from '../../../lib/supabase-server';
import { createAdminClient } from '../../../lib/supabase-admin';
import { getRole }           from '../../../lib/auth-role';

export const dynamic = 'force-dynamic';
const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };
const STAFF = ['teacher', 'admin', 'super_admin'];

async function getStaff() {
  const { data: { user } } = await createClient().auth.getUser();
  return user && STAFF.includes(getRole(user) ?? '') ? user : null;
}
```

- **الدور من `app_metadata` حصراً عبر `getRole(user)`** — ممنوع `user_metadata.role` منعاً باتاً.
- كل كتابة أو قراءة حساسة تمرّ من الخادم بـ`createAdminClient()` (service role) **بعد** فحص الصلاحية.
- **تحقّق من كل مدخل على الخادم** بدالة `validate…`/`sanitize…` في `lib/` مع اختباراتها. لا تثق بالعميل في الإجابات أو النقاط.
- النقاط: `awardPoints(admin, userId, reason, amount, { dedup: true })` من `lib/points-server.js`، بسبب فريد (`<ميزة>:<id>`) حتى لا تُمنح مرتين.
- رسائل الخطأ عربية قصيرة (`'غير مخول'`)، ولا تُعرض للطفل خاماً.

## 3. قاعدة البيانات

- جدول جديد: `enable row level security` + سياسة حجب صريحة `RESTRICTIVE … USING (false)` لـ`anon` و`authenticated`، والوصول من الخادم فقط (`rls_deny_all_50_tables.sql` مرجع).
- أي دالة RPC جديدة: `revoke execute … from public, anon, authenticated` ثم `grant execute … to service_role`.
- الهجرة إضافية وغير مُتلفة (`add column if not exists`)، ومعها ملف التراجع. تُطبَّق على القاعدة الحيّة **بعد موافقة الأستاذ محمد**، ثم يُتحقَّق منها باستعلام.
- لا تُخزَّن الأصوات ولا الصور base64 في الجداول: ارفعها إلى Storage (`lib/game-audio.js` → `media/game-audio/<لعبة>/`)، فالـbase64 كان 71% من حجم استجابة قائمة.

## 4. التحكم الإداري الكامل من أول دفعة (قاعدة 7.3)

أي تدريب أو لعبة جديدة تُبنى ومعها، **بلا انتظار طلب**:
1. تفعيل وتعطيل من اللوحة.
2. عنوان ونص فرعي قابلان للتعديل.
3. إضافة وحذف وتعديل وترتيب كل عناصر المحتوى — لا محتوى ثابت في الكود يحتاج نشراً لتغييره.
4. رفع صورة حقيقية بجانب أي إيموجي، والصورة أولى بالعرض.
5. إعادة ضبط تقدّم الطلاب (للجميع أو لطالب واحد) إن كان هناك تقدّم محفوظ.

## 5. المحتوى الذي يعدّله المعلم يصل حيّاً (قاعدة 9.5)

- العميل يجلب بـ`freshFetch(url)` من `lib/fresh-fetch.js`: عنوان فريد + `no-store`.
- الخادم: `force-dynamic` + `Cache-Control: no-store`. **لا `s-maxage` أبداً** على GET يقرأ محتوى يعدّله المعلم.
- الصفحة تعيد الجلب عند عودة التبويب (`visibilitychange`/`focus`/`pageshow`). ممنوع `router.refresh()` داخل هذه المعالجات.
- بعد الحفظ في لوحة المعلم تُحدَّث قائمة الإدارة **وكلمات اللعب معاً**، وبهدوء.

## 6. حسابات العائلة

استعمل `childFetch` من `lib/child-fetch.js` لطلبات الطالب، حتى يصل الطلب باسم الطفل النشط لا الوالد (العزل التام بين الأشقاء، القسم 13.8).

## 7. قبل التسليم

- أضف اختبارات `vitest` للمنطق الجديد في `lib/`، وللمسارات بنمط `*-routes.test.js`.
- أضف قسماً مختصراً لـ`CLAUDE.md` يصف الميزة، وسطراً في سجل القرارات.
- ثم المهارة `aarem-verify-ship`.
