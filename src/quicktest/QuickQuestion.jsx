import { useState } from 'react';
import { useTTSPlayer } from '../hooks/useTTSPlayer.js';

const SELECT_DELAY_MS = 450;

/**
 * يعرض سؤالاً واحداً من blueprint.js وينتقل فوراً للتالي بلا أي مؤشر صح/
 * خطأ — طلب صريح من الأستاذ محمد ("صفر إحباط"): أي إشارة بصرية للخطأ قد
 * تُحبِط طفلاً مبتدئاً وتدفعه لمغادرة الصفحة قبل بوابة التواصل. الزر
 * المختار يأخذ تظليلاً محايداً (لون العلامة، لا أخضر/أحمر) فقط لتأكيد
 * التسجيل، ثم onAnswer يُستدعى بعد مهلة قصيرة.
 *
 * مستقل تماماً عن Assessment.jsx (محرك التقييم الحقيقي المدفوع) — ذاك
 * يعرض ٢٢ نوع سؤال معقّداً بمنطق مستويات/قفزات لا علاقة له بهذا القمع
 * التسويقي المسطّح، وسلوكه (إظهار صح/خطأ) يخالف الغرض هنا تماماً.
 */
export default function QuickQuestion({ question, questionNumber, total, onAnswer }) {
  const [selected, setSelected] = useState(null);
  const [fileAudioPlaying, setFileAudioPlaying] = useState(false);
  const { playing: ttsPlaying, playOnce } = useTTSPlayer();

  // ملف صوتي مرفوع فعلياً (audioUrl، من لوحة الإدارة) له أولوية على النطق
  // الآلي (audioPrompt عبر TTS) — صوت بشري حقيقي أدفأ لطفل صغير من TTS.
  const playing = fileAudioPlaying || ttsPlaying;

  function playAudioFile() {
    if (fileAudioPlaying) return;
    setFileAudioPlaying(true);
    const audio = new Audio(question.audioUrl);
    audio.onended = () => setFileAudioPlaying(false);
    audio.onerror = () => setFileAudioPlaying(false);
    audio.play().catch(() => setFileAudioPlaying(false));
  }

  function handleSelect(idx) {
    if (selected !== null) return;
    setSelected(idx);
    const isCorrect = !!question.options[idx].correct;
    setTimeout(() => onAnswer(isCorrect), SELECT_DELAY_MS);
  }

  return (
    <div className="page-content">
      <p style={{ textAlign: 'center', color: 'var(--text-light)', fontSize: 13, marginBottom: 14 }}>
        السؤال {questionNumber} / {total}
      </p>

      {question.readingText && (
        <div style={{
          background: '#f4f1fb', border: '1.5px solid #d9d0ee', borderRadius: 12,
          padding: '16px 18px', marginBottom: 18, fontSize: '1.05rem', lineHeight: 1.9,
          color: 'var(--primary)', fontWeight: 700, textAlign: 'center',
        }}>
          📖 {question.readingText}
        </div>
      )}

      {question.imageUrl ? (
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <img src={question.imageUrl} alt="" style={{ maxWidth: '100%', maxHeight: 180, borderRadius: 12 }} />
        </div>
      ) : question.promptEmoji && (
        <div style={{ textAlign: 'center', fontSize: '3.4rem', marginBottom: 10 }}>
          {question.promptEmoji}
        </div>
      )}

      {(question.audioUrl || question.audioPrompt) && (
        <div style={{ textAlign: 'center', margin: '4px 0 20px' }}>
          <button
            onClick={() => question.audioUrl ? playAudioFile() : playOnce(question.audioPrompt)}
            disabled={playing}
            style={{
              background: playing ? '#b3a8d6' : 'var(--primary)', color: '#fff', border: 'none',
              borderRadius: '50%', width: 76, height: 76, fontSize: 30,
              cursor: playing ? 'not-allowed' : 'pointer',
              boxShadow: playing ? 'none' : '0 4px 14px rgba(26,16,82,.3)',
            }}
            aria-label="استمع"
          >
            {playing ? '🔊' : '▶'}
          </button>
          <p style={{ marginTop: 8, color: 'var(--text-light)', fontSize: 13 }}>اضغط للاستماع</p>
        </div>
      )}

      {question.parentReadHint && (
        <div style={{
          background: '#fff8e8', border: '1px solid #f3d78a', borderRadius: 10,
          padding: '8px 14px', marginBottom: 16, fontSize: '.85rem', color: '#7a5a10', textAlign: 'center',
        }}>
          🗣️ اقرأ هذا السؤال لطفلك بصوت مرتفع
        </div>
      )}

      <p className="question-text" style={{ textAlign: 'center', fontWeight: 800, fontSize: '1.15rem', marginBottom: 22 }}>
        {question.text}
      </p>

      <div className="options-list" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {question.options.map((opt, idx) => {
          const isSelected = selected === idx;
          return (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              disabled={selected !== null}
              className="option"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                padding: '16px 18px', fontSize: opt.emoji ? '1.15rem' : '1.05rem', fontWeight: 700,
                border: isSelected ? '2.5px solid var(--primary)' : '2px solid var(--border)',
                background: isSelected ? '#efe9f9' : '#fff',
                borderRadius: 'var(--radius)', cursor: selected !== null ? 'default' : 'pointer',
                transition: 'all .15s',
              }}
            >
              {opt.emoji && <span style={{ fontSize: '1.8rem' }}>{opt.emoji}</span>}
              <span>{opt.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
