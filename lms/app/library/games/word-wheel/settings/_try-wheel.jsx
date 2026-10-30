'use client';
import { useState } from 'react';
import WordRound from '../_word-round';
import ChallengeRound from '../_challenge-round';
import { themeVars, useWordVoice, Stars } from '../_ui';
import { starsFor } from '../../../../../lib/word-wheel';

/* ════════════════════════════════════════════════════════════════
   «▶️ جرّب العجلة» — المعلم يلعب العجلة كما يراها الطفل تماماً (نفس محرّك
   اللعبة) قبل الحفظ أو بعده، بلا نقاط ولا تسجيل نتيجة.
════════════════════════════════════════════════════════════════ */

export default function TryWheel({ wheel, cards, onClose }) {
  const voice = useWordVoice();
  const [run, setRun]   = useState(1);
  const [done, setDone] = useState(null);
  const Round = wheel.mode === 'challenge' ? ChallengeRound : WordRound;
  const stars = done ? starsFor(done.solved, done.total, wheel.settings) : 0;

  return (
    <div className="wa-try" role="dialog" aria-modal="true" aria-label={`تجربة ${wheel.name}`}>
      <div className="ww" style={{ ...themeVars(wheel.theme), minHeight: '100%' }}>
        <div className="wa-try-bar">🧪 وضع التجربة — كما يراها الطفل، بلا نقاط ولا نتائج
          <button type="button" onClick={onClose}>✕ إنهاء التجربة</button>
        </div>
        {done ? (
          <div className="ww-wrap">
            <div className="ww-panel">
              <div className="ww-result-emoji">🎡</div>
              <Stars count={stars} size="2rem" />
              <h2 className="ww-result-title">انتهت التجربة: {done.solved}/{done.total} كلمات</h2>
              <div className="ww-controls">
                <button type="button" className="ww-btn" onClick={() => { setDone(null); setRun(r => r + 1); }}>🔄 جرّب مرة أخرى</button>
                <button type="button" className="ww-btn-soft" onClick={onClose}>العودة للتعديل</button>
              </div>
            </div>
          </div>
        ) : (
          <Round key={run} wheel={wheel} cards={cards} voice={voice} pointsPerWord={0}
            onAward={() => {}} onExit={onClose} onFinish={setDone} />
        )}
      </div>
    </div>
  );
}

export const TRY_CSS = `
  .wa-try{ position:fixed; inset:0; z-index:360; overflow-y:auto; -webkit-overflow-scrolling:touch; background:#0F172A; }
  .wa-try .ww{ min-height:100vh; }
  .wa-try-bar{ width:100%; max-width:720px; display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;
    background:rgba(255,255,255,.92); color:#1A2B4A; border-radius:14px; padding:8px 12px; font-weight:800; font-size:.85rem; }
  .wa-try-bar button{ border:none; background:#1A2B4A; color:#fff; border-radius:10px; min-height:38px; padding:0 12px; font-family:inherit; font-weight:800; cursor:pointer; }
`;
