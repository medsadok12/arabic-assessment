'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const PIECE_COST = 50;

const PIECE_COLORS = [
  ['#6366F1','#4F46E5'], ['#EC4899','#DB2777'], ['#F59E0B','#D97706'],
  ['#10B981','#059669'], ['#3B82F6','#2563EB'], ['#8B5CF6','#7C3AED'],
  ['#EF4444','#DC2626'], ['#14B8A6','#0D9488'], ['#F97316','#EA580C'],
  ['#84CC16','#65A30D'], ['#06B6D4','#0891B2'], ['#A855F7','#9333EA'],
  ['#0EA5E9','#0284C7'], ['#F43F5E','#E11D48'], ['#22D3EE','#06B6D4'],
  ['#FB923C','#F97316'], ['#4ADE80','#22C55E'], ['#C084FC','#A855F7'],
  ['#FCD34D','#F59E0B'], ['#34D399','#10B981'], ['#818CF8','#6366F1'],
];

const PUZZLE_BG = [
  'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',
  'linear-gradient(135deg,#f093fb 0%,#f5576c 100%)',
  'linear-gradient(135deg,#4facfe 0%,#00f2fe 100%)',
  'linear-gradient(135deg,#43e97b 0%,#38f9d7 100%)',
  'linear-gradient(135deg,#fa709a 0%,#fee140 100%)',
  'linear-gradient(135deg,#a18cd1 0%,#fbc2eb 100%)',
  'linear-gradient(135deg,#ffecd2 0%,#fcb69f 100%)',
];

const PUZZLE_ICONS = ['🌴','🎈','🌈','🦋','🐬','⭐','🏰'];

function Confetti({ active }) {
  const particles = useRef([]);
  if (particles.current.length === 0) {
    particles.current = Array.from({ length: 55 }, (_, i) => ({
      id: i,
      x: (i * 1.85) % 100,
      color: ['#F59E0B','#EC4899','#6366F1','#10B981','#3B82F6','#F97316','#EF4444','#A855F7'][i % 8],
      delay: (i * 0.038),
      dur: 2.2 + (i % 7) * 0.18,
      size: 7 + (i % 5),
      shape: i % 3,
    }));
  }
  if (!active) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
      <style>{`
        @keyframes cf-drop {
          0%   { transform: translateY(-20px) rotate(0deg) scale(1); opacity: 1; }
          80%  { opacity: 0.7; }
          100% { transform: translateY(105vh) rotate(540deg) scale(0.5); opacity: 0; }
        }
        @keyframes pw-pop {
          0%  { transform: scale(0); opacity: 0; }
          70% { transform: scale(1.18); }
          100%{ transform: scale(1);  opacity: 1; }
        }
        @keyframes pw-spin { to { transform: rotate(360deg); } }
        @keyframes pw-fade { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform: translateY(0); } }
        @keyframes pw-shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        @keyframes pw-unlock {
          0%   { opacity: 1; transform: scale(1); }
          40%  { opacity: 0.3; transform: scale(1.08); }
          100% { opacity: 0; transform: scale(0.85); }
        }
        @keyframes pw-star {
          0%,100% { transform: scale(1) rotate(0deg); }
          50%     { transform: scale(1.2) rotate(15deg); }
        }
      `}</style>
      {particles.current.map(p => (
        <div key={p.id} style={{
          position: 'absolute', left: `${p.x}%`, top: 0,
          width: p.shape === 2 ? p.size * 2 : p.size,
          height: p.size,
          borderRadius: p.shape === 0 ? '50%' : p.shape === 1 ? 3 : 1,
          background: p.color,
          animation: `cf-drop ${p.dur}s ${p.delay}s ease-in forwards`,
        }} />
      ))}
    </div>
  );
}

export default function PuzzleWidget() {
  const [puzzle, setPuzzle]       = useState(null);
  const [progress, setProgress]   = useState(null);
  const [points, setPoints]       = useState(0);
  const [loading, setLoading]     = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [confetti, setConfetti]   = useState(false);
  const [finale, setFinale]       = useState(false);
  const [lastPiece, setLastPiece] = useState(null);
  const [msg, setMsg]             = useState(null);
  const [badge, setBadge]         = useState(null);
  const [completionBonus, setCompletionBonus] = useState(0);
  const msgRef = useRef(null);
  const allCompleted = useRef(false);

  const load = useCallback(async (next = false) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/puzzle${next ? '?next=1' : ''}`);
      const j = await r.json();
      setPuzzle(j.puzzle ?? null);
      setProgress(j.progress ?? null);
      setPoints(j.points ?? 0);
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function showMsg(text, type = 'info') {
    clearTimeout(msgRef.current);
    setMsg({ text, type });
    msgRef.current = setTimeout(() => setMsg(null), type === 'encourage' ? 4500 : 2500);
  }

  function speak(text) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ar-SA'; u.rate = 0.83;
    const ar = window.speechSynthesis.getVoices().find(v => v.lang.startsWith('ar'));
    if (ar) u.voice = ar;
    window.speechSynthesis.speak(u);
  }

  async function handleUnlock() {
    if (unlocking || !puzzle || !progress) return;
    const total   = puzzle.cols * puzzle.rows;
    const unlocked = Array.isArray(progress.unlocked) ? progress.unlocked : [];
    if (unlocked.length >= total) return;

    if (points < PIECE_COST) {
      showMsg('🌟 العب المزيد من الألعاب واجمع النجوم لتفتح هذه القطعة السحرية!', 'encourage');
      speak('العب المزيد من الألعاب واجمع النجوم لتفتح هذه القطعة السحرية!');
      return;
    }

    setUnlocking(true);
    try {
      const r = await fetch('/api/puzzle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'unlock' }) });
      const j = await r.json();
      if (j.success) {
        setPoints(j.newPoints);
        setLastPiece(j.unlockedPiece);
        setProgress(prev => ({ ...prev, unlocked: j.unlocked, completed_at: j.completed_at ?? null }));
        setConfetti(true);
        setTimeout(() => setConfetti(false), 3200);

        if (j.isCompleted) {
          setBadge(j.badge);
          setCompletionBonus(j.completionBonus ?? 0);
          setTimeout(() => {
            setFinale(true);
            speak(`مبروك يا بطل! أكملت الأحجية وحصلت على وسام ${j.badge?.name ?? 'البطولة'}! أنت رائع!`);
          }, 900);
        } else {
          speak('رائع! قطعة جديدة اكتشفتها!');
          showMsg('✨ رائع! قطعة جديدة مكتشفة!', 'success');
          setTimeout(() => setLastPiece(null), 1200);
        }
      }
    } catch (_) {}
    setUnlocking(false);
  }

  async function handleNextPuzzle() {
    setFinale(false); setBadge(null); setLastPiece(null);
    await load(true);
  }

  if (loading) return (
    <div style={S.card}>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 48, gap: 14 }}>
        <div style={S.spinner} />
        <span style={S.hint}>جاري تحميل الأحجية…</span>
      </div>
    </div>
  );

  if (!puzzle) return (
    <div style={S.card}>
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>🏆</div>
        <div style={{ fontFamily: "'Cairo','Tajawal',sans-serif", fontWeight: 800, color: '#D97706', fontSize: '1.1rem' }}>أكملت كل الأحاجي — أنت بطل!</div>
        <div style={S.hint}>سيضيف المعلم أحاجي جديدة قريباً</div>
      </div>
    </div>
  );

  const total     = puzzle.cols * puzzle.rows;
  const unlocked  = Array.isArray(progress?.unlocked) ? progress.unlocked : [];
  const done      = unlocked.length;
  const pct       = Math.round((done / total) * 100);
  const complete  = done >= total;
  const canAfford = points >= PIECE_COST;
  const bgGrad    = PUZZLE_BG[(puzzle.seq - 1) % PUZZLE_BG.length] ?? PUZZLE_BG[0];
  const icon      = PUZZLE_ICONS[(puzzle.seq - 1) % PUZZLE_ICONS.length] ?? '🧩';

  return (
    <div style={S.card} dir="rtl">
      <Confetti active={confetti} />

      {/* Grand Finale */}
      {finale && (
        <div style={S.overlay}>
          <div style={S.finaleCard}>
            <div style={{ fontSize: '5rem', animation: 'pw-pop 0.6s ease forwards' }}>{badge?.icon ?? '🏆'}</div>
            <h2 style={{ fontFamily: "'Cairo','Tajawal',sans-serif", color: '#D97706', fontSize: '1.7rem', margin: '10px 0 4px', fontWeight: 900 }}>مبروك يا بطل! 🎉</h2>
            <p style={S.hint}>أكملت الأحجية وحصلت على وسام</p>
            {badge?.name && (
              <div style={S.badgePill}>{badge.icon} {badge.name}</div>
            )}
            {completionBonus > 0 && (
              <div style={{ background:'#FEF3C7', border:'1.5px solid #FDE68A', borderRadius:12, padding:'8px 20px', fontWeight:800, fontSize:'.95rem', color:'#D97706', marginTop:4 }}>
                ⭐ مكافأة الإكمال: +{completionBonus} نقطة!
              </div>
            )}
            <button onClick={handleNextPuzzle} style={{ ...S.btnGold, marginTop: 20, width: 'auto', padding: '13px 32px', fontSize: '1rem' }}>
              الأحجية التالية ←
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={S.header}>
        <div>
          <div style={{ fontSize: '.72rem', color: '#9CA3AF', fontWeight: 700, letterSpacing: .5 }}>🧩 الأحجية السحرية</div>
          <div style={{ fontSize: '1rem', fontWeight: 900, color: '#1F2937', marginTop: 2 }}>{puzzle.title}</div>
        </div>
        <div style={S.pointsPill}>
          <span style={{ fontSize: '1.1rem', animation: 'pw-star 2s ease-in-out infinite' }}>⭐</span>
          <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#D97706' }}>{points.toLocaleString()}</span>
          <span style={{ fontSize: '.72rem', color: '#92400E', fontWeight: 600 }}>نقطة</span>
        </div>
      </div>

      {/* Progress */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={S.hint}>اكتمال الصورة</span>
          <span style={{ fontSize: '.78rem', fontWeight: 800, color: '#D97706' }}>{done}/{total} قطعة — {pct}%</span>
        </div>
        <div style={S.progressTrack}>
          <div style={{ ...S.progressFill, width: `${pct}%` }} />
        </div>
      </div>

      {/* Puzzle Grid */}
      <div style={{
        position: 'relative',
        width: '100%',
        aspectRatio: `${puzzle.cols}/${puzzle.rows}`,
        borderRadius: 18,
        overflow: 'hidden',
        boxShadow: '0 12px 40px rgba(0,0,0,0.22)',
      }}>
        {/* Background: image or gradient */}
        {puzzle.image_url ? (
          <img src={puzzle.image_url} alt={puzzle.title}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { e.target.style.display = 'none'; }}
          />
        ) : null}
        <div style={{ position: 'absolute', inset: 0, background: bgGrad, zIndex: puzzle.image_url ? -1 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {!puzzle.image_url && <span style={{ fontSize: '6rem', opacity: .4 }}>{icon}</span>}
        </div>

        {/* Piece overlays */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'grid',
          gridTemplateColumns: `repeat(${puzzle.cols}, 1fr)`,
          gridTemplateRows: `repeat(${puzzle.rows}, 1fr)`,
          gap: 2, padding: 2, zIndex: 2,
        }}>
          {Array.from({ length: total }, (_, i) => {
            const isUnlocked  = unlocked.includes(i);
            const justUnlocked = i === lastPiece;
            const [c1, c2]    = PIECE_COLORS[i % PIECE_COLORS.length];

            return (
              <div key={i} style={{
                borderRadius: 6,
                background: isUnlocked ? 'transparent' : `linear-gradient(135deg,${c1},${c2})`,
                opacity: isUnlocked ? 0 : 1,
                transition: 'opacity 0.7s ease, transform 0.5s ease',
                transform: isUnlocked ? 'scale(0.7)' : 'scale(1)',
                animation: justUnlocked ? 'pw-unlock 0.7s ease forwards' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', position: 'relative', cursor: 'default',
              }}>
                {!isUnlocked && (
                  <>
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)',
                      backgroundSize: '200% 100%',
                      animation: `pw-shimmer 2.8s ${i * 0.15}s ease-in-out infinite`,
                    }} />
                    <span style={{ fontSize: puzzle.cols >= 5 ? '.75rem' : '1rem', opacity: 0.65, zIndex: 1 }}>⭐</span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Faheem message */}
      {msg && (
        <div style={{
          ...S.msgBubble,
          background: msg.type === 'success' ? '#D1FAE5' : msg.type === 'encourage' ? '#FEF3C7' : '#EFF6FF',
          color: msg.type === 'success' ? '#065F46' : msg.type === 'encourage' ? '#92400E' : '#1D4ED8',
          borderColor: msg.type === 'success' ? '#6EE7B7' : msg.type === 'encourage' ? '#FDE68A' : '#BFDBFE',
          animation: 'pw-fade 0.3s ease',
        }}>
          <span style={{ fontSize: '1.1rem' }}>🦉</span> {msg.text}
        </div>
      )}

      {/* Action */}
      {complete && !finale ? (
        <button onClick={() => { setFinale(true); speak(`أكملت الأحجية! أنت رائع يا بطل!`); }} style={S.btnGold}>
          🎉 احتفل بإنجازك!
        </button>
      ) : !complete && (
        <button onClick={handleUnlock} disabled={unlocking} style={{
          ...S.btnGold,
          background: canAfford
            ? 'linear-gradient(135deg,#F59E0B,#D97706)'
            : 'linear-gradient(135deg,#9CA3AF,#6B7280)',
          opacity: unlocking ? 0.75 : 1,
          cursor: unlocking ? 'wait' : 'pointer',
          boxShadow: canAfford ? '0 4px 18px rgba(245,158,11,0.45)' : 'none',
        }}>
          {unlocking ? '⏳ جاري فتح القطعة…' : canAfford
            ? `✨ افتح قطعة مفقودة — ${PIECE_COST} نقطة`
            : `🔒 اجمع ${PIECE_COST} نقطة لفتح قطعة`}
        </button>
      )}

      <div style={{ textAlign: 'center' }}>
        <span style={{ ...S.hint, fontSize: '.7rem' }}>العب الألعاب في المكتبة لتجمع نقاطاً أكثر ⭐</span>
      </div>
    </div>
  );
}

const S = {
  card: {
    background: '#fff', borderRadius: 22, padding: '18px 16px',
    boxShadow: '0 6px 28px rgba(0,0,0,0.09)', border: '1.5px solid #FDE68A',
    display: 'flex', flexDirection: 'column', gap: 14,
    fontFamily: "'Cairo','Tajawal',sans-serif", direction: 'rtl',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  pointsPill: {
    display: 'flex', alignItems: 'center', gap: 5,
    background: '#FFFBEB', border: '1.5px solid #FDE68A',
    borderRadius: 20, padding: '6px 14px', flexShrink: 0,
  },
  progressTrack: { height: 10, background: '#F3F4F6', borderRadius: 10, overflow: 'hidden' },
  progressFill: {
    height: '100%', background: 'linear-gradient(90deg,#F59E0B,#D97706)',
    borderRadius: 10, transition: 'width 0.9s ease',
  },
  msgBubble: {
    borderRadius: 12, padding: '10px 14px', fontSize: '.87rem',
    fontWeight: 600, border: '1.5px solid', display: 'flex', alignItems: 'center', gap: 8,
  },
  btnGold: {
    background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: '#fff',
    border: 'none', borderRadius: 14, padding: '14px 0', fontSize: '.96rem',
    fontWeight: 700, cursor: 'pointer', fontFamily: "'Cairo','Tajawal',sans-serif",
    width: '100%', transition: 'transform .15s, box-shadow .15s',
  },
  hint: { fontSize: '.77rem', color: '#9CA3AF', fontWeight: 500 },
  spinner: { width: 32, height: 32, border: '4px solid #FDE68A', borderTopColor: '#D97706', borderRadius: '50%', animation: 'pw-spin 0.8s linear infinite' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  finaleCard: {
    background: '#fff', borderRadius: 24, padding: '44px 32px', textAlign: 'center',
    maxWidth: 380, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
    fontFamily: "'Cairo','Tajawal',sans-serif",
  },
  badgePill: {
    background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: '#fff',
    borderRadius: 24, padding: '8px 22px', fontWeight: 800, fontSize: '1.05rem',
    marginTop: 6,
  },
};
