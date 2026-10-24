'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import HeroAvatar3D from './HeroAvatar3D';
import { ACHIEVEMENTS, LEVELS, charOf } from '../lib/hero-catalog';

/* بطاقة البطل في لوحة الطالب: بطله ثلاثي الأبعاد من «عالم الأبطال» بملابسه ومعداته وعالمه،
   على منصة مستواه، ولقبه تحت اسمه. لمسه يطلق حركته الخاصة.
   لا تظهر قبل أن يحفظ الطالب بطله أول مرة — تظهر بدلها بطاقة «اصنع بطلك!» في اللوحة. */

const GREETINGS = [
  'بَطَلُكَ جَاهِزٌ مَعَكَ الْيَوْمَ!',
  'بِجَانِبِكَ دَائِمًا فِي رِحْلَةِ التَّعَلُّمِ.',
  'رَفِيقُكَ فِي كُلِّ خُطْوَةٍ مِنْ رِحْلَتِكَ!',
  'الْمِسْهُ لِيُرِيَكَ حَرَكَتَهُ الْخَاصَّةَ! ⭐',
];

export default function DashboardHero3D({ pendingHw, nextSession, isStudent, viewingChildId = null }) {
  const [cfg, setCfg] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [greeting, setGreeting] = useState('');
  const heroRef = useRef(null);

  useEffect(() => {
    setIsMobile(window.innerWidth < 640);
    setGreeting(GREETINGS[Math.floor(Date.now() / 86400000) % GREETINGS.length]);
  }, []);

  useEffect(() => {
    if (!isStudent) { setCfg({}); return; }
    // ?child= صريح دائماً (self للجذر) — يتجاوز أي كوكي عالق على طفل سابق
    fetch(`/api/hero-config?child=${viewingChildId || 'self'}`)
      .then(r => r.json())
      .then(d => setCfg(d))
      .catch(() => setCfg({}));
  }, [isStudent, viewingChildId]);

  if (!cfg?.look) return cfg === null ? <div style={{ marginBottom: 28 }} /> : null;

  const C = charOf(cfg.look);
  const titleA = ACHIEVEMENTS.find(a => a.id === cfg.title);
  const lv = LEVELS[Math.min(LEVELS.length - 1, Math.max(0, cfg.level ?? 0))];
  const w = cfg.weekly;
  const prize = w && !w.claimed && w.progress >= w.goal;

  const statusMsg = pendingHw > 0
    ? `لديك ${pendingHw} واجب${pendingHw === 1 ? '' : 'ات'} معلّقة ⚡`
    : nextSession
      ? 'حصتك القادمة في الأسفل 📅'
      : 'يوم رائع! استمر في التعلم 🌟';

  return (
    <div style={{
      display: 'flex', alignItems: 'stretch', borderRadius: 24, overflow: 'hidden',
      background: 'linear-gradient(135deg, #F3EEFF 0%, #FFF6E7 100%)',
      border: '1.5px solid #E4DCFA',
      boxShadow: '0 6px 28px rgba(124,92,217,.10), 0 1px 4px rgba(0,0,0,.05)',
      marginBottom: 24, minHeight: isMobile ? 190 : 220, position: 'relative',
    }}>
      <div style={{
        flex: 1, padding: isMobile ? '18px 16px' : '22px 28px',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10, zIndex: 1,
        fontFamily: "var(--font-cairo), 'Cairo', 'Tajawal', sans-serif", color: '#1A2B4A',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, width: 'fit-content',
          background: '#1A2B4A', color: '#fff', borderRadius: 30, padding: '5px 14px',
          fontWeight: 800, fontSize: isMobile ? '.82rem' : '.9rem', whiteSpace: 'nowrap',
        }}>
          {C.icon} {C.name} · {lv.icon} {lv.name}
        </div>
        {titleA && (
          <div style={{ fontWeight: 800, fontSize: isMobile ? '.82rem' : '.9rem', color: '#8A6412' }}>{titleA.icon} {titleA.title}</div>
        )}
        <p style={{ margin: 0, fontFamily: "var(--font-naskh), 'Noto Naskh Arabic', serif", fontSize: isMobile ? '.95rem' : '1.05rem', color: '#52627E', fontWeight: 700, lineHeight: 1.8 }}>
          {greeting}
        </p>
        <p style={{ margin: 0, fontSize: isMobile ? '.8rem' : '.86rem', color: pendingHw > 0 ? '#B7791F' : '#1E8A5B', fontWeight: 700 }}>
          {statusMsg}
        </p>
        {prize && (
          <p style={{ margin: 0, fontSize: isMobile ? '.8rem' : '.86rem', color: '#7C5CD9', fontWeight: 800 }}>🎁 جَائِزَةُ تَحَدِّي الْأُسْبُوعِ تَنْتَظِرُكَ!</p>
        )}
        <Link href="/dashboard/heroes-studio" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, width: 'fit-content',
          background: '#7C5CD9', color: 'white', borderRadius: 30, padding: '10px 20px',
          fontSize: '.9rem', fontWeight: 800, textDecoration: 'none', minHeight: 44,
          boxShadow: '0 4px 14px rgba(124,92,217,.35)',
        }}>
          🌍 عَالَمُ بَطَلِي
        </Link>
      </div>

      <div style={{ width: isMobile ? 150 : 220, flexShrink: 0, position: 'relative' }}>
        <HeroAvatar3D ref={heroRef} look={cfg.look} level={cfg.level ?? 0} letters={cfg.letters} interactive={false}
          label={`بَطَلُكَ ${C.name} — الْمِسْهُ لِيَقُومَ بِـ${C.special.name}`}
          onTap={() => heroRef.current?.special()} style={{ position: 'absolute', inset: 0 }} />
      </div>
    </div>
  );
}
