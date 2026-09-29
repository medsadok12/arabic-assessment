import { useState, useEffect } from 'react';
import '../App.css';
import {
  QUESTIONS as FALLBACK_QUESTIONS, LEVELS as FALLBACK_LEVELS, DEFAULT_WHATSAPP_TEMPLATE,
  ALPHABET_LETTERS as FALLBACK_ALPHABET_LETTERS, DEFAULT_ALPHABET_ENABLED, DEFAULT_ALPHABET_TITLE, DEFAULT_ALPHABET_SUBTITLE,
  VOICE_SENTENCES as FALLBACK_VOICE_SENTENCES, DEFAULT_VOICE_ENABLED, DEFAULT_VOICE_TITLE, DEFAULT_VOICE_SUBTITLE,
  WORD_COMPLETION_ITEMS as FALLBACK_WORD_COMPLETION_ITEMS, DEFAULT_WORD_COMPLETION_ENABLED, DEFAULT_WORD_COMPLETION_TITLE, DEFAULT_WORD_COMPLETION_SUBTITLE,
} from './blueprint.js';
import { getQuicktestData } from './fetchQuicktestData.js';
import { pickLevelByScore } from './pickLevel.js';
import { isQuickTestAdminPreview, QUICK_TEST_PREVIEW_STUDENT } from './quickTestMode.js';
import QuickQuestion from './QuickQuestion.jsx';
import AlphabetGridAssessment from './AlphabetGridAssessment.jsx';
import MatchingAssessment from './MatchingAssessment.jsx';
import { MATCHING_EXERCISES_FALLBACK } from './matchingData.js';
import VoiceReadingAssessment from './VoiceReadingAssessment.jsx';
import WordCompletionAssessment from './WordCompletionAssessment.jsx';
import LeadGate from './LeadGate.jsx';

const PAGES = {
  LOADING: 'loading', START: 'start', ALPHABET: 'alphabet',
  MATCHING1: 'matching1', MATCHING2: 'matching2', VOICE: 'voice', WORD_COMPLETION: 'word_completion',
  ASSESSMENT: 'assessment', GATE: 'gate', RESULT: 'result',
};

// يُحسَب مرة واحدة عند تحميل الصفحة (لا يتغيّر أثناء الجلسة) — نفس نمط
// adminPreviewLevel في App.jsx الحقيقي.
const adminPreview = isQuickTestAdminPreview();

// كل التدريبات (مطابقة×2/قراءة جهرية/إكمال الكلمة) قابلة للتعطيل من اللوحة
// الآن (بخلاف تمرين الحروف الذي له علم enabled واحد فقط أصلاً) — هذه
// الدوال تحسب الصفحة التالية الصحيحة بتخطّي أي تدريب معطَّل، بترتيب ثابت
// (matching-1 ← matching-2 ← القراءة الجهرية ← إكمال الكلمة ← الأسئلة الـ15).
function afterVoicePage(wordCompletionEnabled) {
  return wordCompletionEnabled ? PAGES.WORD_COMPLETION : PAGES.ASSESSMENT;
}
function afterMatchingPage(voiceEnabled, wordCompletionEnabled) {
  return voiceEnabled ? PAGES.VOICE : afterVoicePage(wordCompletionEnabled);
}
function firstEnabledMatchingPage(exercises, voiceEnabled, wordCompletionEnabled) {
  if (exercises[0]?.enabled) return PAGES.MATCHING1;
  if (exercises[1]?.enabled) return PAGES.MATCHING2;
  return afterMatchingPage(voiceEnabled, wordCompletionEnabled);
}
function pageAfterMatching1(exercises, voiceEnabled, wordCompletionEnabled) {
  return exercises[1]?.enabled ? PAGES.MATCHING2 : afterMatchingPage(voiceEnabled, wordCompletionEnabled);
}

/**
 * تدفق مستقل تماماً عن App.jsx — قمع تسويقي عام بلا كود تقييم (راجع
 * quickTestMode.js). الأسئلة/المستويات/قالب واتساب تُجلب ديناميكياً من
 * لوحة bogga (تبويب "إدارة الاختبار الترويجي") عبر fetchQuicktestData —
 * مع سقوط تلقائي وصامت لمحتوى blueprint.js الثابت عند أي فشل، فلا يتعطل
 * القمع أمام أي زائر مهما حدث لقاعدة البيانات (نفس فلسفة بنك التقييم
 * الحقيقي الثابت في src/data/questions.js).
 *
 * المستوى النهائي يُحدَّد من عدد الإجابات الصحيحة مقابل نطاق [أدنى,أعلى]
 * قابل للتعديل لكل مستوى (pickLevelByScore) — لا من موضع الأسئلة، لأن
 * الأسئلة نفسها قابلة للتعديل من نفس اللوحة.
 */
export default function QuickTestApp() {
  const [page, setPage]               = useState(PAGES.LOADING);
  const [questions, setQuestions]     = useState(FALLBACK_QUESTIONS);
  const [levels, setLevels]           = useState(FALLBACK_LEVELS);
  const [waTemplate, setWaTemplate]   = useState(DEFAULT_WHATSAPP_TEMPLATE);
  const [alphabetLetters, setAlphabetLetters]   = useState(FALLBACK_ALPHABET_LETTERS);
  const [alphabetEnabled, setAlphabetEnabled]   = useState(DEFAULT_ALPHABET_ENABLED);
  const [alphabetTitle, setAlphabetTitle]       = useState(DEFAULT_ALPHABET_TITLE);
  const [alphabetSubtitle, setAlphabetSubtitle] = useState(DEFAULT_ALPHABET_SUBTITLE);
  const [matchingExercises, setMatchingExercises] = useState(MATCHING_EXERCISES_FALLBACK);
  const [voiceSentences, setVoiceSentences] = useState(FALLBACK_VOICE_SENTENCES);
  const [voiceEnabled, setVoiceEnabled]     = useState(DEFAULT_VOICE_ENABLED);
  const [voiceTitle, setVoiceTitle]         = useState(DEFAULT_VOICE_TITLE);
  const [voiceSubtitle, setVoiceSubtitle]   = useState(DEFAULT_VOICE_SUBTITLE);
  const [wordCompletionItems, setWordCompletionItems]       = useState(FALLBACK_WORD_COMPLETION_ITEMS);
  const [wordCompletionEnabled, setWordCompletionEnabled]   = useState(DEFAULT_WORD_COMPLETION_ENABLED);
  const [wordCompletionTitle, setWordCompletionTitle]       = useState(DEFAULT_WORD_COMPLETION_TITLE);
  const [wordCompletionSubtitle, setWordCompletionSubtitle] = useState(DEFAULT_WORD_COMPLETION_SUBTITLE);
  const [childName, setChildName]     = useState(adminPreview ? QUICK_TEST_PREVIEW_STUDENT.name : '');
  const [childAge, setChildAge]       = useState(adminPreview ? QUICK_TEST_PREVIEW_STUDENT.age : '');
  const [startError, setStartError]   = useState('');
  const [questionIdx, setQuestionIdx] = useState(0);
  const [answers, setAnswers]         = useState([]);
  const [level, setLevel]             = useState(null);

  useEffect(() => {
    let cancelled = false;
    getQuicktestData().then(data => {
      if (cancelled) return;
      // تمرين الحروف يُقيَّم بشكل مستقل عن مصدر الأسئلة/المستويات — حتى
      // لو فشلت قراءة أحدهما، الآخر يبقى ديناميكياً إن نجح جلبه (تفادياً
      // لفشل شامل بلا داعٍ). كل حقل يُستبدَل فقط إن وصل بشكل سليم فعلاً.
      let effectiveAlphabetEnabled = DEFAULT_ALPHABET_ENABLED;
      let effectiveMatching = MATCHING_EXERCISES_FALLBACK;
      let effectiveVoiceEnabled = DEFAULT_VOICE_ENABLED;
      let effectiveWordCompletionEnabled = DEFAULT_WORD_COMPLETION_ENABLED;
      if (data.source === 'database') {
        setQuestions(data.questions);
        setLevels(data.levels);
        if (data.whatsappTemplate) setWaTemplate(data.whatsappTemplate);
        if (Array.isArray(data.alphabetLetters) && data.alphabetLetters.length > 0) setAlphabetLetters(data.alphabetLetters);
        if (typeof data.alphabetEnabled === 'boolean') { setAlphabetEnabled(data.alphabetEnabled); effectiveAlphabetEnabled = data.alphabetEnabled; }
        if (data.alphabetTitle) setAlphabetTitle(data.alphabetTitle);
        if (data.alphabetSubtitle) setAlphabetSubtitle(data.alphabetSubtitle);
        // كل تدريب مطابقة يُدمَج بمعزل عن الآخر — تدريب بأزواج فعلية من
        // القاعدة يحلّ محل الاحتياطي، وتدريب فارغ/فاشل يبقى على نسخته
        // الثابتة، فلا يسقط تدريبان معاً بسبب فشل واحد منهما فقط.
        if (Array.isArray(data.matchingExercises)) {
          effectiveMatching = MATCHING_EXERCISES_FALLBACK.map(fallbackEx => {
            const dbEx = data.matchingExercises.find(e => e.key === fallbackEx.key);
            return (dbEx && Array.isArray(dbEx.pairs) && dbEx.pairs.length > 0) ? { ...fallbackEx, ...dbEx } : fallbackEx;
          });
          setMatchingExercises(effectiveMatching);
        }
        // القراءة الجهرية بمعزل تام عن بقية التدريبات — نفس فلسفة الحروف.
        if (Array.isArray(data.voiceSentences) && data.voiceSentences.length > 0) setVoiceSentences(data.voiceSentences);
        if (typeof data.voiceEnabled === 'boolean') { setVoiceEnabled(data.voiceEnabled); effectiveVoiceEnabled = data.voiceEnabled; }
        if (data.voiceTitle) setVoiceTitle(data.voiceTitle);
        if (data.voiceSubtitle) setVoiceSubtitle(data.voiceSubtitle);
        // تدريب إكمال الكلمة الناقصة بمعزل تام عن بقية التدريبات.
        if (Array.isArray(data.wordCompletionItems) && data.wordCompletionItems.length > 0) setWordCompletionItems(data.wordCompletionItems);
        if (typeof data.wordCompletionEnabled === 'boolean') { setWordCompletionEnabled(data.wordCompletionEnabled); effectiveWordCompletionEnabled = data.wordCompletionEnabled; }
        if (data.wordCompletionTitle) setWordCompletionTitle(data.wordCompletionTitle);
        if (data.wordCompletionSubtitle) setWordCompletionSubtitle(data.wordCompletionSubtitle);
      }
      // معاينة المشرف: تخطَّ شاشة بيانات البداية فقط (بيانات وهمية ثابتة
      // أصلاً) وابدأ من أول خطوة فعلياً مفعَّلة — نفس تجربة الزائر الحقيقي
      // بالضبط بلا نقصان، فـ"جرّب الاختبار فعلياً" يعني التجربة كاملة.
      setPage(adminPreview
        ? (effectiveAlphabetEnabled ? PAGES.ALPHABET : firstEnabledMatchingPage(effectiveMatching, effectiveVoiceEnabled, effectiveWordCompletionEnabled))
        : PAGES.START);
    });
    return () => { cancelled = true; };
  }, []);

  function handleStart() {
    if (!childName.trim() || !childAge) {
      setStartError('يرجى إدخال اسم الطفل وعمره');
      return;
    }
    if (+childAge < 3 || +childAge > 15) {
      setStartError('هذا الاختبار مخصص لأعمار 3 إلى 15 سنة');
      return;
    }
    setStartError('');
    setAnswers([]);
    setQuestionIdx(0);
    setPage(alphabetEnabled ? PAGES.ALPHABET : firstEnabledMatchingPage(matchingExercises, voiceEnabled, wordCompletionEnabled));
  }

  function handleAlphabetComplete(detail) {
    setAnswers(prev => [...prev, detail]);
    setPage(firstEnabledMatchingPage(matchingExercises, voiceEnabled, wordCompletionEnabled));
  }

  function handleMatching1Complete(detail) {
    setAnswers(prev => [...prev, detail]);
    setPage(pageAfterMatching1(matchingExercises, voiceEnabled, wordCompletionEnabled));
  }

  function handleMatching2Complete(detail) {
    setAnswers(prev => [...prev, detail]);
    setPage(afterMatchingPage(voiceEnabled, wordCompletionEnabled));
  }

  function handleVoiceComplete(detail) {
    setAnswers(prev => [...prev, detail]);
    setPage(afterVoicePage(wordCompletionEnabled));
  }

  function handleWordCompletionComplete(detail) {
    setAnswers(prev => [...prev, detail]);
    setQuestionIdx(0);
    setPage(PAGES.ASSESSMENT);
  }

  // زر "تخطي" خاص بوضع معاينة المشرف فقط — طلب صريح من الأستاذ محمد: مراجعة
  // كل تدريب (حروف/مطابقة×2/قراءة جهرية) بالكامل في كل مرة لرؤية ما بعده
  // مرهق أثناء المراجعة الإدارية. يستدعي نفس معالج الإكمال الحقيقي لكل
  // صفحة بتفاصيل وهمية فارغة (لا تُرسَل لأي مكان أصلاً في وضع المعاينة)، فلا
  // منطق تنقّل جديد يُضاف — فقط تجاوز شرط "أكمل التدريب أولاً".
  const SKIPPABLE_PAGES = [PAGES.ALPHABET, PAGES.MATCHING1, PAGES.MATCHING2, PAGES.VOICE, PAGES.WORD_COMPLETION];
  function handleAdminSkip() {
    if (page === PAGES.ALPHABET) {
      handleAlphabetComplete({ type: 'alphabet-grid', questionId: 'alphabet-grid', skillTag: 'التعرف على الحروف الأبجدية', masteredLetters: [], needsReviewLetters: [] });
    } else if (page === PAGES.MATCHING1 || page === PAGES.MATCHING2) {
      const ex = page === PAGES.MATCHING1 ? matchingExercises[0] : matchingExercises[1];
      const detail = { type: 'matching', questionId: ex.key, skillTag: ex.skillTag, label: ex.label, correctWords: [], needsReviewWords: [] };
      if (page === PAGES.MATCHING1) handleMatching1Complete(detail);
      else handleMatching2Complete(detail);
    } else if (page === PAGES.VOICE) {
      handleVoiceComplete({ type: 'voice-reading', questionId: 'voice-reading', skillTag: 'القراءة الجهرية', recordings: [] });
    } else if (page === PAGES.WORD_COMPLETION) {
      handleWordCompletionComplete({ type: 'word-completion', questionId: 'word-completion', skillTag: 'تهجئة', items: [] });
    }
  }

  function handleAnswer(detail) {
    const updated = [...answers, detail];
    if (questionIdx + 1 < questions.length) {
      setAnswers(updated);
      setQuestionIdx(i => i + 1);
      return;
    }
    const correctCount = updated.filter(a => a.isCorrect).length;
    setLevel(pickLevelByScore(correctCount, levels));
    // معاينة المشرف: لا بوابة تواصل، ولا أي إرسال لـ/api/leads — تجربة
    // بحتة لمراجعة محتوى الأسئلة الحيّ فوراً.
    setPage(adminPreview ? PAGES.RESULT : PAGES.GATE);
  }

  const progressPct = page === PAGES.ASSESSMENT
    ? Math.round((questionIdx / questions.length) * 100)
    : (page === PAGES.START || page === PAGES.LOADING ? 0 : 100);

  return (
    <div className="app">
      {adminPreview && (
        <div style={{ background: '#E8B84B', color: '#1A2B4A', textAlign: 'center', padding: '8px', fontSize: 14, fontWeight: 'bold' }}>
          🚀 وضع معاينة المشرف — تجريبي بالكامل، لن يُحفَظ أو يُرسَل لأي نظام
        </div>
      )}

      {adminPreview && SKIPPABLE_PAGES.includes(page) && (
        <button
          type="button"
          onClick={handleAdminSkip}
          style={{
            position: 'fixed', bottom: 18, left: 18, zIndex: 200,
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#1A2B4A', color: '#E8B84B', border: '2px solid #E8B84B',
            borderRadius: 999, padding: '11px 20px', fontWeight: 800, fontSize: '.88rem',
            cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,.3)',
          }}
        >
          ⏭️ تخطي هذا التدريب (وضع الإدارة)
        </button>
      )}
      <header className="app-header">
        <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="عارم أكاديمي" className="header-logo-img" />
        <div className="header-text">
          <div className="header-h1-row">
            <h1 lang="ar">عارم أكاديمي</h1>
          </div>
          <span className="header-en">AREM ACADEMY</span>
          <p>🎯 اختبار تحديد المستوى المجاني — بضع دقائق فقط</p>
        </div>
      </header>

      {page !== PAGES.START && page !== PAGES.LOADING && page !== PAGES.ALPHABET
        && page !== PAGES.MATCHING1 && page !== PAGES.MATCHING2 && page !== PAGES.VOICE && page !== PAGES.WORD_COMPLETION && (
        <div className="global-progress">
          <div className="gp-info">
            <span>التقدم</span>
            <span>{progressPct}%</span>
          </div>
          <div className="gp-bar">
            <div className="gp-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}

      <main className="app-main">
        {page === PAGES.LOADING && (
          <div className="page-content" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }} />
          </div>
        )}

        {page === PAGES.START && (
          <div className="page-content">
            <h2 className="page-title">اختبار تحديد المستوى المجاني</h2>
            <p className="page-subtitle">
              أسئلة بسيطة وممتعة ومتدرجة (بضع دقائق) لمعرفة مستوى طفلك الحالي في اللغة العربية فوراً — بلا أي التزام.
            </p>
            <div className="form-group">
              <label>اسم الطفل *</label>
              <input type="text" placeholder="مثال: يوسف" value={childName} onChange={e => setChildName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>عمر الطفل *</label>
              <input type="number" min="3" max="15" placeholder="مثال: 6" value={childAge} onChange={e => setChildAge(e.target.value)} />
            </div>
            {startError && <div className="error-msg">⚠️ {startError}</div>}
            <button className="btn-primary" onClick={handleStart}>ابدأ الاختبار ←</button>
          </div>
        )}

        {page === PAGES.ALPHABET && (
          <AlphabetGridAssessment
            letters={alphabetLetters}
            title={alphabetTitle}
            subtitle={alphabetSubtitle}
            onComplete={handleAlphabetComplete}
          />
        )}

        {page === PAGES.MATCHING1 && (
          <MatchingAssessment
            pairs={matchingExercises[0].pairs}
            label={matchingExercises[0].label}
            title={matchingExercises[0].title}
            subtitle={matchingExercises[0].subtitle}
            questionId={matchingExercises[0].key}
            skillTag={matchingExercises[0].skillTag}
            onComplete={handleMatching1Complete}
          />
        )}

        {page === PAGES.MATCHING2 && (
          <MatchingAssessment
            pairs={matchingExercises[1].pairs}
            label={matchingExercises[1].label}
            title={matchingExercises[1].title}
            subtitle={matchingExercises[1].subtitle}
            questionId={matchingExercises[1].key}
            skillTag={matchingExercises[1].skillTag}
            onComplete={handleMatching2Complete}
          />
        )}

        {page === PAGES.VOICE && (
          <VoiceReadingAssessment
            sentences={voiceSentences}
            title={voiceTitle}
            subtitle={voiceSubtitle}
            onComplete={handleVoiceComplete}
          />
        )}

        {page === PAGES.WORD_COMPLETION && (
          <WordCompletionAssessment
            items={wordCompletionItems}
            title={wordCompletionTitle}
            subtitle={wordCompletionSubtitle}
            onComplete={handleWordCompletionComplete}
          />
        )}

        {page === PAGES.ASSESSMENT && (
          <QuickQuestion
            key={questionIdx}
            question={questions[questionIdx]}
            questionNumber={questionIdx + 1}
            total={questions.length}
            onAnswer={handleAnswer}
          />
        )}

        {page === PAGES.GATE && level && (
          <LeadGate
            childName={childName}
            childAge={+childAge}
            score={Math.round((answers.filter(a => a.isCorrect).length / questions.length) * 100)}
            levelLabel={level.label}
            answers={answers}
            onDone={() => setPage(PAGES.RESULT)}
          />
        )}

        {page === PAGES.RESULT && level && (
          <QuickTestResult childName={childName} level={level} waTemplate={waTemplate} />
        )}
      </main>
    </div>
  );
}

/**
 * تقرير تقييمي وصفي — لا نسبة مئوية أو أبعاد مفصَّلة، بطلب صريح من
 * الأستاذ محمد: بطاقة بسيطة وواضحة (نقاط القوة + التوصية + برنامج محدد)
 * تدفع ولي الأمر للتواصل فوراً، لا جدول أرقام تقني.
 */
function QuickTestResult({ childName, level, waTemplate }) {
  const waText = waTemplate
    .replaceAll('{childName}', childName)
    .replaceAll('{program}', level.program)
    .replaceAll('{المستوى}', level.label)
    .replaceAll('{level}', level.label);

  return (
    <div className="page-content">
      <div className="results-header">
        <div className="results-icon">{level.icon}</div>
        <h2>🌟 تقرير تقييم مستوى طفلك ({childName})</h2>
        <p>{level.label}</p>
      </div>

      <div className="thankyou-card">
        <p style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary)', textAlign: 'center', lineHeight: 1.9 }}>
          {level.strengths}
        </p>
      </div>

      <div className="thankyou-card" style={{ marginTop: 14, textAlign: 'center' }}>
        <div className="thankyou-icon">🎯</div>
        <p className="thankyou-title">التوصية التربوية من أكاديمية عارم</p>
        <p style={{ color: 'var(--text-light)', fontSize: '.92rem', lineHeight: 1.9, margin: '8px 0 14px' }}>
          {level.recommendation}
        </p>
        <p className="thankyou-sub" style={{ fontWeight: 700, color: 'var(--primary)' }}>
          {level.program}
        </p>
        <p className="thankyou-sub">{level.programPitch}</p>
        <a
          href={`https://api.whatsapp.com/send/?phone=447400755914&text=${encodeURIComponent(waText)}&type=phone_number&app_absent=0`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none', marginTop: 14 }}
        >
          📱 تواصل مع الأستاذ عبر واتساب لمناقشة الخطة
        </a>
      </div>
    </div>
  );
}
