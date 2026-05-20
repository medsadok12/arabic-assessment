import { LEVELS } from '../data/questions.js';

export default function LevelTransition({ fromLevel, toLevel, score, onContinue }) {
  const jumped = toLevel > fromLevel;
  const toInfo = LEVELS.find((l) => l.id === toLevel);

  return (
    <div className="page-content transition-page">
      <div className="transition-icon">{jumped ? '🚀' : '↩️'}</div>

      <h2 className="transition-title">
        {jumped ? 'أداء رائع! ننتقل للمستوى التالي' : 'سنراجع المستوى السابق'}
      </h2>

      <div className="transition-score">
        <span className="score-num">{Math.round(score)}%</span>
        <span className="score-label">نتيجتك في هذا المستوى</span>
      </div>

      <div className="transition-info">
        <p>
          {jumped
            ? `لقد تجاوزتَ عتبة الـ 85%، لذا ننتقل إلى المستوى ${toInfo?.name} ${toInfo?.icon}`
            : `نتيجتك أقل من 70%، لذا سيُحسب مستواك الأخير`}
        </p>
      </div>

      <button className="btn-primary" onClick={onContinue}>
        {jumped ? `ابدأ المستوى ${toInfo?.name} ${toInfo?.icon}` : 'عرض النتائج'}
      </button>
    </div>
  );
}
