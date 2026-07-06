/* Warm, child-friendly full-screen message — shared by error.jsx and not-found.jsx
   so the child never sees a bare English crash screen. Pure presentational (no
   hooks) → works in both Server (not-found) and Client (error) boundaries.
   Actions (buttons / links) are passed as children. */
export default function FriendlyMessage({ emoji, title, text, children }) {
  return (
    <div
      dir="rtl"
      style={{
        minHeight: '100dvh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
        textAlign: 'center', padding: '32px 24px',
        background: 'linear-gradient(160deg,#FAF7F2,#F4EFE6)',
      }}
    >
      <style>{`@keyframes aremFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }`}</style>

      <div style={{ fontSize: '4.4rem', lineHeight: 1, animation: 'aremFloat 2.4s ease-in-out infinite' }}>
        {emoji}
      </div>
      <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#1A2B4A', textWrap: 'balance' }}>
        {title}
      </h1>
      <p style={{ margin: '0 0 8px', fontSize: '1rem', color: '#5A6B84', maxWidth: '42ch', lineHeight: 1.85 }}>
        {text}
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        {children}
      </div>
    </div>
  );
}

/* Shared button styles — gold primary (blue text) per the Aarem golden rule, outline secondary */
export const primaryBtn = {
  background: '#E8B84B', color: '#1A2B4A', border: 'none',
  borderRadius: 14, padding: '13px 30px', fontWeight: 800, fontSize: '1rem',
  cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none', display: 'inline-block',
  boxShadow: '0 4px 14px rgba(232,184,75,.4)',
};

export const outlineBtn = {
  background: 'transparent', color: '#1A2B4A', border: '2px solid #1A2B4A',
  borderRadius: 14, padding: '11px 26px', fontWeight: 800, fontSize: '1rem',
  cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none', display: 'inline-block',
};
