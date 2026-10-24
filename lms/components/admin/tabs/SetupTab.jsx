'use client';
import { SETUP_SQL } from '../shared';

/* هذا المكوّن استُخرج حرفياً من lms/app/bogga/page.jsx (تفكيك الملف الأحادي).
   الحالة والمعالجات بقيت في الصفحة الأم وتصل هنا كـprops — سلوك مطابق 100%. */
export default function SetupTab({
  lang, tr, isSuperAdmin,
  promoting, promoMsg, handlePromote,
  sheetsUrl, setSheetsUrl,
  sheetsUrlInput, setSheetsUrlInput,
  sheetsSaved, setSheetsSaved,
  copied, copySetupSql,
}) {
  return (
            <div>
              {!isSuperAdmin && (
                <div className="card" style={{ marginBottom: 28, border: '2px solid #F5A623', background: '#fffbf0' }}>
                  <h3 style={{ fontWeight: 800, color: '#b56a00', marginBottom: 10, fontSize: '1.1rem' }}>{tr('admin.setup.promoteTitle')}</h3>
                  <p style={{ color: '#64748b', fontSize: '.9rem', lineHeight: 1.7, marginBottom: 16 }}>{tr('admin.setup.promoteDesc')}</p>
                  {promoMsg && <div className={`alert alert-${promoMsg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: 14 }}>{promoMsg.text}</div>}
                  <button onClick={handlePromote} disabled={promoting} className="btn btn-accent btn-lg" style={{ gap: 10 }}>
                    {promoting ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2, borderTopColor: '#7A3800', borderColor: 'rgba(122,56,0,.2)' }} />{tr('admin.setup.promoting')}</> : tr('admin.setup.promoteBtn')}
                  </button>
                </div>
              )}
              {isSuperAdmin && (
                <>
                  {/* Google Sheet URL */}
                  <div className="card" style={{ marginBottom: 28 }}>
                    <h3 style={{ fontWeight: 800, color: '#1a7c40', marginBottom: 10, fontSize: '1.05rem' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ verticalAlign: 'middle', marginLeft: 6 }}><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H7v-2h5v2zm5-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                      {lang === 'ar' ? 'رابط Google Sheet للنتائج' : 'Google Sheet URL for Results'}
                    </h3>
                    <p style={{ color: '#64748b', fontSize: '.88rem', marginBottom: 12 }}>
                      {lang === 'ar' ? 'أضف رابط الجدول ليظهر زر الفتح السريع في تبويب النتائج.' : 'Add the sheet URL to show a quick-open button in the Results tab.'}
                    </p>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <input
                        className="form-input" style={{ margin: 0, flex: 1, direction: 'ltr', fontSize: '.88rem' }}
                        type="url"
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                        value={sheetsUrlInput}
                        onChange={e => setSheetsUrlInput(e.target.value)}
                      />
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          localStorage.setItem('admin_sheets_url', sheetsUrlInput);
                          setSheetsUrl(sheetsUrlInput);
                          setSheetsSaved(true);
                          setTimeout(() => setSheetsSaved(false), 2000);
                        }}
                      >
                        {sheetsSaved ? (lang === 'ar' ? '✓ تم الحفظ' : '✓ Saved') : (lang === 'ar' ? 'حفظ' : 'Save')}
                      </button>
                      {sheetsUrl && (
                        <a href={sheetsUrl} target="_blank" rel="noopener noreferrer"
                          className="btn btn-sm"
                          style={{ background: 'var(--accent)', color: 'var(--primary)', fontWeight: 800, textDecoration: 'none' }}>
                          {lang === 'ar' ? 'فتح' : 'Open'}
                        </a>
                      )}
                    </div>
                  </div>

                  <h2 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 16 }}>{tr('admin.setup.title')}</h2>
                  <div className="alert alert-info" style={{ marginBottom: 20 }}>
                    {tr('admin.setup.hint')}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <pre style={{ background: '#1a1a2e', color: '#e2e8f0', borderRadius: 14, padding: '24px 20px', fontSize: '.82rem', lineHeight: 1.8, overflowX: 'auto', whiteSpace: 'pre-wrap', fontFamily: "'Courier New', monospace" }}>
                      {SETUP_SQL}
                    </pre>
                    <button onClick={copySetupSql} className="btn btn-sm"
                      style={{ position: 'absolute', top: 12, left: 12, background: copied ? 'var(--success)' : 'rgba(255,255,255,.15)', color: '#fff', border: 'none' }}>
                      {copied ? tr('admin.setup.copied') : tr('admin.setup.copy')}
                    </button>
                  </div>
                </>
              )}
            </div>
  );
}
