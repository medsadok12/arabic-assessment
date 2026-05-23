# نظام التقييم الذكي — أكاديمية عارم
## سجل جلسة العمل — 23 مايو 2026

---

## ما تم إنجازه اليوم

### 1. نشر التطبيق
- **Vercel (الرئيسي):** https://arabic-assessment.vercel.app ✅
- **GitHub Pages (احتياطي):** https://medsadok12.github.io/arabic-assessment/ ✅
- المستودع: `medsadok12/arabic-assessment`
- فرع Vercel الإنتاجي: `claude/review-external-context-pbGN7`
- فرع GitHub Pages: `main`

### 2. إصلاح إرسال الإيميل
- **المشكلة الأولى:** GitHub Pages لا يدعم backend → نقلنا إلى Vercel
- **المشكلة الثانية:** حجم PDF يتجاوز حد Vercel (4.5MB) → خفضنا scale من 2 إلى 1.5 واستخدمنا JPEG
- **المشكلة الثالثة:** jsPDF v4 يضيف معاملات في data URI فيفشل الـ regex → استبدلنا `.replace()` بـ `.split(',')[1]`
- **المشكلة الرابعة:** كلمة مرور Gmail خاطئة في Vercel → صُحِّحت

### 3. إعداد Gmail
- البريد: `gandouzimohamed9@gmail.com`
- كلمة مرور التطبيق: مضافة في Vercel تحت `GMAIL_APP_PASSWORD`
- متغير البيئة `GMAIL_USER` أيضاً مضاف

### 4. تعديلات على التطبيق
- حذف خيار "متعلم تراثي" من نوع المتعلم (بقي ناطق وغير ناطق فقط)
- إضافة سؤال ربط بالسهم كأول سؤال في كل تقييم:
  - 🦒 زَرَافَة | 🦁 أَسَد | 🐘 فِيل
  - مكوّن جديد: `src/components/MatchingQuestion.jsx`

---

## البنية التقنية الحالية

```
src/
  components/
    StudentInfo.jsx      ← معلومات الطالب (ناطق / غير ناطق)
    Assessment.jsx       ← محرك الأسئلة (يدعم MCQ + matching)
    MatchingQuestion.jsx ← سؤال الربط بالسهم (جديد)
    LevelTransition.jsx  ← الانتقال بين المستويات
    Results.jsx          ← النتائج + إرسال PDF بالإيميل
  data/
    questions.js         ← 60 سؤال + سؤال matching في level1
  utils/
    scoring.js           ← نظام التصحيح والقفز بين المستويات
    pdfGenerator.js      ← JPEG scale 1.5 (مُحسَّن للحجم)
  App.jsx                ← matching questions دائماً أولاً
api/
  send-email.js          ← Vercel serverless + sizeLimit 10mb
```

### فروع Git المهمة
| الفرع | الغرض |
|-------|--------|
| `claude/review-external-context-pbGN7` | **Vercel production** — ادفع هنا لتحديث vercel.app |
| `main` | GitHub Pages + نسخة محدّثة |

---

## المقترحات المتفق عليها للجلسة القادمة

1. **أسئلة صوتية** — إضافة ملفات audio لأسئلة الاستماع
2. **أنواع أسئلة إضافية** — أكمل الجملة، رتّب الكلمات، صحّح الخطأ
3. **تغذية راجعة فورية** — شرح لماذا الإجابة صحيحة/خاطئة
4. **لوحة إدارة** — قائمة الطلاب، مقارنة النتائج، تصدير Excel
5. **حفظ التقدم** — استئناف التقييم عند إغلاق المتصفح
6. **رمز QR** — للنتائج والمشاركة السريعة
7. **تقرير مقارن زمني** — تتبع تطور الطالب عبر الزمن

---

## ملاحظات تقنية مهمة

- **jsPDF الإصدار:** `^4.2.1` — يستخدم `output('datauristring')` وليس `output('base64')`
- **لاستخراج base64 من PDF:** دائماً استخدم `pdfBase64.split(',')[1]` وليس `.replace()`
- **لتحديث Vercel:** ادفع للفرع `claude/review-external-context-pbGN7`
- **nodemailer:** يستخدم Gmail SMTP عبر App Password (وليس كلمة المرور العادية)
- **حد Vercel للـ body:** 4.5MB — PDF مضغوط بـ JPEG 0.7 يبقى تحت الحد

---

*آخر تحديث: 23 مايو 2026*
