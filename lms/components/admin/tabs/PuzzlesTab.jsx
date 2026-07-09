'use client';

/* هذا المكوّن استُخرج حرفياً من lms/app/bogga/page.jsx (تفكيك الملف الأحادي).
   الحالة والمعالجات بقيت في الصفحة الأم وتصل هنا كـprops — سلوك مطابق 100%. */
export default function PuzzlesTab({
  puzzles, puzzlesLoading,
  openAddPuzzle, openEditPuzzle,
  handleTogglePuzzle, handleDeletePuzzle,
  showPuzzleForm, setShowPuzzleForm,
  editingPuzzle, puzzleForm, setPuzzleForm,
  puzzleFileRef, puzzleImgPrev,
  setPuzzleImgFile, setPuzzleImgPrev,
  handleSavePuzzle, puzzleSaving, puzzleMsg,
}) {
  return (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontWeight: 800, color: 'var(--primary)', margin: 0 }}>🧩 إدارة الأحاجي</h2>
                <button className="btn btn-primary" onClick={openAddPuzzle}>+ أحجية جديدة</button>
              </div>

              {puzzlesLoading ? (
                <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></div>
              ) : puzzles.length === 0 ? (
                <div className="alert alert-info">لا توجد أحاجي بعد — أضف أول أحجية!</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 18 }}>
                  {puzzles.map(pz => (
                    <div key={pz.id} className="card" style={{ padding: 0, overflow: 'hidden', border: pz.is_active ? '2px solid #6366F1' : '2px solid #e2e8f0' }}>
                      {/* Image preview — admin sees full image */}
                      <div style={{ position: 'relative', height: 160, background: pz.bg || 'linear-gradient(135deg,#667eea,#764ba2)', overflow: 'hidden' }}>
                        {pz.image_url ? (
                          <img src={pz.image_url} alt={pz.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '3.5rem', opacity: .5 }}>🖼️</span>
                          </div>
                        )}
                        <div style={{ position: 'absolute', top: 8, left: 8 }}>
                          <span style={{ background: pz.is_active ? '#6366F1' : '#94a3b8', color: '#fff', borderRadius: 8, padding: '2px 10px', fontSize: '.72rem', fontWeight: 700 }}>
                            {pz.is_active ? '✅ نشطة' : '⏸️ متوقفة'}
                          </span>
                        </div>
                        <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,.5)', color: '#fff', borderRadius: 8, padding: '2px 10px', fontSize: '.72rem', fontWeight: 700 }}>
                          {pz.cols}×{pz.rows} = {pz.cols * pz.rows} قطعة
                        </div>
                      </div>
                      <div style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 800, fontSize: '.95rem', color: '#1F2937', marginBottom: 4 }}>{pz.title || '—'}</div>
                        {pz.badge_name && <div style={{ fontSize: '.78rem', color: '#6B7280' }}>🏅 وسام: {pz.badge_icon} {pz.badge_name}</div>}
                        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                          <button className="btn btn-sm btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => openEditPuzzle(pz)}>✏️ تعديل</button>
                          <button className="btn btn-sm" style={{ background: pz.is_active ? '#FEF3C7' : '#D1FAE5', color: pz.is_active ? '#92400E' : '#065F46', border: 'none' }} onClick={() => handleTogglePuzzle(pz)}>
                            {pz.is_active ? '⏸️ إيقاف' : '▶️ تفعيل'}
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDeletePuzzle(pz.id)}>🗑️</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add/Edit Form Modal */}
              {showPuzzleForm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 700, padding: 16 }}
                  onClick={e => e.target === e.currentTarget && setShowPuzzleForm(false)}>
                  <div style={{ background: '#fff', borderRadius: 20, padding: '28px 24px', width: '100%', maxWidth: 480, direction: 'rtl', maxHeight: '90vh', overflowY: 'auto' }}>
                    <h3 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 20 }}>{editingPuzzle ? '✏️ تعديل الأحجية' : '+ أحجية جديدة'}</h3>
                    <form onSubmit={handleSavePuzzle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div className="form-group">
                        <label className="form-label">عنوان الأحجية *</label>
                        <input className="form-input" required value={puzzleForm.title} onChange={e => setPuzzleForm(p => ({ ...p, title: e.target.value }))} placeholder="مثال: فهيم في الغابة" />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group">
                          <label className="form-label">أعمدة الشبكة</label>
                          <select className="form-input" value={puzzleForm.cols} onChange={e => setPuzzleForm(p => ({ ...p, cols: Number(e.target.value) }))}>
                            {[2,3,4,5].map(n => <option key={n} value={n}>{n} أعمدة</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">صفوف الشبكة</label>
                          <select className="form-input" value={puzzleForm.rows} onChange={e => setPuzzleForm(p => ({ ...p, rows: Number(e.target.value) }))}>
                            {[2,3,4,5].map(n => <option key={n} value={n}>{n} صفوف</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">صورة الأحجية (يكتشفها الطالب)</label>
                        <div style={{ border: '2px dashed #C7D2FE', borderRadius: 12, padding: 16, textAlign: 'center', cursor: 'pointer', background: '#F8FAFF' }}
                          onClick={() => puzzleFileRef.current?.click()}>
                          {puzzleImgPrev ? (
                            <img src={puzzleImgPrev} alt="preview" style={{ maxHeight: 140, maxWidth: '100%', borderRadius: 10, objectFit: 'cover' }} />
                          ) : (
                            <div style={{ color: '#6B7280', fontSize: '.85rem' }}>🖼️ اضغط لرفع صورة<br /><span style={{ fontSize: '.75rem' }}>PNG, JPG (حتى 4MB)</span></div>
                          )}
                        </div>
                        <input ref={puzzleFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          setPuzzleImgFile(f);
                          setPuzzleImgPrev(URL.createObjectURL(f));
                        }} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12 }}>
                        <div className="form-group">
                          <label className="form-label">اسم وسام الإنجاز</label>
                          <input className="form-input" value={puzzleForm.badge_name} onChange={e => setPuzzleForm(p => ({ ...p, badge_name: e.target.value }))} placeholder="بطل الأحجية" />
                        </div>
                        <div className="form-group">
                          <label className="form-label">رمز الوسام</label>
                          <input className="form-input" value={puzzleForm.badge_icon} onChange={e => setPuzzleForm(p => ({ ...p, badge_icon: e.target.value }))} style={{ width: 70, textAlign: 'center', fontSize: '1.3rem' }} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input type="checkbox" id="pz-active" checked={puzzleForm.is_active} onChange={e => setPuzzleForm(p => ({ ...p, is_active: e.target.checked }))} />
                        <label htmlFor="pz-active" style={{ fontWeight: 600, cursor: 'pointer' }}>أحجية نشطة (تظهر للطلاب)</label>
                      </div>
                      {puzzleMsg && <div className={`alert alert-${puzzleMsg.ok ? 'success' : 'error'}`}>{puzzleMsg.text}</div>}
                      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                        <button type="submit" className="btn btn-primary" disabled={puzzleSaving} style={{ flex: 1, justifyContent: 'center' }}>
                          {puzzleSaving ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> جارٍ الحفظ...</> : '✅ حفظ'}
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={() => setShowPuzzleForm(false)}>إلغاء</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
  );
}
