'use client';
import { useState } from 'react';

// نُقلت هذه الاستبانة من assessment.aarem.net/?survey=1 (تطبيق Vite منفصل)
// إلى www.aarem.net/survey (هنا، داخل تطبيق الـLMS الفعلي) — طلب صريح من
// الأستاذ محمد لأن كلمة "assessment" في الرابط القديم توحي خطأً بأنها
// اختبار/تقييم، بينما هي مجرد نموذج جمع بيانات. ترسل الآن مباشرة إلى
// /api/survey (مسار داخلي في نفس التطبيق، لا حاجة لسرّ ويبهوك مشترك كما
// كان مطلوباً للاتصال من أصل خارجي — راجع lms/app/api/survey/route.js).

// مهلة طلب الإرسال — تمنع بقاء الزر عالقاً على "جارٍ الإرسال..." إلى ما لا
// نهاية عند اتصال معلّق (لا استجابة، لا خطأ صريح من الشبكة).
const SUBMIT_TIMEOUT_MS = 15000;

// تطبيع الأرقام العربية/الهندية (٠-٩) والفارسية الممتدة (۰-۹) إلى أرقام
// لاتينية — لوحات مفاتيح كثيرة لدى أولياء الأمور تكتب هذه الأرقام افتراضياً،
// فكانت تُفشِل تحقق رقم الواتساب بصمت (regex يقبل [0-9] فقط).
function normalizeDigits(str) {
  return str.replace(/[٠-٩۰-۹]/g, d => {
    const code = d.charCodeAt(0);
    return String(code >= 0x06F0 ? code - 0x06F0 : code - 0x0660);
  });
}

// لوحة الألوان الرسمية لأكاديمية عارم (القسم 2.1 من CLAUDE.md) — لا ألوان
// خارجها. الذهبي للاختيار/الأزرار الأساسية (القاعدة الذهبية للزر، 2.2)،
// الأخضر حصراً لشريط التقدّم المكتمل وشاشة النجاح، البنفسجي غير مستخدَم هنا
// (محجوز لفهيم فقط، القسم 2.4).
const NAVY   = '#1A2B4A';
const GOLD   = '#E8B84B';
const CREAM  = '#F4EFE6';
const GREEN  = '#2ABB7A';

// رابط اختبار تحديد المستوى — يبقى على الموقع المستقل assessment.aarem.net
// (مطلق لا نسبي، بما أن هذه الصفحة أصبحت تعيش على مسار /survey ضمن
// www.aarem.net، فالرابط النسبي القديم "?quick=1" كان سيُحيل خطأً لـ
// /survey?quick=1 بدل القمع التسويقي الفعلي).
const QUICKTEST_URL = 'https://assessment.aarem.net/?quick=1';

const TOTAL_STEPS = 5;

const GOALS_OPTIONS = [
  { value: 'reading',      emoji: '📖', label: 'القراءة والنطق',        sub: 'تحسين الطلاقة' },
  { value: 'vocabulary',   emoji: '💬', label: 'الرصيد اللغوي',         sub: 'إثراء المفردات والتعبير' },
  { value: 'writing',      emoji: '✍️', label: 'الكتابة والإملاء',      sub: 'تأسيس القواعد السليمة' },
  { value: 'special-care', emoji: '🧩', label: 'رعاية خاصة',            sub: 'صعوبات تعلم / تشتت انتباه' },
  { value: 'foundation',   emoji: '🌱', label: 'تأسيس شامل من الصفر',   sub: null },
];

const PLAN_OPTIONS = [
  { value: 'monthly',    label: 'شهري',      badge: 'مرونة كاملة' },
  { value: 'quarterly',  label: 'ربع سنوي',  badge: 'خصم جيد' },
  { value: 'biannual',   label: 'نصف سنوي',  badge: 'توفير ممتاز' },
  { value: 'yearly',     label: 'سنوي',      badge: '⭐ القيمة الأفضل', recommended: true },
];

const LEVEL_ASSESSMENT_OPTIONS = [
  'مبتدئ تماماً (من الصفر)',
  'يعرف الحروف ويقرأ ببطء',
  'مستواه جيد ونطمح للامتياز',
];

const INITIAL_ANSWERS = {
  childName: '',
  childAge: '',
  schoolSystem: '',
  developmentGoals: [],
  currentLevelAssessment: '',
  learningEnvironment: '',
  sessionsPerWeek: '',
  preferredTimes: '',
  preferredTimesNote: '',
  subscriptionPlan: '',
  parentName: '',
  whatsappNumber: '',
};

function OptionCard({ selected, onClick, children, recommended, role = 'radio' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      role={role}
      aria-checked={selected}
      className={`cs-option${selected ? ' selected' : ''}${recommended ? ' recommended' : ''}`}
    >
      {children}
    </button>
  );
}

function StepHeader({ title, desc }) {
  return (
    <>
      <h2 className="cs-step-title">{title}</h2>
      {desc && <p className="cs-step-desc">{desc}</p>}
    </>
  );
}

export default function SurveyPage() {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState(INITIAL_ANSWERS);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  function setField(field, value) {
    setAnswers(prev => ({ ...prev, [field]: value }));
  }

  function toggleGoal(value) {
    setAnswers(prev => {
      const has = prev.developmentGoals.includes(value);
      return {
        ...prev,
        developmentGoals: has
          ? prev.developmentGoals.filter(g => g !== value)
          : [...prev.developmentGoals, value],
      };
    });
  }

  const isPhoneValid = /^[0-9+\s-]{8,}$/.test(answers.whatsappNumber.trim());

  function canProceed() {
    switch (step) {
      case 1: return !!answers.childName.trim() && !!answers.childAge.trim() && !!answers.schoolSystem.trim();
      case 2: return answers.developmentGoals.length > 0 && !!answers.currentLevelAssessment;
      case 3: return !!answers.learningEnvironment && !!answers.sessionsPerWeek && !!answers.preferredTimes;
      case 4: return !!answers.subscriptionPlan;
      default: return true;
    }
  }

  const canSubmit = answers.parentName.trim().length > 0 && isPhoneValid;

  function goNext() {
    if (!canProceed()) return;
    setStep(s => Math.min(s + 1, TOTAL_STEPS));
  }

  function goBack() {
    setStep(s => Math.max(s - 1, 1));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    setSubmitError('');

    // مهلة صريحة على الطلب — اتصال معلّق بلا خطأ صريح من المتصفح كان سيُبقي
    // الزر على "جارٍ الإرسال..." إلى ما لا نهاية بلا أي مخرج للمستخدم.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);

    // يُرسَل إلى نفس جدول marketing_leads الذي يغذّي تبويب "العملاء
    // المحتملين" في bogga، بوسم source='consultation_survey' — راجع
    // lms/app/api/survey/route.js.
    try {
      const res = await fetch('/api/survey', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        signal:  controller.signal,
        body: JSON.stringify({
          parentName: answers.parentName.trim(),
          phone:      answers.whatsappNumber.trim(),
          childName:  answers.childName.trim(),
          answers: {
            childAgeBracket:        answers.childAge.trim(),
            schoolSystem:           answers.schoolSystem.trim(),
            developmentGoals:       answers.developmentGoals,
            currentLevelAssessment: answers.currentLevelAssessment,
            learningEnvironment:    answers.learningEnvironment,
            sessionsPerWeek:        answers.sessionsPerWeek,
            preferredTimes:         answers.preferredTimes,
            preferredTimesNote:     answers.preferredTimesNote.trim() || null,
            subscriptionPlan:       answers.subscriptionPlan,
          },
        }),
      });

      // فشل تطبيقي (400/429/500...) — يصل برسالة عربية جاهزة من الخادم
      // نفسه (راجع lms/app/api/survey/route.js)، تُعرَض كما هي بدل رسالة
      // عامة حين تتوفر.
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setSubmitError(data?.error || 'تعذّر إرسال البيانات. تحقق من اتصالك بالإنترنت وحاول مجدداً.');
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
    } catch (err) {
      // فشل الطلب نفسه (لا استجابة من الخادم إطلاقاً) — مهلة منتهية مقابل
      // أي عطل شبكة آخر، برسالتين منفصلتين كما طُلب.
      setSubmitError(
        err.name === 'AbortError'
          ? 'ضعف في الاتصال، يرجى المحاولة مرة أخرى.'
          : 'تعذّر إرسال البيانات. تحقق من اتصالك بالإنترنت وحاول مجدداً.'
      );
      setSubmitting(false);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  if (submitted) {
    const childFirstName = answers.childName.trim() || 'البطل';
    return (
      <div className="cs-wrap" dir="rtl">
        <style>{CS_STYLES}</style>
        <div className="cs-card cs-success">
          <div className="cs-success-icon">✓</div>
          <h2 className="cs-success-title">تم استلام البيانات بنجاح! ✅</h2>
          <p className="cs-success-text">
            يتم الآن إعداد الخطة المخصصة وسنتواصل معك قريباً عبر الواتساب.
          </p>
          {/* يوجّه ولي الأمر مباشرة لقمع "اختبار تحديد المستوى" التسويقي
              على assessment.aarem.net — تحويل ولي أمر انتهى للتو من استبانة
              الاستشارة إلى عميل محتمل ثانٍ بأقل احتكاك ممكن. */}
          <a href={QUICKTEST_URL} className="cs-cta-quicktest">
            دَع {childFirstName} يجرب اختبار المستوى الممتع الآن! (دقيقتين فقط)
          </a>
        </div>
      </div>
    );
  }

  const progressPct = Math.round((step / TOTAL_STEPS) * 100);

  return (
    <div className="cs-wrap" dir="rtl">
      <style>{CS_STYLES}</style>
      <form className="cs-card" onSubmit={handleSubmit}>
        <div className="cs-brand">
          <span className="cs-brand-badge">🎓 أكاديمية عارم</span>
          <span className="cs-brand-trust">معلومات الطالب</span>
        </div>

        <div className="cs-progress">
          <span className="cs-progress-label">خطوة {step} من {TOTAL_STEPS}</span>
          <div className="cs-progress-track">
            <div className="cs-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {step === 1 && (
          <div className="cs-step">
            <StepHeader title="لنتعرف على البطل 🦸" desc="خطوات سريعة لنفهم احتياجات طفلك بدقة" />

            <div className="cs-question">
              <label className="cs-question-label" htmlFor="cs-child-name">ما اسم البطل/البطلة؟ <span className="cs-hint">(الاسم الأول)</span></label>
              <input
                id="cs-child-name"
                className="cs-input"
                type="text"
                placeholder="مثال: سارة"
                value={answers.childName}
                onChange={e => setField('childName', e.target.value)}
              />
            </div>

            <div className="cs-question">
              <label className="cs-question-label" htmlFor="cs-child-age">كم عمر طفلك؟</label>
              <input
                id="cs-child-age"
                className="cs-input"
                type="text"
                placeholder="اكتب عمر الطفل أو صفه الدراسي (مثال: 7 سنوات، أو الصف الثاني ابتدائي)..."
                value={answers.childAge}
                onChange={e => setField('childAge', e.target.value)}
              />
            </div>

            <div className="cs-question">
              <label className="cs-question-label" htmlFor="cs-school-system">ما هو النظام المدرسي الحالي؟</label>
              <input
                id="cs-school-system"
                className="cs-input"
                type="text"
                placeholder="اكتب النظام المدرسي (مثال: دولي بريطاني، حكومي، فرنسي، تعليم منزلي)..."
                value={answers.schoolSystem}
                onChange={e => setField('schoolSystem', e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="cs-step">
            <StepHeader title="الأهداف والتحديات 🎯" desc="اختياران سريعان ليتضح لنا المسار الأنسب لطفلك" />

            <div className="cs-question">
              <div className="cs-question-label">ما هي أبرز الجوانب التي تود منا تطويرها؟ <span className="cs-hint">(اختر كل ما ينطبق)</span></div>
              <div className="cs-options-grid cs-options-grid-wide" role="group" aria-label="ما هي أبرز الجوانب التي تود منا تطويرها؟">
                {GOALS_OPTIONS.map(opt => (
                  <OptionCard
                    key={opt.value}
                    role="checkbox"
                    selected={answers.developmentGoals.includes(opt.value)}
                    onClick={() => toggleGoal(opt.value)}
                  >
                    <span className="cs-option-emoji">{opt.emoji}</span>
                    <span className="cs-option-text">
                      <span className="cs-option-title">{opt.label}</span>
                      {opt.sub && <span className="cs-option-sub">{opt.sub}</span>}
                    </span>
                  </OptionCard>
                ))}
              </div>
            </div>

            <div className="cs-question">
              <div className="cs-question-label">كيف تقيم مستوى طفلك الحالي في العربية؟</div>
              <div className="cs-options-grid cs-options-grid-wide" role="radiogroup" aria-label="كيف تقيم مستوى طفلك الحالي في العربية؟">
                {LEVEL_ASSESSMENT_OPTIONS.map(opt => (
                  <OptionCard key={opt} selected={answers.currentLevelAssessment === opt} onClick={() => setField('currentLevelAssessment', opt)}>
                    {opt}
                  </OptionCard>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="cs-step">
            <StepHeader title="تفضيلات التعلّم 📚" desc="لنرتّب جدولاً يناسبكم تماماً" />

            <div className="cs-question">
              <div className="cs-question-label">ما هي بيئة التعلم المفضلة؟</div>
              <div className="cs-options-grid" role="radiogroup" aria-label="ما هي بيئة التعلم المفضلة؟">
                {['درس خاص 1-on-1', 'ضمن مجموعة صغيرة'].map(opt => (
                  <OptionCard key={opt} selected={answers.learningEnvironment === opt} onClick={() => setField('learningEnvironment', opt)}>
                    {opt}
                  </OptionCard>
                ))}
              </div>
            </div>

            <div className="cs-question">
              <div className="cs-question-label">كم حصة أسبوعياً تناسب جدولكم؟</div>
              <div className="cs-options-grid" role="radiogroup" aria-label="كم حصة أسبوعياً تناسب جدولكم؟">
                {['حصتان', '3 حصص', 'أحتاج استشارتكم'].map(opt => (
                  <OptionCard key={opt} selected={answers.sessionsPerWeek === opt} onClick={() => setField('sessionsPerWeek', opt)}>
                    {opt}
                  </OptionCard>
                ))}
              </div>
            </div>

            <div className="cs-question">
              <div className="cs-question-label">الأوقات الأنسب؟</div>
              <div className="cs-options-grid" role="radiogroup" aria-label="الأوقات الأنسب؟">
                {['فترة العصر', 'فترة المساء', 'عطلة نهاية الأسبوع'].map(opt => (
                  <OptionCard key={opt} selected={answers.preferredTimes === opt} onClick={() => setField('preferredTimes', opt)}>
                    {opt}
                  </OptionCard>
                ))}
              </div>
              <textarea
                className="cs-textarea"
                rows={2}
                placeholder="أو اكتب الأيام والأوقات الدقيقة المناسبة لكم هنا... (اختياري)"
                value={answers.preferredTimesNote}
                onChange={e => setField('preferredTimesNote', e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="cs-step">
            <StepHeader title="خطة الاستثمار 💡" desc="ما هي خطة الاشتراك الأنسب لكم؟" />
            <div className="cs-options-grid cs-options-grid-wide" role="radiogroup" aria-label="ما هي خطة الاشتراك الأنسب لكم؟">
              {PLAN_OPTIONS.map(opt => (
                <OptionCard
                  key={opt.value}
                  selected={answers.subscriptionPlan === opt.value}
                  recommended={opt.recommended}
                  onClick={() => setField('subscriptionPlan', opt.value)}
                >
                  <span className="cs-option-text">
                    <span className="cs-option-title">{opt.label}</span>
                    <span className="cs-plan-badge">{opt.badge}</span>
                  </span>
                </OptionCard>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="cs-step">
            <StepHeader title="بيانات التواصل 📱" desc="خطوة أخيرة لإرسال الخطة التعليمية المناسبة لطفلك" />

            <div className="cs-question">
              <label className="cs-question-label" htmlFor="cs-parent-name">اسم ولي الأمر الكريم</label>
              <input
                id="cs-parent-name"
                className="cs-input"
                type="text"
                autoComplete="name"
                placeholder="مثال: محمد أحمد"
                value={answers.parentName}
                onChange={e => setField('parentName', e.target.value)}
              />
            </div>

            <div className="cs-question">
              <label className="cs-question-label" htmlFor="cs-whatsapp">رقم الواتساب <span className="cs-hint">(لإرسال الخطة)</span></label>
              <input
                id="cs-whatsapp"
                className="cs-input"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="مثال: 966500000000+"
                value={answers.whatsappNumber}
                onChange={e => setField('whatsappNumber', normalizeDigits(e.target.value))}
              />
            </div>

            {submitError && <div className="cs-error">⚠️ {submitError}</div>}
          </div>
        )}

        <div className="cs-nav">
          {step > 1 && (
            <button type="button" className="cs-btn cs-btn-secondary" onClick={goBack} disabled={submitting}>
              → السابق
            </button>
          )}
          {step < TOTAL_STEPS ? (
            <button type="button" className="cs-btn cs-btn-primary" onClick={goNext} disabled={!canProceed()}>
              التالي ←
            </button>
          ) : (
            <button type="submit" className="cs-btn cs-btn-primary cs-btn-submit" disabled={!canSubmit || submitting}>
              {submitting ? 'جارٍ الإرسال...' : 'احصل على الخطة التعليمية الآن'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

const CS_STYLES = `
  .cs-wrap {
    min-height: 100vh;
    width: 100%;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 24px 16px 48px;
    background: ${CREAM};
    box-sizing: border-box;
    font-family: 'Cairo', 'Tajawal', system-ui, sans-serif;
  }
  .cs-wrap * { box-sizing: border-box; }

  .cs-card {
    width: 100%;
    max-width: 480px;
    background: #fff;
    border-radius: 20px;
    box-shadow: 0 10px 30px rgba(26,43,74,.12);
    padding: 22px 20px 24px;
    margin-top: 16px;
  }

  .cs-brand {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 18px;
    flex-wrap: wrap;
    gap: 6px;
  }
  .cs-brand-badge {
    font-weight: 800;
    font-size: 1rem;
    color: ${NAVY};
  }
  .cs-brand-trust {
    font-size: .75rem;
    font-weight: 700;
    color: ${GREEN};
    background: rgba(42,187,122,.1);
    padding: 4px 10px;
    border-radius: 999px;
  }

  .cs-progress { margin-bottom: 22px; }
  .cs-progress-label {
    display: block;
    font-size: .8rem;
    font-weight: 700;
    color: ${NAVY};
    margin-bottom: 6px;
  }
  .cs-progress-track {
    width: 100%;
    height: 8px;
    border-radius: 999px;
    background: ${CREAM};
    overflow: hidden;
  }
  .cs-progress-fill {
    height: 100%;
    border-radius: 999px;
    background: ${GREEN};
    transition: width .35s ease;
  }

  .cs-step-title {
    font-size: 1.2rem;
    font-weight: 800;
    color: ${NAVY};
    margin: 0 0 4px;
  }
  .cs-step-desc {
    font-size: .85rem;
    color: #64748B;
    margin: 0 0 18px;
  }

  .cs-question { margin-bottom: 18px; }
  .cs-question:last-child { margin-bottom: 0; }
  .cs-question-label {
    display: block;
    font-size: 1.08rem;
    font-weight: 700;
    color: #0F172A;
    margin-bottom: 10px;
  }
  .cs-hint {
    font-size: .85rem;
    font-weight: 500;
    color: #64748B;
  }

  .cs-options-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  .cs-options-grid-wide { grid-template-columns: 1fr; }

  .cs-option {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    text-align: right;
    padding: 14px 12px;
    border: 2px solid #e5e0d8;
    border-radius: 14px;
    background: #fff;
    font-family: inherit;
    font-size: .92rem;
    font-weight: 600;
    color: #0F172A;
    cursor: pointer;
    transition: border-color .15s, background .15s, transform .1s;
  }
  .cs-option:active { transform: scale(.98); }
  .cs-option.selected {
    border-color: ${GOLD};
    background: rgba(232,184,75,.14);
    color: #8a6a1e;
  }
  .cs-option.recommended {
    border-color: rgba(232,184,75,.5);
  }
  .cs-option.recommended.selected {
    border-color: ${GOLD};
  }

  .cs-option-emoji { font-size: 1.6rem; line-height: 1; flex-shrink: 0; }
  .cs-option-text { display: flex; flex-direction: column; gap: 2px; }
  .cs-option-title { font-weight: 600; color: #0F172A; }
  .cs-option-sub { font-size: .8rem; font-weight: 500; color: #64748B; }
  .cs-option.selected .cs-option-title { color: #8a6a1e; }
  .cs-option.selected .cs-option-sub  { color: #a1793a; }

  .cs-plan-badge {
    display: inline-block;
    width: fit-content;
    font-size: .72rem;
    font-weight: 700;
    color: ${NAVY};
    background: rgba(232,184,75,.25);
    padding: 2px 9px;
    border-radius: 999px;
    margin-top: 2px;
  }

  .cs-input, .cs-textarea {
    width: 100%;
    padding: 13px 14px;
    border: 2px solid #e5e0d8;
    border-radius: 12px;
    font-family: inherit;
    font-size: 1rem;
    color: ${NAVY};
    background: #fff;
    outline: none;
    transition: border-color .15s, box-shadow .15s;
  }
  .cs-input:focus, .cs-textarea:focus { border-color: ${GOLD}; box-shadow: 0 0 0 3px rgba(232,184,75,.18); }

  .cs-textarea {
    margin-top: 10px;
    resize: vertical;
    min-height: 56px;
    line-height: 1.6;
  }
  .cs-textarea::placeholder { color: #9a9488; }

  .cs-error {
    margin-top: 14px;
    padding: 10px 14px;
    border-radius: 10px;
    background: #fdeceb;
    color: #b3261e;
    font-size: .85rem;
    font-weight: 600;
  }

  .cs-nav {
    display: flex;
    gap: 10px;
    margin-top: 24px;
  }
  .cs-btn {
    flex: 1;
    padding: 15px 16px;
    border-radius: 14px;
    border: none;
    font-family: inherit;
    font-size: 1rem;
    font-weight: 800;
    cursor: pointer;
    transition: opacity .15s, transform .1s;
  }
  .cs-btn:active { transform: scale(.98); }
  .cs-btn:disabled { opacity: .45; cursor: not-allowed; }

  .cs-btn-primary {
    background: ${GOLD};
    color: ${NAVY};
  }
  .cs-btn-secondary {
    background: transparent;
    color: ${NAVY};
    border: 2px solid #e5e0d8;
    flex: 0 0 auto;
  }
  .cs-btn-submit { font-size: 1.05rem; }

  .cs-success {
    text-align: center;
    padding: 40px 24px;
  }
  .cs-success-icon {
    width: 68px;
    height: 68px;
    line-height: 68px;
    border-radius: 50%;
    background: ${GREEN};
    color: #fff;
    font-size: 2rem;
    font-weight: 800;
    margin: 0 auto 18px;
  }
  .cs-success-title {
    font-size: 1.3rem;
    font-weight: 800;
    color: ${NAVY};
    margin: 0 0 12px;
  }
  .cs-success-text {
    font-size: .95rem;
    color: #4b5563;
    line-height: 1.7;
    margin: 0 0 10px;
  }
  .cs-cta-quicktest {
    display: inline-block;
    margin-top: 22px;
    padding: 16px 22px;
    border-radius: 14px;
    background: ${GOLD};
    color: ${NAVY};
    font-weight: 800;
    font-size: 1rem;
    text-decoration: none;
    box-shadow: 0 6px 18px rgba(232,184,75,.45);
    transition: transform .15s, box-shadow .15s;
  }
  .cs-cta-quicktest:active { transform: scale(.97); }

  @media (max-width: 380px) {
    .cs-card { padding: 18px 14px 20px; border-radius: 16px; }
    .cs-options-grid { grid-template-columns: 1fr; }
  }
`;
