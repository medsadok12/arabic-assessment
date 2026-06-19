'use client';
import Link from 'next/link';
import PuzzleWidget from '../../../components/PuzzleWidget';

export default function PuzzlePage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg,#FFFBEB 0%,#FEF3C7 100%)',
      paddingBottom: 48,
      fontFamily: "'Cairo','Tajawal',sans-serif",
      direction: 'rtl',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg,#F59E0B,#D97706)',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        boxShadow: '0 4px 16px rgba(245,158,11,0.35)',
      }}>
        <Link href="/library" style={{
          background: 'rgba(255,255,255,0.22)',
          borderRadius: 10,
          width: 38, height: 38,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: '1.2rem', textDecoration: 'none', flexShrink: 0,
        }}>→</Link>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '.7rem', fontWeight: 700 }}>المكتبة</div>
          <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 900 }}>🧩 الأحجية السحرية</div>
        </div>
      </div>

      {/* Subtitle */}
      <div style={{ textAlign: 'center', padding: '20px 20px 4px' }}>
        <p style={{ color: '#92400E', fontSize: '.88rem', fontWeight: 600, lineHeight: 1.7, margin: 0 }}>
          العب الألعاب واجمع النجوم ⭐ لتكتشف الصورة المخفية قطعةً قطعة!
        </p>
      </div>

      {/* Puzzle Widget */}
      <div style={{ padding: '16px 16px 0', maxWidth: 520, margin: '0 auto' }}>
        <PuzzleWidget />
      </div>

      {/* Points guide */}
      <div style={{ maxWidth: 520, margin: '20px auto 0', padding: '0 16px' }}>
        <div style={{
          background: '#fff',
          borderRadius: 16,
          padding: '16px 18px',
          border: '1.5px solid #FDE68A',
          boxShadow: '0 4px 14px rgba(0,0,0,0.07)',
        }}>
          <div style={{ fontWeight: 800, color: '#D97706', marginBottom: 12, fontSize: '.92rem' }}>⭐ كيف تجمع النقاط؟</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { icon: '📅', label: 'دخول يومي', pts: '+10 نقطة' },
              { icon: '📚', label: 'إنهاء واجب', pts: '+15 نقطة' },
              { icon: '✅', label: 'حضور حصة', pts: '+20 نقطة' },
              { icon: '🎡', label: 'لعب عجلة الكلمات', pts: '+5 نقاط/كلمة' },
            ].map(({ icon, label, pts }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '.85rem', color: '#374151' }}>{icon} {label}</span>
                <span style={{ fontWeight: 800, color: '#F59E0B', fontSize: '.85rem' }}>{pts}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
