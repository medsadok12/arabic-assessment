---
name: aarem-verify-ship
description: التحقق من أي تعديل في منصة أكاديمية عارم ثم نشره على www.aarem.net مرة واحدة — اختبارات vitest، بناء next build، اختبار متصفح Playwright بخادم Supabase وهمي على أحجام الجوال والآيباد والحاسوب، توثيق CLAUDE.md، commit واحد ودفع إلى main، ثم التأكد من نشر Vercel. استخدمها قبل إعلان أي عمل «جاهز» وقبل أي git push. Use before declaring work done, before any commit/push, and to verify the Vercel deployment.
---

# التحقق والنشر — منصة عارم

لا تقل للأستاذ محمد «جاهز» قبل أن تمرّ كل خطوة هنا وتراها بنفسك. وإن فشل شيء فقل ذلك بوضوح ومعه المخرجات.

## 0. أين الكود؟

- منصة LMS في المجلد `lms/` على الفرع **`main`** من `medsadok12/arabic-assessment`.
- الفرع الافتراضي للمستودع (`claude/review-external-context-pbGN7`) هو تطبيق التقييم القديم (Vite)، **ولا يحتوي `lms/`**.
- إن بدأت الجلسة على فرع لا يحتوي `lms/`، استنسخ `main` في مجلد مستقل واعمل فيه:
  ```bash
  git clone --branch main https://github.com/medsadok12/arabic-assessment /home/user/aarem-main
  cd /home/user/aarem-main/lms && npm ci
  ```

## 1. الفحوص السريعة (من `lms/`)

```bash
./node_modules/.bin/vitest run                     # كل الاختبارات يجب أن تنجح

NEXT_PUBLIC_SUPABASE_URL=https://localtest.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=local-test-anon \
SUPABASE_SERVICE_ROLE_KEY=local-test-placeholder \
./node_modules/.bin/next build                     # يجب أن ينتهي بـ exit 0
```

- القيم أعلاه وهمية عمداً. **لا تطلب ولا تطبع أي مفتاح حقيقي** (`SUPABASE_SERVICE_ROLE_KEY`، مفاتيح Azure وAnthropic) في المحادثة أبداً.
- تحذيرات `themeColor` في البناء قديمة ومعروفة، وليست فشلاً.
- أوقف خادم `next dev` قبل `next build`، فكلاهما يكتب في `.next`.

## 2. اختبار المتصفح (Playwright)

السكربتات الجاهزة في مجلد هذه المهارة: `scripts/mock-supabase.mjs` و`scripts/e2e-template.mjs`.

```bash
SKILL=<مسار المستودع>/.claude/skills/aarem-verify-ship/scripts
WORK=<scratchpad>/e2e && mkdir -p $WORK && cp $SKILL/e2e-template.mjs $WORK/my-feature-e2e.mjs

node $SKILL/mock-supabase.mjs &                    # الأدوار: student-token | teacher-token | admin-token
cd lms && NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=local-test-anon \
  SUPABASE_SERVICE_ROLE_KEY=local-test-placeholder ./node_modules/.bin/next dev -p 3100 &
# انتظر حتى تجيب الصفحة، ثم:
node $WORK/my-feature-e2e.mjs $WORK/shots
```

- اكتب السيناريو داخل نسخة القالب في الـscratchpad، **لا داخل المستودع**، ولا تترك ملفات غير متتبَّعة في المستودع.
- حاكِ مسارات `/api/...` الخاصة بالميزة بـ`page.route(...)`، فالخادم الوهمي يغطي المصادقة والتخزين فقط.
- اختبر بدور الطالب **و**المعلم/المدير، وعلى الأحجام الثلاثة.
- **انظر إلى اللقطات بنفسك** (أداة Read على ملف PNG). نجاح الفحوص لا يكفي، فالقصّ والتداخل لا تكشفه الأرقام دائماً.
- دروس سابقة:
  - `bypassCSP: true` ضروري، وإلا لا يُعرَف دور المستخدم.
  - لقطة `fullPage` تعطّل محاكاة اللمس.
  - `scroll-behavior: smooth` العام يجعل التمرير البرمجي متحركاً، فاستعمل `behavior: 'instant'` في القياس.
  - لإيقاف الخوادم استعمل نمطاً لا يطابق أمرك نفسه: `pkill -f "next dev -p 310[0]"` و`pkill -f "mock-supabas[e]"`.

## 3. التوثيق

- أضف سطراً في جدول سجل القرارات في `CLAUDE.md` بصيغة `| جلسة YYYY-MM-DD | **عنوان:** ما طلبه الأستاذ، وما تغيّر، والأرقام والتحقق |`، قبل السطر «حدّث هذا الجدول…».
- الميزة الكبيرة تأخذ قسماً مرقّماً خاصاً بها في آخر الملف.

## 4. commit واحد ودفع واحد إلى `main` (القسم 7.2 — صارم)

- **لا فروع، ولا Pull Requests.** كل push يُطلق نشرتين، فاجمع عمل المهمة في commit واحد في آخرها.
- رسالة الـcommit بالإنجليزية: ما الذي تغيّر ولماذا، **بلا أي اسم نموذج** في الرسالة أو الكود، وتنتهي بسطرَي النَّسب اللذين يحددهما نظام الجلسة.

```bash
git add <الملفات المقصودة فقط>
git -c user.name="Claude" -c user.email="noreply@anthropic.com" commit -F msg.txt
git push origin HEAD:main        # عند فشل الشبكة: أعد المحاولة حتى 4 مرات بانتظار 2، 4، 8، 16 ثانية
```

## 5. تأكيد النشر الحيّ (Vercel MCP)

- المشروع `prj_Wc9QOVw8LFFwjtANuUxlf5wi4fAW`، والفريق `team_lXxqZurlXA54OqIgxrnsR5pc`.
- خطوات التأكيد:
  1. `list_deployments` (limit 3): ابحث عن النشرة التي تحمل `githubCommitSha` الخاص بك.
  2. `get_deployment`: انتظر حتى تصير `READY` والـalias فيها `www.aarem.net`. انتظر في الخلفية، لا بحلقة `sleep` في المقدمة.
  3. `get_runtime_errors` (since: 1h): تأكد أنه لا أخطاء جديدة على المسارات التي لمستها.
- إن كانت النشرة `ERROR`، فاقرأ سجل البناء وأصلح، ثم ادفع مرة واحدة.

## 6. التبليغ للأستاذ محمد

- **بالعربية**، مختصراً وواضحاً:
  1. ما الذي تغيّر من جهة المستخدم.
  2. ما وجدته وأصلحته في الطريق.
  3. التحقق بالأرقام.
  4. كيف يجرّبها بنفسه (الصفحة والخطوات).
- لا مصطلحات تقنية بلا داعٍ، ولا تَعِد بشيء لم يُنفَّذ.
