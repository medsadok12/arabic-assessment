import { useState } from 'react';
import { useTTSPlayer } from '../hooks/useTTSPlayer.js';
import { useAudioRecorder } from '../hooks/useAudioRecorder.js';
import { uploadRecording } from '../utils/uploadRecording.js';
import { shuffle } from '../data/questions.js';
import LetterListenChoose from './LetterListenChoose.jsx';
import ImageWordMatching from './ImageWordMatching.jsx';
import '../App.css';

/**
 * اختبار المهارات — المستوى المبتدئ. مكوّن مستقل تماماً لغرض المعاينة
 * والتثبت من الأداء قبل قرار دمجه في نظام التقييم الرئيسي (Assessment.jsx) —
 * لذلك لا يمرّ عبر بنك الأسئلة (data/questions.js) ولا يُرسِل أي بيانات
 * لأي قاعدة بيانات (لا assessments، لا marketing_leads). التسجيلات الصوتية
 * فقط تُرفَع فعلياً (نفس مسار /api/save-recording المعتمد للتقييم الحقيقي،
 * القسم 15 من CLAUDE.md) لتقييم جودة تجربة التسجيل نفسها، لا لحفظ نتيجة.
 *
 * إعادة استخدام مباشرة بدل اختراع مكوّنات جديدة: LetterListenChoose
 * (استماع+اختيار) وImageWordMatching (ربط صورة بكلمة) — نفس عقدَي onAnswer
 * المعتمدين أصلاً في Assessment.jsx، مما يسهّل الدمج لاحقاً إن تقرّر ذلك.
 */

const PART_LABELS = { 1: 'ج١', 2: 'ج٢' };
const ORDINALS = ['١', '٢', '٣', '٤', '٥', '٦', '٧', '٨'];

// ── بيانات الأقسام الثمانية — منقولة حرفياً من نص الأستاذ محمد ──

// القسم ١: استماع فردي لحرف واحد + اختيار من 3.
// ⚠️ ملاحظة صادقة: العنصر الثالث في النص الأصلي يطلب سماع "ت" لكن خياراته
// المُعطاة (ث، يــ، نــ) لا تتضمّن "ت" نفسها — على الأرجح خطأ نسخ في المصدر.
// نُفِّذ حرفياً كما ورد (لا نخترع خياراً رابعاً)، وسيُسجَّل دائماً كغير صحيح
// بما أن الهدف غائب عن الخيارات — يستحق مراجعة الأستاذ محمد قبل أي اعتماد.
const SECTION1_LETTERS = [
  { letter: 'ب', choices: ['ب', 'ن', 'ت'] },
  { letter: 'ك', choices: ['ك', 'ق', 'ف'] },
  { letter: 'ت', choices: ['ث', 'يــ', 'نــ'] },
  { letter: 'ص', choices: ['ص', 'س', 'ض'] },
  { letter: 'ط', choices: ['ظ', 'ط', 'ت'] },
  { letter: 'خ', choices: ['ح', 'خ', 'ج'] },
];

const SECTION2_SYLLABLES = ['غَ', 'عُ', 'قُ', 'طِ', 'ظُ', 'صَ'];

const SECTION3_PAIRS = [
  { id: 0, emoji: '📖', name: 'كتاب' },
  { id: 1, emoji: '🪑', name: 'كرسي' },
  { id: 2, emoji: '✏️', name: 'قلم' },
  { id: 3, emoji: '🛏️', name: 'سرير' },
  { id: 4, emoji: '🍎', name: 'تفّاح' },
  { id: 5, emoji: '🏠', name: 'منزل' },
];

const SECTION4_QUESTIONS = [
  'ما اسمك؟', 'كم عمرك؟', 'أين تسكن؟', 'في أيّ صفٍّ تدرس؟', 'كيف حالك؟', 'ماذا تحبّ؟',
];

const SECTION5_SYLLABLES = [
  { letter: 'آ', choices: ['كا', 'آ', 'ها'] },
  { letter: 'قي', choices: ['كي', 'في', 'قي'] },
  { letter: 'صو', choices: ['صو', 'ضو', 'سو'] },
  { letter: 'تٌ', choices: ['تُنْ', 'طٌ', 'تٌ'] },
  { letter: 'بٍ', choices: ['بِن', 'بٍ', 'بان'] },
];

// القسم ٦: إملاء — الإجابة الصحيحة مشتقّة من قواعد الرسم الإملائي القياسية.
// ⚠️ العنصر الثالث (طاولة) غامض: لا يوجد بين الخيارات الثلاثة المُعطاة
// (طَوِلَةٌ، طاويلَةٌ، طاوِلّةٌ) رسمٌ مطابق تماماً للكلمة الصحيحة "طاولةٌ" —
// تُرِك بلا إجابة صحيحة محدَّدة (`correct: null`) فيُعرَض العنصر بلا تصحيح
// آلي، ويحتاج مراجعة الأستاذ محمد لتحديد الرسم المقصود بدقة.
const SECTION6_SPELLING = [
  { options: ['هاذا', 'هاذَ', 'هَذا'], correct: 'هَذا' },
  { options: ['ذَلِكَ', 'ذالكَ', 'ذالِكا'], correct: 'ذَلِكَ' },
  { options: ['طَوِلَةٌ', 'طاويلَةٌ', 'طاوِلّةٌ'], correct: null },
  { options: ['كِتابٌ', 'كَتَبٌ', 'كِتابُنْ'], correct: 'كِتابٌ' },
  { options: ['بِؤْرٌ', 'بِئْرٌ', 'بِأرٌ'], correct: 'بِئْرٌ' },
  { options: ['شَيْءٌ', 'شَيْئٌ', 'شَيْؤٌ'], correct: 'شَيْءٌ' },
  { options: ['رَأيْتُ', 'رَءَيْتُ', 'رَئَيْتُ'], correct: 'رَأيْتُ' },
  { options: ['سَماءً', 'سَماءًا', 'سَماأً'], correct: 'سَماءً' },
];

// القسم ٧: الضمائر — خيارات (مُشتِّتات) من تصميمنا لأن النص الأصلي لم
// يُعطِ خيارات جاهزة، مبنية على مطابقة صيغة الفعل نحوياً.
const SECTION7_PRONOUNS = [
  { sentence: '........ يَسْبَحانِ', options: ['هما', 'هم', 'أنتما'], correct: 'هما' },
  { sentence: '........ أراجِعُ دروسي', options: ['أنا', 'أنتَ', 'هو'], correct: 'أنا' },
  { sentence: '........ تُعِدُّ الطّعامَ', options: ['هي', 'هو', 'أنتِ'], correct: 'هي' },
  { sentence: '....... يَلْعَبونَ في الْحَديقَةِ', options: ['هم', 'هما', 'نحن'], correct: 'هم' },
  { sentence: '....... ذَهَبْنَ إلى الْمتْجَر', options: ['هنّ', 'هم', 'أنتنّ'], correct: 'هنّ' },
  { sentence: '....... نَلْعَبُ كُرَةَ الْقَدَمِ', options: ['نحن', 'أنا', 'أنتم'], correct: 'نحن' },
  { sentence: '....... تُساعِدُ أمّها', options: ['هي', 'هو', 'أنتِ'], correct: 'هي' },
];

// القسم ٨: فهم مقروء — الفقرة كما وردت حرفياً؛ صُحِّح خطأ مطبعي واحد فقط
// في السؤال الأول ("مَنْ أيْنَ" لا معنى نحوياً لها ← "مِنْ أيْنَ" هي الصياغة
// السليمة الوحيدة الممكنة لسؤال بلد المنشأ). خيارات الأسئلة من تصميمنا.
const SECTION8_PASSAGE =
  'سامي وَلَدُ لطيفٌ يعيش في قطر هُوَ مِصَريٌّ، عُمْرُهُ سِتُّ سَنَواتٍ. هو يَدْرُسُ في الصَّفِّ الْأوَّلِ. يُحبُّ سامي كُرَةَ الْقَدَمِ، ويَلْعَبُها في الحديقَةِ كُلَّ يَوْمٍ مع أصِدِقائِهِ.';
const SECTION8_QUESTIONS = [
  { question: 'مِنْ أيْنَ سامي؟', options: ['مصر', 'قطر', 'السعودية'], correct: 'مصر' },
  { question: 'أيْنَ يَعيشُ سامي؟', options: ['قطر', 'مصر', 'الإمارات'], correct: 'قطر' },
  { question: 'كَمْ عُمْرُ سامي؟', options: ['ست سنوات', 'خمس سنوات', 'سبع سنوات'], correct: 'ست سنوات' },
  { question: 'في أيّ صَفٍّ يَدْرُسُ؟', options: ['الصف الأول', 'الصف الثاني', 'الصف الثالث'], correct: 'الصف الأول' },
  { question: 'ماذا يُحبُّ سامي؟', options: ['كرة القدم', 'السباحة', 'الرسم'], correct: 'كرة القدم' },
];

const SECTIONS = [
  { id: 's1', part: 1, number: 1, title: 'أستمع وأختار الإجابة المناسبة', type: 'letter-choose', skill: 'تمييز صوتي', data: SECTION1_LETTERS },
  { id: 's2', part: 1, number: 2, title: 'يقرأ المتعلّم المقاطع التالية (تسجيل)', type: 'recorder', hint: 'اقرأ كل مقطع بصوتك وسجّله', data: SECTION2_SYLLABLES.map(s => ({ display: s })) },
  { id: 's3', part: 1, number: 3, title: 'أربط الصورة بالكلمة المناسبة', type: 'image-match', skill: 'مفردات', data: SECTION3_PAIRS },
  { id: 's4', part: 1, number: 4, title: 'أستمع وأسجّل الإجابة المناسبة', type: 'recorder', hint: 'استمع للسؤال ثم سجّل إجابتك', data: SECTION4_QUESTIONS.map(q => ({ display: q, tts: q })) },
  { id: 's5', part: 2, number: 5, title: 'أستمع وأختار الإجابة المناسبة', type: 'letter-choose', skill: 'تمييز صوتي متقدم', data: SECTION5_SYLLABLES },
  { id: 's6', part: 2, number: 6, title: 'يختار المتعلّم الرسم الصحيح للكلمات التالية', type: 'mcq-page', skill: 'إملاء', data: SECTION6_SPELLING.map((it) => ({ prompt: null, options: it.options, correct: it.correct })) },
  { id: 's7', part: 2, number: 7, title: 'أكمل الجملة بالضمير المناسب', type: 'mcq-page', skill: 'نحو', data: SECTION7_PRONOUNS.map((it) => ({ prompt: it.sentence, options: it.options, correct: it.correct })) },
  { id: 's8', part: 2, number: 8, title: 'أقرأ النصّ وأجيب عن الأسئلة', type: 'reading-comprehension', skill: 'استيعاب مقروء', passage: SECTION8_PASSAGE, data: SECTION8_QUESTIONS.map((it) => ({ prompt: it.question, options: it.options, correct: it.correct })) },
];

const TOTAL_SECTIONS = SECTIONS.length;

// ────────────────────────────────────────────────────────────────────────
// قسم الاستماع/التسجيل (القسمان ٢ و٤) — كل العناصر في صفحة واحدة، تسجيل
// اختياري لكل عنصر (لا يُحجَز الطفل بلا ميكروفون)، بنفس كلاسات
// AudioQuestion.jsx الموجودة أصلاً (aq-*) بلا اختراع نمط جديد.
function RecorderSection({ section, childName, onComplete }) {
  const [savedUrls, setSavedUrls] = useState({});

  function handleSaved(idx, url) {
    setSavedUrls((prev) => ({ ...prev, [idx]: url }));
  }

  // إعادة التسجيل بعد حفظ سابق يجب أن تُخفي شارة "تم الحفظ" فوراً — التسجيل
  // الجديد لم يُرفَع بعد، فإبقاء الشارة يوهم بأن المحاولة الجديدة محفوظة.
  function handleRecordStart(idx) {
    setSavedUrls((prev) => {
      if (!(idx in prev)) return prev;
      const next = { ...prev };
      delete next[idx];
      return next;
    });
  }

  function handleContinue() {
    const recordings = section.data
      .map((item, idx) => (savedUrls[idx] ? { label: item.display, url: savedUrls[idx] } : null))
      .filter(Boolean);
    onComplete(recordings);
  }

  return (
    <div className="question-box">
      <div className="question-number">تدريب {ORDINALS[section.number - 1]}</div>
      <p className="question-text">{section.hint}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {section.data.map((item, idx) => (
          <RecorderItem
            key={idx}
            item={item}
            saved={!!savedUrls[idx]}
            childName={childName}
            questionId={section.id}
            itemId={idx + 1}
            onSaved={(url) => handleSaved(idx, url)}
            onRecordStart={() => handleRecordStart(idx)}
          />
        ))}
      </div>

      <button className="btn-primary" type="button" onClick={handleContinue} style={{ marginTop: 18 }}>
        متابعة ←
      </button>
    </div>
  );
}

function RecorderItem({ item, saved, childName, questionId, itemId, onSaved, onRecordStart }) {
  const { playing, audioError, playOnce } = useTTSPlayer();
  const { recording, audioUrl, micError, noSupport, start, stop, getBlob } = useAudioRecorder();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(false);

  function handleStart() {
    onRecordStart();
    start();
  }

  async function handleUpload() {
    const blob = getBlob();
    if (!blob) return;
    setUploading(true);
    setUploadError(false);
    const result = await uploadRecording(blob, { studentName: childName, questionId, itemId });
    setUploading(false);
    if (!result.success) { setUploadError(true); return; }
    onSaved(result.url);
  }

  return (
    <div className={`aq-record-box${recording ? ' aq-rec-active' : ''}`}>
      {item.tts && (
        <button
          type="button"
          className={`aq-play-btn${playing ? ' aq-playing' : ''}`}
          onClick={() => playOnce(item.tts)}
          disabled={playing}
          style={{ marginBottom: 10 }}
        >
          <span className="aq-play-icon">{playing ? '🔊' : '▶'}</span>
          {playing ? 'جاري التشغيل...' : 'استمع للسؤال'}
        </button>
      )}
      {audioError && <p className="aq-error">⚠️ تعذّر تشغيل الصوت، جرّب مرة أخرى</p>}

      <p className="aq-record-title" style={item.tts ? undefined : { fontSize: 30, letterSpacing: 4 }}>
        {item.display}
      </p>

      {noSupport && <p className="aq-error">⚠️ المتصفح لا يدعم التسجيل. استخدم Chrome أو Edge.</p>}
      {micError && <p className="aq-error">⚠️ يرجى السماح للمتصفح بالوصول إلى الميكروفون.</p>}

      {recording && (
        <div className="aq-rec-indicator">
          <span className="aq-rec-dot" />
          <span className="aq-rec-time">يسجّل الآن...</span>
        </div>
      )}

      {audioUrl && !recording && (
        <div className="aq-playback">
          <audio controls src={audioUrl} style={{ width: '100%' }} />
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        {!recording ? (
          <button type="button" className="aq-btn-rec" onClick={handleStart} disabled={uploading}>
            🎙️ {audioUrl ? 'إعادة التسجيل' : 'ابدأ التسجيل'}
          </button>
        ) : (
          <button type="button" className="aq-btn-stop" onClick={stop}>⏹️ إيقاف التسجيل</button>
        )}
        {audioUrl && !recording && !saved && (
          <button type="button" className="btn-primary" onClick={handleUpload} disabled={uploading} style={{ flex: '1 1 140px', width: 'auto' }}>
            {uploading ? '⏳ جارٍ الحفظ...' : '💾 حفظ التسجيل'}
          </button>
        )}
        {saved && <span style={{ color: '#2e7d32', fontWeight: 700, alignSelf: 'center' }}>✅ تم الحفظ</span>}
      </div>
      {uploadError && <p className="aq-error">⚠️ تعذّر حفظ التسجيل، حاول مرة أخرى</p>}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// قسم أسئلة الاختيار (الأقسام ٦، ٧، ٨) — كل العناصر في صفحة واحدة، بنفس
// كلاسات .question-box/.options-list/.option المعتمدة أصلاً في
// ListeningComprehension.jsx، بلا أي CSS جديد.
function McqPageSection({ section, onComplete }) {
  const [shuffledItems] = useState(() => section.data.map((it) => ({ ...it, shuffledOptions: shuffle(it.options) })));
  const [selections, setSelections] = useState({});

  const allAnswered = shuffledItems.every((_, i) => selections[i] !== undefined);

  function select(i, value) {
    if (selections[i] !== undefined) return;
    setSelections((prev) => ({ ...prev, [i]: value }));
  }

  function handleContinue() {
    const results = shuffledItems.map((it, i) => {
      const graded = it.correct !== null && it.correct !== undefined;
      const chosen = selections[i];
      return { prompt: it.prompt, chosen, correct: it.correct, graded, isCorrect: graded ? chosen === it.correct : null };
    });
    onComplete(results);
  }

  const { playing, audioError, playOnce } = useTTSPlayer();

  return (
    <>
      {section.passage && (
        <div className="question-box">
          <div className="question-number">نص القراءة</div>
          <p className="question-text" style={{ lineHeight: 2 }}>{section.passage}</p>
          <button type="button" className={`aq-play-btn${playing ? ' aq-playing' : ''}`} onClick={() => playOnce(section.passage)} disabled={playing}>
            <span className="aq-play-icon">{playing ? '🔊' : '▶'}</span>
            {playing ? 'جاري التشغيل...' : 'استمع للنصّ'}
          </button>
          {audioError && <p className="aq-error" style={{ marginTop: 6 }}>⚠️ تعذّر تشغيل الصوت، جرّب مرة أخرى</p>}
        </div>
      )}

      {shuffledItems.map((it, i) => {
        const chosen = selections[i];
        const graded = it.correct !== null && it.correct !== undefined;
        return (
          <div className="question-box" key={i}>
            <div className="question-number">تدريب {ORDINALS[section.number - 1]} — {i + 1}</div>
            {it.prompt && <p className="question-text">{it.prompt}</p>}
            <div className="options-list">
              {it.shuffledOptions.map((opt, oi) => {
                let cls = 'option';
                if (chosen !== undefined) {
                  if (opt === chosen) cls += graded ? (opt === it.correct ? ' option-correct' : ' option-wrong') : ' option-selected';
                  else if (graded && opt === it.correct) cls += ' option-correct';
                }
                return (
                  <button key={oi} type="button" className={cls} onClick={() => select(i, opt)} disabled={chosen !== undefined}>
                    <span className="option-letter">{['أ', 'ب', 'ج'][oi]}</span>
                    <span className="option-text">{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <button className="btn-primary" type="button" onClick={handleContinue} disabled={!allAnswered} style={{ marginTop: 6 }}>
        متابعة ←
      </button>
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────
function StartScreen({ childName, setChildName, onStart }) {
  return (
    <div className="app" dir="rtl">
      <div className="page-content">
        <div className="results-header">
          <div className="results-icon">🧩</div>
          <h2>اختبار المهارات — المستوى المبتدئ</h2>
          <p>٨ تدريبات: استماع واختيار، قراءة وتسجيل، ربط صور، وفهم مقروء</p>
        </div>
        <div className="form-group">
          <label htmlFor="bs-child-name">اسم الطفل (اختياري — يُستخدَم لتسمية التسجيلات الصوتية فقط)</label>
          <input
            id="bs-child-name"
            type="text"
            placeholder="مثال: سارة"
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
          />
        </div>
        <button className="btn-primary" type="button" onClick={onStart}>ابدأ الاختبار ←</button>
      </div>
    </div>
  );
}

function ResultsScreen({ outcomes }) {
  const scored = outcomes.filter((o) => o?.type === 'scored');
  const totalCorrect = scored.reduce((sum, o) => sum + o.correctCount, 0);
  const totalGraded  = scored.reduce((sum, o) => sum + o.total, 0);
  const pct = totalGraded > 0 ? Math.round((totalCorrect / totalGraded) * 100) : 0;
  const circleColor = pct >= 80 ? '#2ABB7A' : pct >= 50 ? '#E8B84B' : '#c62828';
  const diagnostic = outcomes.filter((o) => o?.type === 'diagnostic');

  return (
    <div className="app" dir="rtl">
      <div className="page-content">
        <div className="results-header">
          <div className="results-icon">🎉</div>
          <h2>انتهى الاختبار!</h2>
          <p>هذه نتيجة معاينة فقط — لم تُحفَظ في أي نظام بعد</p>
        </div>

        <div className="score-card" style={{ borderColor: circleColor }}>
          <div className="score-circle" style={{ background: circleColor }}>
            <span className="score-big">{pct}%</span>
          </div>
          <div className="score-details">
            <div className="grade-label" style={{ color: circleColor }}>
              {pct >= 80 ? 'أداء ممتاز 🌟' : pct >= 50 ? 'أداء جيد 👍' : 'يحتاج تدريباً إضافياً 💪'}
            </div>
            <div className="level-result">{totalCorrect} من {totalGraded} إجابة صحيحة في الأقسام القابلة للتصحيح الآلي</div>
          </div>
        </div>

        <div className="question-box">
          <div className="question-number">تفاصيل الأقسام</div>
          {SECTIONS.map((s, i) => {
            const o = outcomes[i];
            return (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '9px 0', borderBottom: i < SECTIONS.length - 1 ? '1px solid #eee' : 'none' }}>
                <span style={{ fontWeight: 700 }}>{PART_LABELS[s.part]} — {s.title}</span>
                <span style={{ color: '#555', flexShrink: 0 }}>
                  {o?.type === 'scored' && `${o.correctCount}/${o.total}`}
                  {o?.type === 'diagnostic' && o.label}
                </span>
              </div>
            );
          })}
        </div>

        {diagnostic.some((d) => d?.recordings?.length) && (
          <div className="question-box">
            <div className="question-number">التسجيلات الصوتية المحفوظة</div>
            {outcomes.map((o, i) => o?.recordings?.length ? (
              <div key={i} style={{ marginBottom: 14 }}>
                <p className="question-text" style={{ fontSize: '.9rem', marginBottom: 8 }}>{SECTIONS[i].title}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {o.recordings.map((r, ri) => (
                    <div key={ri}>
                      <span style={{ fontSize: '.85rem', color: '#666' }}>{r.label}</span>
                      <audio controls src={r.url} style={{ width: '100%' }} />
                    </div>
                  ))}
                </div>
              </div>
            ) : null)}
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
export default function BeginnerSkillsAssessment() {
  const [stage, setStage] = useState('start'); // start | section | results
  const [childName, setChildName] = useState('');
  const [sectionIdx, setSectionIdx] = useState(0);
  const [outcomes, setOutcomes] = useState([]);

  function recordOutcome(outcome) {
    setOutcomes((prev) => {
      const next = [...prev];
      next[sectionIdx] = outcome;
      return next;
    });
    if (sectionIdx + 1 < TOTAL_SECTIONS) setSectionIdx((i) => i + 1);
    else setStage('results');
  }

  function handleLetterChoose(payload) {
    const correctCount = payload.answer.filter((a) => a.isCorrect).length;
    recordOutcome({ type: 'scored', correctCount, total: payload.answer.length });
  }

  function handleImageMatch(payload) {
    recordOutcome({ type: 'diagnostic', label: payload.isCorrect ? '✅ الربط صحيح بالكامل' : '⚠️ الربط يحتاج مراجعة' });
  }

  function handleMcqPage(results) {
    const graded = results.filter((r) => r.graded);
    const correctCount = graded.filter((r) => r.isCorrect).length;
    recordOutcome({ type: 'scored', correctCount, total: graded.length });
  }

  function handleRecorder(recordings) {
    const section = SECTIONS[sectionIdx];
    recordOutcome({ type: 'diagnostic', label: `🎙️ ${recordings.length}/${section.data.length} تسجيلات`, recordings });
  }

  if (stage === 'start') return <StartScreen childName={childName} setChildName={setChildName} onStart={() => setStage('section')} />;
  if (stage === 'results') return <ResultsScreen outcomes={outcomes} />;

  const section = SECTIONS[sectionIdx];
  const progressPct = Math.round(((sectionIdx + 1) / TOTAL_SECTIONS) * 100);

  return (
    <div className="app" dir="rtl">
      <div className="page-content">
        <p style={{ fontSize: '.8rem', color: '#888', textAlign: 'center', marginBottom: 4 }}>
          {PART_LABELS[section.part]} — تدريب {sectionIdx + 1} من {TOTAL_SECTIONS}
        </p>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progressPct}%` }} />
        </div>

        {section.type === 'letter-choose' && (
          <LetterListenChoose
            key={section.id}
            question={{ id: section.id, skill: section.skill, items: section.data }}
            onAnswer={handleLetterChoose}
          />
        )}
        {section.type === 'image-match' && (
          <ImageWordMatching
            key={section.id}
            question={{ id: section.id, skill: section.skill, text: section.title, pairs: section.data }}
            onAnswer={handleImageMatch}
          />
        )}
        {section.type === 'recorder' && (
          <RecorderSection key={section.id} section={section} childName={childName} onComplete={handleRecorder} />
        )}
        {(section.type === 'mcq-page' || section.type === 'reading-comprehension') && (
          <McqPageSection key={section.id} section={section} onComplete={handleMcqPage} />
        )}
      </div>
    </div>
  );
}
