'use client';
import { useRef, useState, useEffect } from 'react';
import { FAHEEM_VOICES, FAHEEM_VOICE_ID, VOICE_SAMPLE } from '../../../lib/faheem-voices';

/* صفحة اختيار صوت فهيم: صوته الأصلي في مقطع الفيل للمقارنة، ثم الأصوات المرشّحة
   بالجملة نفسها. صوت واحد في كل لحظة. */
const REF = { id: 'ref', label: 'صوت فهيم في مقطع الفيل', note: 'المرجع: هذا ما نريد أن يشبهه' };

export default function FaheemVoicePage() {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(null);
  const [loading, setLoading] = useState(null);
  const [failed, setFailed] = useState({});

  useEffect(() => () => audioRef.current?.pause(), []);

  function play(item) {
    const a = audioRef.current || (audioRef.current = new Audio());
    a.pause();
    if (playing === item.id) { setPlaying(null); return; }
    a.onplaying = () => { setLoading(null); setPlaying(item.id); };
    a.onended = () => setPlaying(null);
    a.onerror = () => { setLoading(null); setPlaying(null); setFailed(f => ({ ...f, [item.id]: true })); };
    setLoading(item.id);
    setFailed(f => ({ ...f, [item.id]: false }));
    // المرجع: نسخة mp4 (AAC) حيث تُدعم، وإلا webm (Opus) — كما في صيّاد الحروف
    a.src = item.id === 'ref'
      ? (a.canPlayType('audio/mp4; codecs="mp4a.40.2"') ? '/media/elephant.mp4' : '/media/elephant.webm')
      : `/api/faheem/voice-lab?v=${item.id}`;
    a.play().catch(() => a.onerror());
  }

  const card = (item, n) => {
    const isOn = playing === item.id;
    const isLoading = loading === item.id;
    const isRef = item.id === 'ref';
    return (
      <div key={item.id} className={`fv-card${isRef ? ' fv-ref' : ''}${isOn ? ' fv-on' : ''}`}>
        <div className="fv-num">{isRef ? '🐘' : n}</div>
        <div className="fv-txt">
          <div className="fv-label">
            {item.label}
            {item.id === FAHEEM_VOICE_ID && <span className="fv-tag">المستعمل الآن</span>}
          </div>
          <div className="fv-note">{failed[item.id] ? 'تعذّر تشغيل هذه العيّنة — جرّب مرة أخرى' : item.note}</div>
        </div>
        <button className="fv-play" onClick={() => play(item)} aria-label={isOn ? 'إيقاف' : 'استمع'}>
          {isLoading ? '…' : isOn ? '■' : '▶'}
        </button>
      </div>
    );
  };

  return (
    <main className="fv-wrap" dir="rtl">
      <style>{`
        .fv-wrap { max-width: 640px; margin: 0 auto; padding: 24px 16px 60px; font-family: var(--font-naskh), var(--font-cairo), serif; background: #F4EFE6; min-height: 100dvh; }
        .fv-h { color: #1A2B4A; font-size: 1.6rem; font-weight: 800; margin: 0 0 6px; }
        .fv-sub { color: #475569; font-size: 1.02rem; line-height: 1.9; margin: 0 0 14px; }
        .fv-sample { background: #fff; border-radius: 16px; padding: 12px 16px; color: #1A2B4A; font-size: 1.15rem; line-height: 2; margin-bottom: 18px; border: 2px dashed #E8B84B; }
        .fv-list { display: flex; flex-direction: column; gap: 12px; }
        .fv-card { display: flex; align-items: center; gap: 14px; background: #fff; border-radius: 20px; padding: 14px 16px; box-shadow: 0 4px 14px rgba(26,43,74,.08); border: 3px solid transparent; transition: border-color .2s; }
        .fv-card.fv-on { border-color: #7C5CD9; }
        .fv-ref { background: linear-gradient(135deg, #fff7e0, #fff); border-color: #E8B84B; margin-bottom: 6px; }
        .fv-num { flex: 0 0 44px; height: 44px; border-radius: 50%; background: #7C5CD9; color: #fff; font-weight: 800; font-size: 1.3rem; display: flex; align-items: center; justify-content: center; }
        .fv-ref .fv-num { background: #E8B84B; }
        .fv-txt { flex: 1; min-width: 0; }
        .fv-label { color: #1A2B4A; font-weight: 800; font-size: 1.15rem; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
        .fv-tag { background: #e2e8f0; color: #475569; font-size: .78rem; border-radius: 99px; padding: 2px 10px; font-weight: 700; }
        .fv-note { color: #64748b; font-size: .95rem; margin-top: 2px; }
        .fv-play { flex: 0 0 60px; height: 60px; border-radius: 50%; border: none; background: #2ABB7A; color: #fff; font-size: 1.5rem; cursor: pointer; box-shadow: 0 4px 10px rgba(42,187,122,.35); }
        .fv-on .fv-play { background: #7C5CD9; box-shadow: 0 4px 10px rgba(124,92,217,.35); }
        .fv-foot { margin-top: 20px; color: #475569; font-size: 1rem; line-height: 1.9; text-align: center; }
      `}</style>
      <h1 className="fv-h">🎙️ اختر صوت فهيم</h1>
      <p className="fv-sub">استمع أولاً إلى صوت فهيم في مقطع الفيل، ثم إلى الأصوات المرشّحة. كلها تقرأ الجملة نفسها:</p>
      <div className="fv-sample">{VOICE_SAMPLE}</div>
      <div className="fv-list">
        {card(REF)}
        {FAHEEM_VOICES.map((v, i) => card(v, i + 1))}
      </div>
      <p className="fv-foot">اختر الصوت الأقرب لفهيم، وأخبرني برقمه فقط ✨</p>
    </main>
  );
}
