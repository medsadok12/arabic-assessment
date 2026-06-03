'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

/* ── TTS text cleaner — strips everything non-speakable so the voice
      never reads "صاروخ" / "علم تونس" / "بالون". Visual chat keeps emojis.
      ALSO reshapes tanwin for natural pronunciation (display text is untouched). ── */
function cleanText(text) {
  return text
    .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, '')   // regional indicators → country flags 🇹🇳
    .replace(/[\u{1F3FB}-\u{1F3FF}]/gu, '')   // skin-tone modifiers (digits-safe)
    .replace(/\p{Extended_Pictographic}/gu, '')// emoji: faces, objects, symbols 🌟🦁
    .replace(/[\u{2190}-\u{21FF}]/gu, '')      // arrows
    .replace(/[\u{2300}-\u{27BF}]/gu, '')      // misc technical, dingbats, symbols
    .replace(/[\u{2B00}-\u{2BFF}]/gu, '')      // misc symbols & arrows (⭐ etc.)
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')      // variation selectors
    .replace(/⃣/g, '')                    // combining enclosing keycap
    .replace(/‍/g, '')                    // zero-width joiner
    .replace(/ـ/g, '')                         // tatweel (no phonetic value)
    // ── Tanwin reshaping for the voice engine (audio-only) ──
    // 1. Waqf: dammatan/kasratan before punctuation or end → sukun (clean human stop)
    .replace(/[ٌٍ](?=\s*[.،؛؟!:\n]|\s*$)/gu, 'ْ')
    // 2. Waqf: fathatan before punctuation or end → drop the mark, keep the alif → natural mad (مرحباً → مرحبا)
    .replace(/ً(?=\s*[.،؛؟!:\n]|\s*$)/gu, '')
    // 3. Inside the sentence: strip ALL remaining tanwin marks so the engine
    //    pronounces words smoothly instead of injecting a dry robotic "noon".
    //    Other harakat (fatha/damma/kasra/shadda/sukun) are kept intact.
    .replace(/[ًٌٍ]/gu, '')
    .replace(/[*_~`#>]/g, '')                  // markdown symbols
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function chunkText(text) {
  const chunks = [];
  const sentences = text.split(/(?<=[.!?،؛\n])\s*/);
  let cur = '';
  for (const s of sentences) {
    if ((cur + s).length > 180) {
      if (cur) chunks.push(cur.trim());
      cur = s;
    } else {
      cur += (cur ? ' ' : '') + s;
    }
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks.length ? chunks : [text.slice(0, 180)];
}

/* ── Arabic voice picker — priority-ranked for best quality across platforms ──
   Apple  : Laila (female, iOS/macOS) → Maged (male, macOS)  ← best quality
   Windows: Naayf (male) → Hoda (female)  ← high quality
   Chrome : Google Arabic built-in
   Fallback: any ar-* voice                                                    */
function pickArabicVoice() {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  const priority = [
    /\bLaila\b/i,
    /\bMaged\b/i,
    /\bMajed\b/i,
    /Microsoft\s+Naayf/i,
    /Microsoft\s+Hoda/i,
    /Microsoft\s+Tarik/i,
    /Google\s+.*Arab/i,
    /Arab/i,
  ];
  for (const pattern of priority) {
    const v = voices.find(v => pattern.test(v.name));
    if (v) return v;
  }
  return voices.find(v => v.lang?.startsWith('ar')) ?? null;
}

/* ── TTS hook — browser Speech API (primary, cheerful & controllable),
      Google Translate proxy (fallback when no Arabic voice exists) ── */
function useSpeech() {
  const audioRef  = useRef(null);
  const cancelRef = useRef(false);

  // Preload browser voices so they're available on first utterance
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }, []);

  useEffect(() => () => {
    cancelRef.current = true;
    window.speechSynthesis?.cancel();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
  }, []);

  // Fallback: Google Translate proxy voice (flat, but always available)
  function playGoogle(chunk, resolve) {
    const audio = new Audio(`/api/faheem/tts?t=${encodeURIComponent(chunk)}`);
    audioRef.current = audio;
    audio.onended = resolve;
    audio.onerror = resolve;
    audio.play().catch(resolve);
  }

  function playChunk(chunk) {
    return new Promise(resolve => {
      const voice = pickArabicVoice();

      // Prefer the browser engine when a real Arabic voice is present — it lets
      // us raise pitch for a merry, boy-like tone kids love, and tune the speed.
      if (window.speechSynthesis && voice) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(chunk);
        u.voice  = voice;
        u.lang   = voice.lang || 'ar-SA';
        u.rate   = 1.1;    // lively, brisk — not sluggish
        u.pitch  = 1.35;   // bright, cheerful, child-like — kids warm to it
        u.volume = 1;
        u.onend  = resolve;
        u.onerror = () => playGoogle(chunk, resolve);  // engine glitch → proxy
        window.speechSynthesis.speak(u);
        return;
      }

      // No browser Arabic voice → use Google Translate proxy
      playGoogle(chunk, resolve);
    });
  }

  const speak = useCallback(async (text, { onEnd } = {}) => {
    cancelRef.current = true;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    window.speechSynthesis?.cancel();
    cancelRef.current = false;

    const chunks = chunkText(cleanText(text));
    for (const chunk of chunks) {
      if (cancelRef.current) break;
      await playChunk(chunk);
    }
    if (!cancelRef.current) onEnd?.();
  }, []);

  const cancel = useCallback(() => {
    cancelRef.current = true;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    window.speechSynthesis?.cancel();
  }, []);

  return { speak, cancel };
}

/* ── SVG Faheem character face ── */
function FaheemFace({ phase, mouthOpen, blink, bob }) {
  const speaking = phase === 'speaking';
  const thinking = phase === 'thinking';

  return (
    <svg
      viewBox="0 0 120 158"
      width="90" height="118"
      style={{
        transform: `translateY(${bob}px)`,
        transition: 'transform .75s ease-in-out',
        overflow: 'visible',
        filter: 'drop-shadow(0 6px 16px rgba(0,0,0,.22))',
      }}
    >
      <rect x="22" y="118" width="76" height="44" rx="18" fill="#1f2d5a" />
      <ellipse cx="60" cy="160" rx="34" ry="9" fill="#15213d" />
      <path d="M40,120 L60,133 L80,120"
        fill="none" stroke="#d4952a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="60" cy="142" r="8" fill="#d4952a" />
      <text x="60" y="146.5" textAnchor="middle" fontSize="8.5"
        fill="#1f2d5a" fontFamily="serif" fontWeight="900">&#x639;</text>

      <circle cx="60" cy="64" r="49" fill="#fce8c8" />

      <ellipse cx="60" cy="21" rx="49" ry="28" fill="#3d2510" />
      <ellipse cx="60" cy="16" rx="44" ry="22" fill="#4a2f15" />
      <path d="M63,2 Q74,-4 72,14"
        fill="none" stroke="#3d2510" strokeWidth="5.5" strokeLinecap="round" />

      <ellipse cx="11" cy="66" rx="9" ry="12" fill="#f5c47e" />
      <ellipse cx="8.5" cy="66" rx="5" ry="7.5" fill="#e8a860" />
      <ellipse cx="109" cy="66" rx="9" ry="12" fill="#f5c47e" />
      <ellipse cx="111.5" cy="66" rx="5" ry="7.5" fill="#e8a860" />

      <ellipse cx="40" cy="63" rx="12" ry="14" fill="white" />
      <circle  cx="41" cy="65" r="8.5"  fill="#1a2d4a" />
      <circle  cx="41" cy="65" r="4.2"  fill="#080808" />
      <circle  cx="43.5" cy="62" r="2.5" fill="white" />
      {blink && <ellipse cx="40" cy="63" rx="12" ry="14" fill="#fce8c8" />}

      <ellipse cx="80" cy="63" rx="12" ry="14" fill="white" />
      <circle  cx="81" cy="65" r="8.5"  fill="#1a2d4a" />
      <circle  cx="81" cy="65" r="4.2"  fill="#080808" />
      <circle  cx="83.5" cy="62" r="2.5" fill="white" />
      {blink && <ellipse cx="80" cy="63" rx="12" ry="14" fill="#fce8c8" />}

      <path
        d={thinking ? 'M28,46 Q40,39 52,45' : 'M28,50 Q40,44 52,50'}
        fill="none" stroke="#3d2510" strokeWidth="3.2" strokeLinecap="round"
        style={{ transition: 'd .4s' }}
      />
      <path
        d={thinking ? 'M68,45 Q80,39 92,46' : 'M68,50 Q80,44 92,50'}
        fill="none" stroke="#3d2510" strokeWidth="3.2" strokeLinecap="round"
        style={{ transition: 'd .4s' }}
      />

      <circle cx="60" cy="79" r="2.8" fill="#d4956a" opacity=".45" />
      <circle cx="19" cy="82" r="10" fill="#f08070" opacity=".18" />
      <circle cx="101" cy="82" r="10" fill="#f08070" opacity=".18" />

      {speaking ? (
        <ellipse cx="60" cy="97" rx="13" ry={mouthOpen ? 9 : 4} fill="#c0392b" />
      ) : thinking ? (
        <path d="M50,97 Q60,95 70,97"
          fill="none" stroke="#c0392b" strokeWidth="2.5" strokeLinecap="round" />
      ) : (
        <path d="M42,92 Q60,114 78,92"
          fill="none" stroke="#c0392b" strokeWidth="3" strokeLinecap="round" />
      )}

      {thinking && [0, 1, 2].map(i => (
        <circle key={i} cx={72 + i * 12} cy="16" r="4" fill="#d4952a" opacity=".85">
          <animate attributeName="cy" values="16;7;16" dur=".9s"
            begin={`${i * 0.22}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values=".4;1;.4" dur=".9s"
            begin={`${i * 0.22}s`} repeatCount="indefinite" />
        </circle>
      ))}

      {phase === 'listening' && [0, 1, 2].map(i => (
        <circle key={i} cx="60" cy={108} r={6 + i * 4} fill="none"
          stroke="#d4952a" strokeWidth="1.5" opacity={.5 - i * .15}>
          <animate attributeName="r" values={`${6 + i * 4};${14 + i * 6};${6 + i * 4}`}
            dur="1.4s" begin={`${i * .3}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values={`.5;0;.5`}
            dur="1.4s" begin={`${i * .3}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </svg>
  );
}

const iconBtn = {
  background: 'rgba(255,255,255,.13)', border: 'none', borderRadius: '50%',
  width: 30, height: 30, color: '#fff', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.8rem',
};

/* ── Main FaheemWidget component ── */
export default function FaheemWidget({ studentName = 'بطل', studentGender = 'male' }) {
  const isFemale = studentGender === 'female';
  const { speak, cancel } = useSpeech();

  const [open,      setOpen]    = useState(false);
  const [greeted,   setGreeted] = useState(false);
  const [phase,     setPhase]   = useState('idle');
  const [msgs,      setMsgs]    = useState([]);
  const [input,     setInput]   = useState('');
  const [isRec,     setIsRec]   = useState(false);
  const [mouthOpen, setMouthO]  = useState(false);
  const [blink,     setBlink]   = useState(false);
  const [bob,       setBob]     = useState(0);
  const [sttErr,    setSttErr]  = useState('');

  const recRef   = useRef(null);
  const endRef   = useRef(null);
  const mouthTid = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  useEffect(() => {
    let t;
    const tick = () => { setBob(b => b === 0 ? -5 : 0); t = setTimeout(tick, 1100); };
    t = setTimeout(tick, 1100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let t;
    const schedule = () => {
      t = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 130);
        schedule();
      }, 2300 + Math.random() * 2700);
    };
    schedule();
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    clearTimeout(mouthTid.current);
    if (phase === 'speaking') {
      const tick = () => { setMouthO(m => !m); mouthTid.current = setTimeout(tick, 185); };
      mouthTid.current = setTimeout(tick, 185);
    } else {
      setMouthO(false);
    }
    return () => clearTimeout(mouthTid.current);
  }, [phase]);

  const sayText = useCallback((text) => {
    setPhase('speaking');
    speak(text, { onEnd: () => setPhase(p => p === 'speaking' ? 'idle' : p) });
  }, [speak]);

  useEffect(() => {
    if (!open || greeted) return;
    setGreeted(true);
    const g = isFemale
      ? `مَرْحَبًا يَا ${studentName} فِي أَكَادِيمِيَّةِ عَارِم! أَنَا صَدِيقُكِ وَمُرَافِقُكِ الذَّكِيُّ فَهِيمٌ. أَخْبِرِينِي يَا بَطَلَةُ، مَاذَا تُرِيدِينَ أَنْ نَتَحَدَّثَ عَنْهُ الْيَوْمَ؟`
      : `مَرْحَبًا يَا ${studentName} فِي أَكَادِيمِيَّةِ عَارِم! أَنَا صَدِيقُكَ وَمُرَافِقُكَ الذَّكِيُّ فَهِيمٌ. أَخْبِرْنِي يَا بَطَلُ، مَاذَا تُرِيدُ أَنْ نَتَحَدَّثَ عَنْهُ الْيَوْمَ؟`;
    setMsgs([{ role: 'ai', text: g }]);
    const t = setTimeout(() => sayText(g), 700);
    return () => clearTimeout(t);
  }, [open, greeted, studentName, isFemale, sayText]);

  // Input lockdown: locked while thinking AND while speaking (TTS).
  // Unlocks only when Faheem finishes talking and the audio engine is silent.
  const locked = phase === 'thinking' || phase === 'speaking';

  async function sendMsg(text) {
    if (!text.trim() || locked) return;
    const t = text.trim();
    setMsgs(p => [...p, { role: 'user', text: t }]);
    setInput('');
    cancel();
    setPhase('thinking');

    try {
      const res  = await fetch('/api/faheem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: t, history: msgs, studentName, studentGender }),
      });
      const json = await res.json();
      const reply = json.reply || 'يَا بَطَلُ، جَرِّبْ سُؤَالاً آخَرَ مِنْ فَضْلِكَ!';
      setMsgs(p => [...p, { role: 'ai', text: reply }]);
      sayText(reply);
    } catch {
      const fb = 'يَا صَدِيقِي، الاتِّصَالُ بَطِيءٌ قَلِيلاً. هَلْ تُحَاوِلُ مُجَدَّدًا؟';
      setMsgs(p => [...p, { role: 'ai', text: fb }]);
      sayText(fb);
    }
  }

  function startListen() {
    setSttErr('');
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setSttErr('مُتَصَفِّحُكَ لَا يَدْعَمُ الإِدْخَالَ الصَّوْتِيَّ — جَرِّبْ Google Chrome');
      return;
    }
    cancel();
    setPhase('listening');
    setIsRec(true);

    const r = new SR();
    r.lang = 'ar-SA';
    r.continuous = false;
    r.interimResults = false;

    r.onresult = e => {
      const tr = e.results[0]?.[0]?.transcript;
      if (tr) sendMsg(tr);
    };
    r.onerror = e => {
      setIsRec(false);
      setPhase('idle');
      if (e.error === 'not-allowed') setSttErr('يُرْجَى السَّمَاحُ بِالْوُصُولِ إِلَى الْمَيكُرُوفُون');
      else setSttErr('لَمْ أَسْمَعْ شَيْئًا بِوُضُوحٍ — حَاوِلْ مَرَّةً أُخْرَى');
    };
    r.onend = () => {
      setIsRec(false);
      setPhase(p => p === 'listening' ? 'idle' : p);
    };

    recRef.current = r;
    r.start();
  }

  function stopListen() {
    recRef.current?.stop();
    setIsRec(false);
    setPhase('idle');
  }

  const phaseLabel = {
    listening: '🎤 يَسْتَمِعُ...',
    thinking:  '💭 يُفَكِّرُ...',
    speaking:  '🔊 يَتَحَدَّثُ...',
    idle:      '● مُتَّصِلٌ',
  }[phase];

  return (
    <>
      <style>{`
        @keyframes fPulse {
          0%,100% { box-shadow: 0 8px 28px rgba(31,45,90,.38), 0 0 0 4px rgba(212,149,42,.22); }
          50%      { box-shadow: 0 8px 28px rgba(31,45,90,.45), 0 0 0 10px rgba(212,149,42,.10); }
        }
        @keyframes fDot {
          0%,80%,100% { transform: scale(.55); opacity: .35; }
          40%          { transform: scale(1);   opacity: 1;   }
        }
        @keyframes fSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(.96); }
          to   { opacity: 1; transform: translateY(0)   scale(1);   }
        }
      `}</style>

      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="تَحَدَّثْ مَعَ فَهِيمٍ"
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
            width: 72, height: 72, borderRadius: '50%',
            border: '3px solid #d4952a',
            background: 'linear-gradient(135deg,#1f2d5a,#2d4a8a)',
            cursor: 'pointer', padding: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            animation: 'fPulse 2.5s ease-in-out infinite',
          }}
        >
          <span style={{ fontSize: '2rem', lineHeight: 1 }}>🧒</span>
          <span style={{ fontSize: '.52rem', color: '#d4952a', fontWeight: 800, marginTop: 2 }}>فَهِيمٌ</span>
        </button>
      )}

      {open && (
        <div style={{
          position: 'fixed', bottom: 16, right: 16, zIndex: 1000,
          width: 348, maxWidth: 'calc(100vw - 32px)',
          background: '#fff', borderRadius: 24,
          boxShadow: '0 20px 64px rgba(0,0,0,.22), 0 0 0 1px rgba(31,45,90,.08)',
          display: 'flex', flexDirection: 'column',
          maxHeight: 'calc(100vh - 40px)',
          animation: 'fSlideUp .3s ease-out',
        }}>

          <div style={{
            background: 'linear-gradient(135deg,#1f2d5a,#2d4a8a)',
            padding: '12px 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderRadius: '24px 24px 0 0', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 42, height: 42, borderRadius: '50%',
                border: '2px solid #d4952a', background: 'rgba(255,255,255,.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.7rem',
              }}>🧒</div>
              <div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: '.92rem' }}>فَهِيمٌ</div>
                <div style={{ color: 'rgba(255,255,255,.6)', fontSize: '.7rem' }}>{phaseLabel}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {phase === 'speaking' && (
                <button onClick={() => { cancel(); setPhase('idle'); }} style={iconBtn} title="إِيقَافُ الصَّوْتِ">🔇</button>
              )}
              <button onClick={() => setOpen(false)} style={iconBtn} title="إِغْلَاقٌ">✕</button>
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(180deg,#eef3fb 0%,#f8faff 100%)',
            display: 'flex', justifyContent: 'center', alignItems: 'flex-end',
            padding: '14px 0 4px', borderBottom: '1px solid #e8eef5', flexShrink: 0,
          }}>
            <FaheemFace phase={phase} mouthOpen={mouthOpen} blink={blink} bob={phase === 'idle' ? bob : 0} />
          </div>

          <div style={{
            flex: 1, overflowY: 'auto', padding: '12px 14px',
            display: 'flex', flexDirection: 'column', gap: 8, minHeight: 80,
          }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-start' : 'flex-end' }}>
                <div style={{
                  maxWidth: '83%',
                  background: m.role === 'user' ? '#f1f5f9' : 'linear-gradient(135deg,#1f2d5a,#2d4a8a)',
                  color: m.role === 'user' ? '#1a2d4a' : '#fff',
                  borderRadius: m.role === 'user' ? '18px 18px 18px 4px' : '18px 18px 4px 18px',
                  padding: '9px 13px', fontSize: '.82rem',
                  lineHeight: 1.65, direction: 'rtl',
                }}>
                  {m.text}
                </div>
              </div>
            ))}

            {phase === 'thinking' && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{
                  background: 'linear-gradient(135deg,#1f2d5a,#2d4a8a)',
                  borderRadius: '18px 18px 4px 18px',
                  padding: '10px 18px', display: 'flex', gap: 5, alignItems: 'center',
                }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: '#d4952a', display: 'inline-block',
                      animation: `fDot 1.2s ease-in-out ${i * .22}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {sttErr && (
            <div style={{
              background: '#fff3e0', color: '#e65100',
              fontSize: '.75rem', textAlign: 'center',
              padding: '7px 14px', borderTop: '1px solid #ffe0b2',
              direction: 'rtl', flexShrink: 0,
            }}>
              {sttErr}
            </div>
          )}

          <div style={{
            borderTop: '1px solid #e8eef5', padding: '10px 12px',
            display: 'flex', gap: 8, alignItems: 'center',
            background: '#fafbfc', borderRadius: '0 0 24px 24px', flexShrink: 0,
          }}>
            <button
              onClick={isRec ? stopListen : startListen}
              disabled={locked}
              style={{
                width: 38, height: 38, borderRadius: '50%', border: 'none',
                background: isRec ? '#e53935'
                          : locked ? '#c3cbd6'
                          : 'linear-gradient(135deg,#1f2d5a,#2d4a8a)',
                color: '#fff', cursor: locked ? 'not-allowed' : 'pointer',
                opacity: locked ? .65 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1rem', flexShrink: 0,
                boxShadow: isRec ? '0 0 0 5px rgba(229,57,53,.22)' : 'none',
                transition: 'all .2s',
              }}
            >
              {isRec ? '⏹' : '🎤'}
            </button>

            <input
              type="text"
              value={input}
              dir="rtl"
              disabled={locked}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(input); }
              }}
              placeholder={
                phase === 'thinking' ? 'فَهِيمٌ يُفَكِّرُ... 💭'
                : phase === 'speaking' ? 'فَهِيمٌ يَتَحَدَّثُ... 🔊'
                : 'اكْتُبْ سُؤَالَكَ لِفَهِيمٍ...'
              }
              style={{
                flex: 1, border: '1.5px solid #e8eef5', borderRadius: 20,
                padding: '8px 14px', fontSize: '.82rem',
                outline: 'none',
                background: locked ? '#f1f3f6' : '#fff',
                color: '#1a2d4a',
                cursor: locked ? 'not-allowed' : 'text',
                fontFamily: 'inherit',
              }}
            />

            <button
              onClick={() => sendMsg(input)}
              disabled={!input.trim() || locked}
              style={{
                width: 38, height: 38, borderRadius: '50%', border: 'none',
                background: input.trim() && !locked ? '#d4952a' : '#e0e0e0',
                color: '#fff', cursor: input.trim() && !locked ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.1rem', flexShrink: 0, transition: 'background .2s',
              }}
            >
              &#x2190;
            </button>
          </div>
        </div>
      )}
    </>
  );
}
