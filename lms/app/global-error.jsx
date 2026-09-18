'use client';

/* Catches errors thrown in the root layout itself. It replaces the whole document,
   so it must render its own <html>/<body> and cannot rely on globals.css or the
   layout font — all styles are inlined, with a system Arabic font fallback. */
export default function GlobalError({ error, reset }) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0 }}>
        <div style={{
          minHeight: '100dvh',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16,
          textAlign: 'center', padding: '32px 24px',
          background: '#F4EFE6',
          fontFamily: "'Cairo','Tajawal','Segoe UI',system-ui,Tahoma,sans-serif",
        }}>
          <div style={{ fontSize: '4.4rem', lineHeight: 1 }}>🐣</div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#1A2B4A' }}>
            يبدو أنّ هناك عثرةً صغيرة!
          </h1>
          <p style={{ margin: '0 0 8px', fontSize: '1rem', color: '#5A6B84', maxWidth: '42ch', lineHeight: 1.85 }}>
            لا تقلق — جرّب تحديثَ الصفحة وستسير الأمور 💪
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => reset()}
              style={{
                background: '#E8B84B', color: '#1A2B4A', border: 'none',
                borderRadius: 14, padding: '13px 30px', fontWeight: 800, fontSize: '1rem',
                cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 4px 14px rgba(232,184,75,.4)',
              }}
            >
              🔄 حاوِل مرّةً أخرى
            </button>
            <a
              href="/"
              style={{
                background: 'transparent', color: '#1A2B4A', border: '2px solid #1A2B4A',
                borderRadius: 14, padding: '11px 26px', fontWeight: 800, fontSize: '1rem',
                textDecoration: 'none', display: 'inline-block',
              }}
            >
              🏠 الصفحة الرئيسية
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
