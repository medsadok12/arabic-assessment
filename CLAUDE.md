# نظام التقييم الذكي + منصة أكاديمية عارم (LMS)
## سجل شامل لجميع الجلسات — آخر تحديث: 4 يونيو 2026

---

## 🗂️ المشاريع النشطة

| المشروع | الرابط | المستودع / الفرع |
|---------|--------|-----------------|
| نظام التقييم الذكي | https://arabic-assessment.vercel.app | `medsadok12/arabic-assessment` → فرع `claude/review-external-context-pbGN7` |
| منصة أكاديمية عارم (LMS) | https://aarem-lms.vercel.app | `medsadok12/arabic-assessment` → فرع `main` (مجلد `/lms`) |
| GitHub Pages (احتياطي) | https://medsadok12.github.io/arabic-assessment/ | فرع `main` |

---

## 📦 متغيرات البيئة

### مشروع arabic-assessment (Vercel)
| المتغير | القيمة |
|---------|--------|
| `GMAIL_USER` | `gandouzimohamed9@gmail.com` |
| `GMAIL_APP_PASSWORD` | *(كلمة مرور تطبيق Gmail — مضافة)* |

### مشروع aarem-lms (Vercel)
| المتغير | القيمة |
|---------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | *(مضاف — May 29)* |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(مضاف — May 29)* |
| `SUPABASE_SERVICE_ROLE_KEY` | *(مضاف — May 30)* |
| `GEMINI_API_KEY` | *(مضاف)* |
| `GMAIL_USER` | `gandouzimohamed9@gmail.com` *(مضاف — Jun 4)* |
| `GMAIL_APP_PASSWORD` | *(كلمة مرور تطبيق Gmail — مضافة Jun 4)* |
| `RESEND_API_KEY` | `re_...` *(يجب إضافته — Jun 4)* |

### Supabase
- **Project URL:** `https://uqspozzkzyytwwidojxv.supabase.co`
- **Project ID:** `uqspozzkzyytwwidojxv`
- **SQL Editor:** https://supabase.com/dashboard/project/uqspozzkzyytwwidojxv/sql/new

---

## 🗄️ قاعدة البيانات — جداول Supabase

### الجداول المُنشأة (يجب تشغيل SQL في Supabase)

```sql
-- 1. طلبات التوظيف
CREATE TABLE IF NOT EXISTS recruitment_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT,
  experience TEXT, specialty TEXT, notes TEXT, cv_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE recruitment_applications DISABLE ROW LEVEL SECURITY;

-- 2. بنك الكلمات
CREATE TABLE IF NOT EXISTS lexicon_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL, word_type TEXT NOT NULL,
  sentence TEXT, topic TEXT,
  grade_from INT NOT NULL DEFAULT 1, grade_to INT NOT NULL DEFAULT 7,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE lexicon_words DISABLE ROW LEVEL SECURITY;

-- 3. المقابلات الوظيفية ✅ تم إنشاؤه Jun 4
CREATE TABLE IF NOT EXISTS interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES recruitment_applications(id) ON DELETE CASCADE,
  interviewer_name TEXT NOT NULL,
  interview_date DATE NOT NULL,
  start_time TIME NOT NULL,
  candidate_response TEXT NOT NULL DEFAULT 'pending'
    CONSTRAINT valid_response CHECK (candidate_response IN ('pending','confirmed','reschedule_requested','rejected')),
  reschedule_reason TEXT,
  response_token UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE interviews DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS interviews_slot_idx ON interviews (interviewer_name, interview_date, start_time);

-- 5. نتائج التقييمات ✅ تم إنشاؤه Jun 10
CREATE TABLE IF NOT EXISTS assessments (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID,
  student_name TEXT         NOT NULL,
  level        INT          NOT NULL DEFAULT 1,
  score        NUMERIC      NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
ALTER TABLE assessments DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS assessments_completed_idx ON assessments (completed_at DESC);

-- 4. صلاحيات المشرفين المساعدين ✅ تم إنشاؤه Jun 3
CREATE TABLE IF NOT EXISTS admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  tab_key TEXT NOT NULL,
  is_allowed BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (admin_id, tab_key)
);
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins_read_own_permissions" ON admin_permissions
  FOR SELECT USING (auth.uid() = admin_id);

NOTIFY pgrst, 'reload schema';
```

### RLS (Row Level Security)
- ✅ **مفعّل فقط** على `admin_permissions` — المساعد يقرأ صلاحياته الخاصة فقط
- ❌ **معطّل** على بقية الجداول — الكتابة تتم عبر `service_role` في API routes

---

## 🏗️ بنية مشروع LMS (`/lms`)

```
lms/
  app/
    bogga/page.jsx          ← لوحة تحكم المدير (super_admin + admin)
    auth/login/page.jsx     ← صفحة تسجيل الدخول
    dashboard/page.jsx      ← لوحة الطالب
    api/
      bogga/
        admins/route.js           ← GET/POST المشرفين المساعدين
        admins/[id]/route.js      ← DELETE/PATCH (حذف/إيقاف/تفعيل)
        interviews/route.js       ← GET/POST/DELETE المقابلات
        lexicon/route.js          ← بنك الكلمات
        lexicon/[id]/route.js     ← تعديل/حذف كلمة
        make-super-admin/route.js ← ترقية الحساب
        permissions/route.js      ← GET/POST صلاحيات (super_admin)
        permissions/my/route.js   ← GET صلاحياتي (admin)
        recruitment/route.js      ← GET/DELETE/PATCH طلبات التوظيف
        recruitment/[id]/route.js ← تفاصيل طلب
      interview/
        respond/route.js          ← رد المترشح (confirm/reject) — PUBLIC
        reschedule/route.js       ← طلب تعديل موعد — PUBLIC
    interview/
      reschedule/page.jsx         ← صفحة طلب التعديل — PUBLIC
  components/
    FaheemWidget.jsx        ← مساعد فهيم الذكي (Gemini + Azure TTS)
    Navbar.jsx
    AssessmentCodes.jsx
    GroupsManager.jsx
    ...
  lib/
    supabase.js             ← client-side supabase
    supabase-server.js      ← server-side supabase (cookies)
    supabase-admin.js       ← service_role client (bypasses RLS)
    email.js                ← دوال الإرسال عبر Resend ✅ محدّث Jun 4
  supabase/
    interviews.sql
    admin_permissions.sql
```

---

## 👥 نظام المستخدمين والصلاحيات

### أدوار المستخدمين (`user_metadata.role`)
| الدور | الوصول |
|-------|--------|
| `super_admin` | كامل — جميع التبويبات + إدارة المشرفين |
| `admin` | محدود — فقط التبويبات التي يمنحها المدير العام |
| طالب | لوحة الطالب فقط |

### نظام ACL (Granular Permissions)
- التبويبات القابلة للتحكم: `overview`, `codes`, `groups`, `lexicon`, `setup`
- التبويبات الحصرية للمدير العام: `recruitment`, `admins`
- الوضع الافتراضي: **مخفي** — لا يظهر تبويب لأي مساعد إلا بعد منح الإذن
- أيقونة 🔒 بجانب كل تبويب قابل للتحكم (للمدير العام فقط)

### حالة المشرف المساعد (`user_metadata.status`)
| الحالة | المعنى |
|--------|--------|
| `active` | نشط — يدخل لوحة التحكم بصلاحياته |
| `suspended` | موقوف — يرى شاشة "🔒 حسابك معطل مؤقتاً" |

---

## 📧 نظام الإيميل

### الوضع الحالي
- **المكتبة:** `resend` v6.12.4 ✅ (مرحّل من nodemailer — Jun 4)
- **المرسِل المؤقت:** `onboarding@resend.dev` (لحين ربط النطاق)
- **السبب:** Gmail SMTP كان يوجّه الإيميلات لـ Spam — Resend يصل للصندوق الرئيسي

### دوال الإرسال (`lms/lib/email.js`)
| الدالة | المتلقي | المناسبة |
|--------|---------|----------|
| `sendInterviewEmail` | المترشح | دعوة مقابلة مع 3 أزرار تفاعلية |
| `sendRejectionEmail` | المترشح | إشعار الرفض (يُرسل مرة واحدة فقط) |
| `sendWelcomeEmail` | المشرف الجديد | بيانات الدخول + كلمة المرور المؤقتة |

### ميزات الإيميل
- كلمة المرور المؤقتة: تُنشأ تلقائياً (12 حرف بدون أحرف متشابهة)
- إيميل الرفض: لا يُرسل مرة ثانية (يفحص `current.status !== 'rejected'`)
- إذا فشل الإرسال: تظهر كلمة المرور في الواجهة للمدير كاحتياط

### ربط النطاق (مطلوب مستقبلاً)
- الحساب: https://resend.com (مرتبط بـ GitHub)
- بعد ربط النطاق: تغيير `FROM` في `email.js` من `onboarding@resend.dev` إلى `noreply@[النطاق]`

---

## 🤖 مساعد فهيم الذكي

### سلسلة Fallback للـ AI
```
gemini-2.5-flash → gemini-2.0-flash → gemini-2.0-flash-lite → gemini-1.5-flash → claude-haiku-4-5-20251001
```

### سلسلة Fallback للصوت (TTS)
```
Azure Neural TTS (ar-SA-HamedNeural) → Google Translate TTS proxy → Browser Web Speech API
```

### متغيرات Azure TTS (مطلوبة)
- `AZURE_SPEECH_KEY` — مفتاح الخدمة
- `AZURE_SPEECH_REGION` — المنطقة (مثل `eastus`)
- الخطة: Free F0 (لا تكلفة)

### حدود Vercel Hobby
- 10 ثوانٍ لكل function
- Gemini timeout: 6000ms | Anthropic timeout: 5000ms

---

## 📅 منظومة جدولة المقابلات

### المواصفات
- 25 فترة زمنية: 08:00 → 20:00 بفاصل 30 دقيقة
- كشف تعارض المواعيد: نفس المقابِل + نفس اليوم + نفس الوقت
- 3 أزرار في إيميل الدعوة: ✅ موافق | 📅 أطلب تعديل | ❌ أعتذر
- استجابة المترشح عبر token مضمّن في الرابط (لا يحتاج تسجيل دخول)

### حالات استجابة المترشح
`pending` → `confirmed` | `reschedule_requested` | `rejected`

---

## 🔗 روابط التواصل السريع (في بطاقات المترشحين)
- **الهاتف:** رابط واتساب `https://wa.me/{أرقام فقط}`
- **البريد:** رابط `mailto:{email}?subject=بخصوص طلبك في أكاديمية عارم`

---

## 🎨 الطباعة والتصميم

### الخطوط
- **الأساسي:** Cairo + Tajawal (Google Fonts)
- **مناسب للأطفال:** أحجام واضحة، line-height: 1.8

### أحجام مخصصة
- فقاعة فهيم: `font-size: 1.05rem`, `line-height: 1.8`
- خانة الإدخال: `font-size: .95rem`
- عناوين البطاقات: `font-size: 1.1rem`
- أوصاف البطاقات: `font-size: .93rem`

---

## 🛠️ نظام التقييم الذكي (`/src`)

### البنية
```
src/
  components/
    StudentInfo.jsx       ← ناطق / غير ناطق
    Assessment.jsx        ← محرك الأسئلة (MCQ + matching)
    MatchingQuestion.jsx  ← سؤال الربط بالسهم
    LevelTransition.jsx   ← الانتقال بين المستويات
    Results.jsx           ← النتائج + إرسال PDF
  data/questions.js       ← 60 سؤال + matching في level1
  utils/
    scoring.js            ← نظام التصحيح + القفز
    pdfGenerator.js       ← JPEG scale 1.5
  App.jsx
api/send-email.js         ← sizeLimit: 10mb
```

### ملاحظات تقنية
- **jsPDF:** `^4.2.1` → استخدم `pdfBase64.split(',')[1]` وليس `.replace()`
- **PDF:** JPEG scale 1.5 (أقل من 4.5MB لـ Vercel)
- **لتحديث Vercel:** ادفع لفرع `claude/review-external-context-pbGN7`

---

## 🐛 مشاكل تم حلها (سجل مرجعي)

| المشكلة | السبب | الحل |
|---------|-------|------|
| إيميلات تذهب لـ Spam | Gmail SMTP | الانتقال لـ Resend |
| `Could not find table 'interviews'` | الجدول لم يُنشأ | تشغيل SQL في Supabase + `NOTIFY pgrst` |
| `emailSent: true` رغم الفشل | try/catch خاطئ | إرجاع emailSent الحقيقي + عرض كلمة المرور احتياطياً |
| PDF حجمه كبير | jsPDF scale عالي | JPEG scale 1.5 |
| `useSearchParams` خطأ في Next.js 14 | لا Suspense | تغليف في `<Suspense>` |
| git commit من مجلد خاطئ | `lms/` بدلاً من root | دائماً من `/home/user/arabic-assessment/` |

---

## 📋 المطلوب إنجازه (Backlog)

### ⏳ معلّق — ذكّرني عند بدء كل جلسة
- [ ] **Azure TTS** — صوت فهيم العربي الطبيعي
  - إنشاء Azure Speech service (F0 مجاني — يحتاج بطاقة للتسجيل فقط)
  - إضافة `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION` في Vercel
  - الكود جاهز — مجرد إضافة المتغيرات يكفي

- [ ] **Supabase Custom Auth Domain** — عند الترقية للخطة المدفوعة ($25/شهر Pro)
  - إنشاء `auth.aarem.net` كـ custom auth domain في Supabase Dashboard → Authentication → URL Configuration
  - سيُعرض `auth.aarem.net` بدلاً من `uqspozzkzyytwwidojxv.supabase.co` في شاشة Google OAuth
  - يُحسّن مظهر تسجيل الدخول بـ Google للمستخدمين

### ✅ مكتمل (يونيو 2026)
- [x] Google Meet تلقائي لكل حصة
- [x] فصل دخول الطالب عن المعلم
- [x] بطاقة الحصة القادمة في داشبورد الطالب مع عداد الوقت
- [x] إيميلات من `noreply@aarem.net` (Resend + domain verified)
- [x] دعوة طالب إضافي تظهر في داشبورده تلقائياً
- [x] زر "أنهيت الحصة" + رابط التسجيل
- [x] تذكير تلقائي بالإيميل قبل 30 دقيقة من الحصة
- [x] صفحة الملف الشخصي (تغيير الاسم وكلمة المرور)
- [x] تحسينات الموبايل

### مقترحات مستقبلية
1. **أسئلة صوتية** — ملفات audio لأسئلة الاستماع
2. **أنواع أسئلة إضافية** — أكمل الجملة، رتّب الكلمات، صحّح الخطأ
3. **تغذية راجعة فورية** — شرح الإجابة الصحيحة/الخاطئة
4. **لوحة إدارة الطلاب** — قائمة، مقارنة، تصدير Excel
5. **حفظ التقدم** — استئناف التقييم عند إغلاق المتصفح
6. **رمز QR** — للنتائج والمشاركة السريعة
7. **تقرير مقارن زمني** — تتبع تطور الطالب

---

## 🔑 قواعد ثابتة (لا تتجاهلها أبداً)

1. **LMS**: ادفع دائماً لفرع `main` (Vercel يتابعه)
2. **نظام التقييم**: ادفع لفرع `claude/review-external-context-pbGN7`
3. **git commands**: نفّذها دائماً من `/home/user/arabic-assessment/` (الـ root)
4. **لا تشارك API keys في المحادثة** — أضفها مباشرة في Vercel
5. **RLS**: مفعّل فقط على `admin_permissions` — بقية الجداول معطّل
6. **كلمة مرور Supabase Admin**: عبر `createAdminClient()` فقط (service_role)
7. **الروابط المفيدة**: بعد كل مهمة قدّم دائماً الروابط ذات الصلة تلقائياً دون انتظار:
   - بعد push → رابط Vercel للمشروع المعني
   - بعد SQL → رابط Supabase SQL Editor
   - بعد تغيير متغيرات البيئة → رابط Vercel Environment Variables
   - روابط المشاريع الثابتة:
     - LMS (Vercel): https://aarem-lms.vercel.app
     - LMS (Vercel settings): https://vercel.com/medsadok12s-projects/aarem-lms/settings/environment-variables
     - نظام التقييم: https://arabic-assessment.vercel.app
     - Supabase SQL Editor: https://supabase.com/dashboard/project/uqspozzkzyytwwidojxv/sql/new
     - Supabase Tables: https://supabase.com/dashboard/project/uqspozzkzyytwwidojxv/editor

---

*آخر تحديث: 4 يونيو 2026*
