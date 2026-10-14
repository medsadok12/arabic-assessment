/* Branded full-screen loading state — shared by every loading.jsx so navigation
   between pages shows a warm Aarem screen instead of a blank white flash.
   Pure presentational (no hooks) → safe as a Server Component.
   mascot="faheem" swaps the spinning "ع" ring for فهيم's floating face —
   used on the child/parent-facing and admin screens (dashboard, library, bogga). */
export default function LoadingScreen({ label = 'لحظة صغيرة...', mascot = 'brand' }) {
  return (
    <div
      dir="rtl"
      style={{
        minHeight: '100dvh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 22,
        background: 'linear-gradient(160deg,#FAF7F2,#F4EFE6)',
        padding: 24, textAlign: 'center',
      }}
    >
      <style>{`
        @keyframes aremSpin { to { transform: rotate(360deg); } }
        @keyframes aremBob  { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
      `}</style>

      {mascot === 'faheem' ? (
        <img
          src="/faheem-loading.png"
          alt="فَهِيمٌ"
          width={950} height={707}
          style={{
            height: 104, width: 'auto',
            filter: 'drop-shadow(0 8px 16px rgba(26,43,74,.18))',
            animation: 'aremBob 1.6s ease-in-out infinite',
          }}
        />
      ) : (
        <div style={{ position: 'relative', width: 88, height: 88 }}>
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '5px solid #EDE5D8', borderTopColor: '#E8B84B',
            animation: 'aremSpin 0.9s linear infinite',
          }} />
          <div style={{
            position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
            fontSize: '2.3rem', fontWeight: 900, color: '#1A2B4A',
            animation: 'aremBob 1.6s ease-in-out infinite',
          }}>
            ع
          </div>
        </div>
      )}

      <div style={{ color: '#1A2B4A', fontWeight: 800, fontSize: '1.05rem' }}>
        {label}
      </div>
    </div>
  );
}
