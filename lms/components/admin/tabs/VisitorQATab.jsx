'use client';

/* هذا المكوّن استُخرج حرفياً من lms/app/bogga/page.jsx (تفكيك الملف الأحادي).
   الحالة والمعالجات بقيت في الصفحة الأم وتصل هنا كـprops — سلوك مطابق 100%. */
export default function VisitorQATab({
  lang, tr,
  visitorQA, qaLoading,
  setQaEditing, setQaForm, setQaMsg, setQaShowModal,
  toggleQAActive, handleDeleteQA, qaDeletingId,
}) {
  return (
            <div>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h2 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 6 }}>🤖 {tr('admin.visitor_qa.title')}</h2>
                  <p style={{ color: 'var(--muted)', fontSize: '.88rem', lineHeight: 1.6, maxWidth: 560 }}>
                    {lang === 'ar'
                      ? 'الأسئلة والإجابات التي تضيفها هنا يحفظها فهيم ويستخدمها تلقائياً للرد على زوار الموقع. كلما أضفت معلومات أكثر، كانت إجاباته أدق وأكثر إقناعاً.'
                      : 'The Q&A you add here is saved by Faheem and used automatically to answer website visitors. The more information you add, the more accurate and convincing his answers will be.'}
                  </p>
                </div>
                <button
                  onClick={() => { setQaEditing(null); setQaForm({ question: '', answer: '', sort_order: visitorQA.length }); setQaMsg(null); setQaShowModal(true); }}
                  className="btn btn-primary"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  + {lang === 'ar' ? 'إضافة سؤال وإجابة' : 'Add Question & Answer'}
                </button>
              </div>

              {/* Info banner */}
              <div style={{ background: '#eef5ff', borderRadius: 12, padding: '14px 18px', marginBottom: 22, display: 'flex', gap: 12, alignItems: 'flex-start', border: '1.5px solid #b3ccee' }}>
                <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>💡</span>
                <div style={{ fontSize: '.86rem', color: '#1a3a5c', lineHeight: 1.75 }}>
                  {lang === 'ar' ? (
                    <><strong>كيف يعمل:</strong> عند سؤال زائر فهيم، يبحث النظام في هذه القائمة ويُدرج الإجابات المناسبة في سياق الذكاء الاصطناعي.
                    السؤال المُدخَل لا يجب أن يطابق السؤال حرفياً — فهيم يفهم المعنى.
                    <br /><strong>نصيحة:</strong> أضف أسئلة عن الأسعار، الأعمار، المناهج، طريقة الدفع، والنادي الصيفي.</>
                  ) : (
                    <><strong>How it works:</strong> When a visitor asks Faheem, the system searches this list and injects relevant answers into the AI context.
                    The question doesn't need to match exactly — Faheem understands meaning.
                    <br /><strong>Tip:</strong> Add Q&A about pricing, age groups, curriculum, payment, and summer camp.</>
                  )}
                </div>
              </div>

              {/* SQL reminder */}
              <div style={{ background: '#fffbeb', borderRadius: 10, padding: '11px 16px', marginBottom: 22, fontSize: '.82rem', color: '#92400e', border: '1px solid #fde68a' }}>
                ⚠️ {lang === 'ar' ? <>تأكد من تشغيل SQL إنشاء جدول <code style={{ background: '#fff', padding: '1px 6px', borderRadius: 4 }}>faheem_visitor_qa</code> في Supabase (موجود في تبويب الإعداد).</> : <>Make sure to run the SQL for the <code style={{ background: '#fff', padding: '1px 6px', borderRadius: 4 }}>faheem_visitor_qa</code> table in Supabase (found in the Setup tab).</>}
              </div>

              {qaLoading ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} />
                </div>
              ) : visitorQA.length === 0 ? (
                <div className="empty-state card" style={{ padding: '48px 24px' }}>
                  <span className="empty-icon">🤖</span>
                  <p style={{ fontWeight: 700, marginBottom: 8 }}>{lang === 'ar' ? 'لا توجد أسئلة بعد' : 'No questions yet'}</p>
                  <p style={{ color: 'var(--muted)', fontSize: '.88rem' }}>{lang === 'ar' ? 'ابدأ بإضافة أول سؤال وإجابة لتزويد فهيم بمعلومات الأكاديمية' : 'Start by adding the first Q&A to give Faheem academy information'}</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {visitorQA.map((item, idx) => (
                    <div key={item.id} style={{
                      background: '#fff', borderRadius: 14, border: '1.5px solid var(--border)',
                      padding: '18px 20px', opacity: item.is_active ? 1 : .55,
                      transition: 'opacity .2s',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>

                        {/* Content */}
                        <div style={{ flex: '1 1 300px', minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span style={{ background: 'var(--primary-lt)', color: 'var(--primary)', borderRadius: 6, padding: '2px 10px', fontSize: '.75rem', fontWeight: 800 }}>
                              #{idx + 1}
                            </span>
                            {!item.is_active && (
                              <span style={{ background: '#f1f5f9', color: '#94a3b8', borderRadius: 6, padding: '2px 8px', fontSize: '.72rem', fontWeight: 700 }}>
                                {lang === 'ar' ? 'معطّل' : 'Inactive'}
                              </span>
                            )}
                          </div>
                          <div style={{ fontWeight: 800, color: 'var(--text)', marginBottom: 8, fontSize: '.95rem' }}>
                            ❓ {item.question}
                          </div>
                          <div style={{ color: '#475569', fontSize: '.88rem', lineHeight: 1.75, background: 'var(--bg)', borderRadius: 8, padding: '10px 14px' }}>
                            💬 {item.answer}
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                          <button
                            onClick={() => toggleQAActive(item)}
                            className="btn btn-sm"
                            style={{ background: item.is_active ? '#f0fdf4' : '#f1f5f9', color: item.is_active ? '#16a34a' : '#64748b', border: `1px solid ${item.is_active ? '#86efac' : '#cbd5e1'}` }}
                            title={item.is_active ? (lang === 'ar' ? 'انقر لتعطيل السؤال' : 'Click to deactivate') : (lang === 'ar' ? 'انقر لتفعيل السؤال' : 'Click to activate')}
                          >
                            {item.is_active ? (lang === 'ar' ? '✅ مفعّل' : '✅ Active') : (lang === 'ar' ? '⏸ معطّل' : '⏸ Inactive')}
                          </button>
                          <button
                            onClick={() => {
                              setQaEditing(item);
                              setQaForm({ question: item.question, answer: item.answer, sort_order: item.sort_order ?? idx });
                              setQaMsg(null);
                              setQaShowModal(true);
                            }}
                            className="btn btn-sm btn-outline"
                            style={{ color: 'var(--primary)', borderColor: 'var(--primary)' }}
                          >
                            ✏️ {lang === 'ar' ? 'تعديل' : 'Edit'}
                          </button>
                          <button
                            onClick={() => handleDeleteQA(item.id)}
                            disabled={qaDeletingId === item.id}
                            className="btn btn-sm btn-danger"
                          >
                            {qaDeletingId === item.id
                              ? <span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} />
                              : '🗑️'}
                          </button>
                        </div>

                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
  );
}
