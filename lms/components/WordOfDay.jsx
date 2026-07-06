'use client';
import { useState, useEffect, useRef } from 'react';

/* «كلمة اليوم» — a light daily habit on the student dashboard: one word from the
   lexicon, the same for everyone each day, spoken in Fahim's voice, worth a small
   point the first time the child listens (server dedups by daily_word:DATE). */
export default function WordOfDay() {
  const [word,    setWord]    = useState(null);
  const [date,    setDate]    = useState('');
  const [playing, setPlaying] = useState(false);
  const [earned,  setEarned]  = useState(false);
  const [justGot, setJustGot] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    let alive = true;
    // ?t=... عنوان فريد لكل تحميل → لا يجد الـCDN نسخة محفوظة فيقرأ حيّاً من قاعدة البيانات
    fetch(`/api/word-of-day?t=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (!alive || !d.word) return;
        setWord(d.word);
        setDate(d.date || new Date().toISOString().slice(0, 10));
      })
      .catch(() => {});
    return () => { alive = false; audioRef.current?.pause(); };
  }, []);

  function listen() {
    if (!word) return;
    const text = word.sentence ? `${word.word}. ${word.sentence}` : word.word;
    try {
      audioRef.current?.pause();
      const a = new Audio(`/api/faheem/tts?t=${encodeURIComponent(text)}`);
      audioRef.current = a;
      setPlaying(true);
      a.onended = () => setPlaying(false);
      a.onerror = () => setPlaying(false);
      a.play().catch(() => setPlaying(false));
    } catch { setPlaying(false); }

    // Award the daily point on the first listen (server dedups by daily_word:DATE).
    if (!earned) {
      fetch('/api/points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: `daily_word:${date}` }),
      })
        .then(r => r.json())
        .then(j => {
          if (j.success) { setEarned(true); setJustGot(true); setTimeout(() => setJustGot(false), 2600); }
          else if (j.skipped) { setEarned(true); }
        })
        .catch(() => {});
    }
  }

  if (!word) return null;

  const meta = [word.word_type, word.topic].filter(Boolean).join(' · ');

  return (
    <div style={{
      background: 'linear-gradient(135deg,#fff,#FAF7F2)',
      border: '1.5px solid #EDE5D8', borderRadius: 18,
      padding: '18px 20px', marginBottom: 16,
      boxShadow: '0 4px 16px rgba(26,43,74,.06)',
    }}>
      <style>{`@keyframes wodPop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}`}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: '.82rem', fontWeight: 800, color: '#b45309' }}>🌟 كلمة اليوم</span>
        {justGot && (
          <span style={{
            fontSize: '.78rem', fontWeight: 900, color: '#1A2B4A',
            background: '#E8B84B', borderRadius: 99, padding: '3px 12px',
            animation: 'wodPop .4s ease',
          }}>
            +٣ ⭐
          </span>
        )}
      </div>

      {word.has_image && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <img
            src={`/api/word-image/${word.id}`}
            alt={word.word}
            width={140}
            height={140}
            style={{
              width: 140, height: 140, objectFit: 'cover',
              borderRadius: 18, border: '3px solid #fff',
              boxShadow: '0 4px 14px rgba(26,43,74,.12)',
            }}
          />
        </div>
      )}

      <div style={{ textAlign: 'center', marginBottom: meta ? 4 : 14 }}>
        <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#1A2B4A', lineHeight: 1.3 }}>
          {word.word}
        </div>
        {word.syllables && (
          <div style={{
            fontSize: '1.15rem', fontWeight: 800, color: '#1A2B4A', opacity: .7,
            letterSpacing: 3, marginTop: 6, direction: 'rtl',
          }}>
            {word.syllables}
          </div>
        )}
        {meta && (
          <div style={{ fontSize: '.82rem', color: '#8a94a6', marginTop: 4 }}>{meta}</div>
        )}
      </div>

      {word.sentence && (
        <div style={{
          fontSize: '.9rem', color: '#475569', lineHeight: 1.9, textAlign: 'center',
          background: '#f8faff', borderRadius: 12, padding: '10px 14px',
          margin: '12px 0', border: '1px solid #e8eef5',
        }}>
          {word.sentence}
        </div>
      )}

      <button
        onClick={listen}
        style={{
          width: '100%', background: '#E8B84B', color: '#1A2B4A',
          border: 'none', borderRadius: 13, padding: '12px', marginTop: meta ? 12 : 0,
          fontWeight: 800, fontSize: '.98rem', cursor: 'pointer', fontFamily: 'inherit',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: '0 3px 12px rgba(232,184,75,.4)',
        }}
      >
        {playing ? '🔊 يستمع فهيم...' : '🔊 استمع بصوت فهيم'}
      </button>
    </div>
  );
}
