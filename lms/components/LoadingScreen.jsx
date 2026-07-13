/* Branded full-screen loading state — shared by every loading.jsx so navigation
   between pages shows a warm Aarem screen instead of a blank white flash.
   Pure presentational (no hooks) → safe as a Server Component. */
export default function LoadingScreen({ label = 'لحظة صغيرة...' }) {
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

      <div style={{ color: '#1A2B4A', fontWeight: 800, fontSize: '1.05rem' }}>
        {label}
      </div>
    </div>
  );
}
