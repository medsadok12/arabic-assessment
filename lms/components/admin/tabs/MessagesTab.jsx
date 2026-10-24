'use client';

/* هذا المكوّن استُخرج حرفياً من lms/app/bogga/page.jsx (تفكيك الملف الأحادي).
   الحالة والمعالجات بقيت في الصفحة الأم وتصل هنا كـprops — سلوك مطابق 100%. */
export default function MessagesTab({ lang, parentMessages, msgsLoaded, markMsgRead, setParentMessages }) {
  return (
            <div>
              <div style={{ marginBottom: 22 }}>
                <h2 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 4 }}>
                  📩 {lang === 'ar' ? 'رسائل الأولياء' : 'Parent Messages'}
                  {parentMessages.filter(m => !m.is_read).length > 0 && (
                    <span style={{ background: '#dc2626', color: '#fff', fontSize: '.75rem',
                      borderRadius: 20, padding: '2px 9px', marginRight: 10, fontWeight: 700 }}>
                      {parentMessages.filter(m => !m.is_read).length} {lang === 'ar' ? 'جديدة' : 'new'}
                    </span>
                  )}
                </h2>
                <p style={{ color: 'var(--muted)', fontSize: '.88rem' }}>
                  {lang === 'ar' ? 'رسائل أولياء الأمور المُرسَلة عبر الموقع' : 'Messages sent by parents through the website'}
                </p>
              </div>
              {!msgsLoaded ? (
                <div style={{ textAlign:'center', padding:'48px 0', color:'var(--muted)' }}>جارٍ التحميل...</div>
              ) : parentMessages.length === 0 ? (
                <div style={{ textAlign:'center', padding:'56px 24px', background:'#fff',
                  borderRadius:16, border:'1.5px solid var(--border)' }}>
                  <div style={{ fontSize:'2.5rem', marginBottom:10 }}>📭</div>
                  <p style={{ color:'var(--muted)', fontWeight:600 }}>
                    {lang === 'ar' ? 'لا توجد رسائل بعد' : 'No messages yet'}
                  </p>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {parentMessages.map(m => (
                    <div key={m.id} style={{
                      background:'#fff', borderRadius:14,
                      border:`1.5px solid ${m.is_read ? 'var(--border)' : '#c4b5fd'}`,
                      padding:'16px 20px',
                      borderRight:`4px solid ${m.is_read ? '#e2e8f0' : '#7c3aed'}`,
                      opacity: m.is_read ? .8 : 1,
                    }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8 }}>
                        <div>
                          <div style={{ fontWeight:800, fontSize:'.97rem', color:'#1e293b' }}>
                            {m.is_read ? '' : '🔵 '}{m.parent_name}
                            {m.student_name && (
                              <span style={{ fontWeight:600, color:'#7c3aed', fontSize:'.85rem', marginRight:8 }}>
                                — {lang === 'ar' ? 'طالب:' : 'student:'} {m.student_name}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize:'.8rem', color:'#94a3b8', marginTop:3 }}>
                            {new Date(m.created_at).toLocaleString('en-GB', { dateStyle:'medium', timeStyle:'short' })}
                            {m.phone && <span style={{ marginRight:12 }}>📞 <a href={`tel:${m.phone}`} style={{ color:'var(--primary)' }}>{m.phone}</a></span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          {!m.is_read && (
                            <button onClick={() => markMsgRead(m.id)}
                              style={{ background:'#f3f0ff', border:'none', borderRadius:8,
                                padding:'5px 12px', fontSize:'.78rem', fontWeight:700,
                                color:'#7c3aed', cursor:'pointer' }}>
                              ✓ {lang === 'ar' ? 'تمّ الاطلاع' : 'Mark read'}
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (!window.confirm(lang === 'ar' ? 'هل تريد حذف هذه الرسالة؟' : 'Delete this message?')) return;
                              fetch('/api/contact/supervisor', {
                                method: 'DELETE', headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: m.id }),
                              });
                              setParentMessages(prev => prev.filter(x => x.id !== m.id));
                            }}
                            style={{ background:'#fee2e2', border:'none', borderRadius:8,
                              padding:'5px 12px', fontSize:'.78rem', fontWeight:700,
                              color:'#b91c1c', cursor:'pointer' }}>
                            🗑 {lang === 'ar' ? 'حذف' : 'Delete'}
                          </button>
                        </div>
                      </div>
                      <div style={{ marginTop:12, padding:'12px 14px', background:'#fafafa',
                        borderRadius:10, fontSize:'.9rem', color:'#334155', lineHeight:1.7,
                        borderRight:'3px solid #e2e8f0' }}>
                        {m.message}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
  );
}
