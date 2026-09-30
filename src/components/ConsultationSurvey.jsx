import { useState } from 'react';

// نفس نمط src/quicktest/LeadGate.jsx بالضبط — الموقع العام (Vite،
// assessment.aarem.net) يرسل مباشرة لمسار الـLMS (Next.js، aarem.net)
// عبر سرّ ويبهوك مشترك (VITE_ASSESSMENT_WEBHOOK_SECRET، مُضمَّن في حزمة
// العميل بتصميم قائم مسبقاً — راجع lms/app/api/leads/route.js).
const LMS_URL = 'https://www.aarem.net';

// لوحة الألوان الرسمية لأكاديمية عارم (القسم 2.1 من CLAUDE.md) — لا ألوان
// خارجها. الذهبي للاختيار/الأزرار الأساسية (القاعدة الذهبية للزر، 2.2)،
// الأخضر حصراً لشريط التقدّم المكتمل وشاشة النجاح، البنفسجي غير مستخدَم هنا
// (محجوز لفهيم فقط، القسم 2.4).
const NAVY   = '#1A2B4A';
const GOLD   = '#E8B84B';
const CREAM  = '#F4EFE6';
const GREEN  = '#2ABB7A';

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

const INITIAL_ANSWERS = {
  childAge: '',
  schoolSystem: '',
  developmentGoals: [],
  learningEnvironment: '',
  sessionsPerWeek: '',
  preferredTimes: '',
  subscriptionPlan: '',
  parentName: '',
  whatsappNumber: '',
};

function OptionCard({ selected, onClick, children, recommended }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
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

export default function ConsultationSurvey() {
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
      case 1: return !!answers.childAge && !!answers.schoolSystem;
      case 2: return answers.developmentGoals.length > 0;
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

    // يُرسَل إلى نفس جدول marketing_leads الذي يغذّي تبويب "العملاء
    // المحتملين" في bogga، بوسم source مختلف (consultation_survey مقابل
    // quick_test) بدل جدول منفصل — راجع lms/app/api/leads/route.js.
    // لا اسم طفل يُجمَع في هذه الاستبانة أصلاً، فتُترَك تفاصيل الاختيارات
    // كاملة ضمن answers ليراجعها المدير قبل تواصل واتساب.
    try {
      const res = await fetch(`${LMS_URL}/api/leads`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'x-webhook-secret': import.meta.env.VITE_ASSESSMENT_WEBHOOK_SECRET ?? '' },
        body: JSON.stringify({
          parentName: answers.parentName.trim(),
          phone:      answers.whatsappNumber.trim(),
          source:     'consultation_survey',
          answers: {
            childAgeBracket:     answers.childAge,
            schoolSystem:        answers.schoolSystem,
            developmentGoals:    answers.developmentGoals,
            learningEnvironment: answers.learningEnvironment,
            sessionsPerWeek:     answers.sessionsPerWeek,
            preferredTimes:      answers.preferredTimes,
            subscriptionPlan:    answers.subscriptionPlan,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'فشل الإرسال');
      setSubmitted(true);
    } catch {
      setSubmitError('تعذّر إرسال البيانات. تحقق من اتصالك بالإنترنت وحاول مجدداً.');
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="cs-wrap" dir="rtl">
        <style>{CS_STYLES}</style>
        <div className="cs-card cs-success">
          <div className="cs-success-icon">✓</div>
          <h2 className="cs-success-title">شكراً لك، {answers.parentName.split(' ')[0]}! 🌟</h2>
          <p className="cs-success-text">
            استلمنا بياناتك بنجاح، وفريقنا التعليمي يعمل الآن على تجهيز الخطة الأنسب لطفلك.
          </p>
          <p className="cs-success-text cs-success-sub">
            سنتواصل معك قريباً عبر واتساب على الرقم <strong>{answers.whatsappNumber}</strong> لإرسال التفاصيل الكاملة.
          </p>
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
          <span className="cs-brand-trust">استشارة تعليمية مجانية</span>
        </div>

        <div className="cs-progress">
          <span className="cs-progress-label">خطوة {step} من {TOTAL_STEPS}</span>
          <div className="cs-progress-track">
            <div className="cs-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {step === 1 && (
          <div className="cs-step">
            <StepHeader title="لنتعرف على البطل 🦸" desc="خطوتان سريعتان لنفهم احتياجات طفلك بدقة" />

            <div className="cs-question">
              <div className="cs-question-label">كم عمر طفلك؟</div>
              <div className="cs-options-grid">
                {['5-7 سنوات', '8-10 سنوات', '11-13 سنة', '14 سنة فما فوق'].map(opt => (
                  <OptionCard key={opt} selected={answers.childAge === opt} onClick={() => setField('childAge', opt)}>
                    {opt}
                  </OptionCard>
                ))}
              </div>
            </div>

            <div className="cs-question">
              <div className="cs-question-label">ما هو النظام المدرسي الحالي؟</div>
              <div className="cs-options-grid">
                {['دولي', 'وطني/حكومي', 'لغات/مزدوج'].map(opt => (
                  <OptionCard key={opt} selected={answers.schoolSystem === opt} onClick={() => setField('schoolSystem', opt)}>
                    {opt}
                  </OptionCard>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="cs-step">
            <StepHeader title="الأهداف والتحديات 🎯" desc="اختر كل ما ينطبق — يمكنك تحديد أكثر من جانب" />
            <div className="cs-options-grid cs-options-grid-wide">
              {GOALS_OPTIONS.map(opt => (
                <OptionCard
                  key={opt.value}
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
        )}

        {step === 3 && (
          <div className="cs-step">
            <StepHeader title="تفضيلات التعلّم 📚" desc="لنرتّب جدولاً يناسبكم تماماً" />

            <div className="cs-question">
              <div className="cs-question-label">ما هي بيئة التعلم المفضلة؟</div>
              <div className="cs-options-grid">
                {['درس خاص 1-on-1', 'ضمن مجموعة صغيرة'].map(opt => (
                  <OptionCard key={opt} selected={answers.learningEnvironment === opt} onClick={() => setField('learningEnvironment', opt)}>
                    {opt}
                  </OptionCard>
                ))}
              </div>
            </div>

            <div className="cs-question">
              <div className="cs-question-label">كم حصة أسبوعياً تناسب جدولكم؟</div>
              <div className="cs-options-grid">
                {['حصتان', '3 حصص', 'أحتاج استشارتكم'].map(opt => (
                  <OptionCard key={opt} selected={answers.sessionsPerWeek === opt} onClick={() => setField('sessionsPerWeek', opt)}>
                    {opt}
                  </OptionCard>
                ))}
              </div>
            </div>

            <div className="cs-question">
              <div className="cs-question-label">الأوقات الأنسب؟</div>
              <div className="cs-options-grid">
                {['فترة العصر', 'فترة المساء', 'عطلة نهاية الأسبوع'].map(opt => (
                  <OptionCard key={opt} selected={answers.preferredTimes === opt} onClick={() => setField('preferredTimes', opt)}>
                    {opt}
                  </OptionCard>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="cs-step">
            <StepHeader title="خطة الاستثمار 💡" desc="ما هي خطة الاشتراك الأنسب لكم؟" />
            <div className="cs-options-grid cs-options-grid-wide">
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
                placeholder="مثال: محمد أحمد"
                value={answers.parentName}
                onChange={e => setField('parentName', e.target.value)}
              />
            </div>

            <div className="cs-question">
              <label className="cs-question-label" htmlFor="cs-whatsapp">رقم الواتساب (لإرسال الخطة)</label>
              <input
                id="cs-whatsapp"
                className="cs-input"
                type="tel"
                inputMode="tel"
                placeholder="مثال: 966500000000+"
                value={answers.whatsappNumber}
                onChange={e => setField('whatsappNumber', e.target.value)}
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
    color: #6b7280;
    margin: 0 0 18px;
  }

  .cs-question { margin-bottom: 18px; }
  .cs-question:last-child { margin-bottom: 0; }
  .cs-question-label {
    display: block;
    font-size: .95rem;
    font-weight: 700;
    color: ${NAVY};
    margin-bottom: 10px;
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
    color: ${NAVY};
    cursor: pointer;
    transition: border-color .15s, background .15s, transform .1s;
  }
  .cs-option:active { transform: scale(.98); }
  .cs-option.selected {
    border-color: ${GOLD};
    background: rgba(232,184,75,.14);
  }
  .cs-option.recommended {
    border-color: rgba(232,184,75,.5);
  }
  .cs-option.recommended.selected {
    border-color: ${GOLD};
  }

  .cs-option-emoji { font-size: 1.6rem; line-height: 1; flex-shrink: 0; }
  .cs-option-text { display: flex; flex-direction: column; gap: 2px; }
  .cs-option-title { font-weight: 700; }
  .cs-option-sub { font-size: .75rem; font-weight: 500; color: #6b7280; }

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

  .cs-input {
    width: 100%;
    padding: 13px 14px;
    border: 2px solid #e5e0d8;
    border-radius: 12px;
    font-family: inherit;
    font-size: .95rem;
    color: ${NAVY};
    background: #fff;
    outline: none;
    transition: border-color .15s;
  }
  .cs-input:focus { border-color: ${GOLD}; }

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
  .cs-success-sub { color: ${NAVY}; }

  @media (max-width: 380px) {
    .cs-card { padding: 18px 14px 20px; border-radius: 16px; }
    .cs-options-grid { grid-template-columns: 1fr; }
  }
`;
