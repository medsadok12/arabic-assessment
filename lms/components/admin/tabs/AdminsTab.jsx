'use client';
import { Fragment } from 'react';
import { CONTROLLABLE, TAB_NAMES, TAB_NAMES_EN } from '../shared';

/* هذا المكوّن استُخرج حرفياً من lms/app/bogga/page.jsx (تفكيك الملف الأحادي).
   الحالة والمعالجات بقيت في الصفحة الأم وتصل هنا كـprops — سلوك مطابق 100%. */
export default function AdminsTab({
  lang, tr,
  admins, adminsLoading,
  adminMsg, setAdminMsg, setShowAddModal,
  revealedPwds, togglePwd,
  getOnlineInfo, openActivityModal,
  toggleAdminPermsPanel, openPermsFor,
  permsLoading, allPerms, togglePerm,
  handleSuspendAdmin, suspendingId,
  handleDeleteAdmin, deletingId,
  supervisors, supervisorsLoading,
  supervisorMsg, setSupervisorMsg, setShowAddSupervisor,
  handleSuspendSupervisor, suspendingSupervisorId,
  handleDeleteSupervisor, deletingSupervisorId,
}) {
  return (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h2 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 4 }}>👑 {tr('admin.admins.title')}</h2>
                  <p style={{ color: 'var(--muted)', fontSize: '.88rem' }}>{lang === 'ar' ? `حد أقصى 2 — ${admins.length}/2 مستخدَم` : `Max 2 — ${admins.length}/2 used`}</p>
                </div>
                <button onClick={() => { setShowAddModal(true); setAdminMsg(null); }} disabled={admins.length >= 2} className="btn btn-primary" style={{ opacity: admins.length >= 2 ? .5 : 1 }}>
                  + {lang === 'ar' ? 'إضافة مشرف مساعد جديد' : 'Add New Assistant Admin'}
                </button>
              </div>
              {admins.length >= 2 && <div className="alert alert-info" style={{ marginBottom: 18 }}>⚠️ {lang === 'ar' ? 'وصلت للحد الأقصى (2 مشرفين).' : 'You have reached the maximum limit (2 admins).'}</div>}
              {adminMsg && (
                <div className={`alert alert-${adminMsg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: 18 }}>
                  {adminMsg.text}
                  {adminMsg.tempPassword && (
                    <div style={{ marginTop: 10, background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 8, padding: '10px 14px' }}>
                      <strong>{lang === 'ar' ? 'كلمة المرور المؤقتة:' : 'Temporary Password:'}</strong>
                      <span dir="ltr" style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.05rem', marginRight: 8, letterSpacing: '.08em', userSelect: revealedPwds.has('adminTempPwd') ? 'all' : 'none', color: '#b56a00' }}>
                        {revealedPwds.has('adminTempPwd') ? adminMsg.tempPassword : '••••••••••••'}
                      </span>
                      <button onClick={() => togglePwd('adminTempPwd')} title={revealedPwds.has('adminTempPwd') ? (lang === 'ar' ? 'إخفاء' : 'Hide') : (lang === 'ar' ? 'إظهار' : 'Show')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem', marginRight: 6, padding: 2 }}>{revealedPwds.has('adminTempPwd') ? '🙈' : '👁️'}</button>
                      <button onClick={() => navigator.clipboard.writeText(adminMsg.tempPassword)} title={lang === 'ar' ? 'نسخ' : 'Copy'} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: 2 }}>📋</button>
                    </div>
                  )}
                </div>
              )}
              {adminsLoading ? (
                <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} /></div>
              ) : admins.length === 0 ? (
                <div className="empty-state card"><span className="empty-icon">👥</span><p>{lang === 'ar' ? 'لا يوجد مشرفون مساعدون بعد' : 'No assistant admins yet'}</p></div>
              ) : (
                <div className="card table-scroll" style={{ padding: 0, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table className="data-table">
                    <thead><tr><th>{lang === 'ar' ? 'الاسم' : 'Name'}</th><th>{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</th><th>{lang === 'ar' ? 'حالة الحساب' : 'Account Status'}</th><th>{lang === 'ar' ? 'آخر نشاط' : 'Last Seen'}</th><th>{lang === 'ar' ? 'تاريخ الإنشاء' : 'Created'}</th><th>{lang === 'ar' ? 'إجراءات' : 'Actions'}</th></tr></thead>
                    <tbody>
                      {admins.map(a => {
                        const permsOpen = openPermsFor === a.id;
                        return (
                          <Fragment key={a.id}>
                            <tr>
                              <td style={{ fontWeight: 700 }}>{a.name}</td>
                              <td style={{ direction: 'ltr', textAlign: 'right' }}>{a.email}</td>
                              <td>
                                <span style={{
                                  padding: '3px 10px', borderRadius: 20, fontSize: '.75rem', fontWeight: 700,
                                  background: a.status === 'suspended' ? '#fee2e2' : '#dcfce7',
                                  color:      a.status === 'suspended' ? '#b91c1c' : '#166534',
                                }}>
                                  {a.status === 'suspended' ? (lang === 'ar' ? '🚫 موقوف' : '🚫 Suspended') : (lang === 'ar' ? '✅ مفعَّل' : '✅ Active')}
                                </span>
                              </td>
                              <td>
                                {(() => {
                                  const s = getOnlineInfo(a.id);
                                  return (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '.75rem', fontWeight: 700, color: s.color }}>
                                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, display: 'inline-block', flexShrink: 0 }} />
                                      {s.label}
                                    </span>
                                  );
                                })()}
                              </td>
                              <td style={{ color: 'var(--muted)', fontSize: '.83rem' }}>{new Date(a.created_at).toLocaleDateString(lang === 'ar' ? 'en-GB' : 'en-GB')}</td>
                              <td>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                  <button onClick={() => openActivityModal(a)} className="btn btn-sm" style={{ background: '#eef5ff', color: '#185FA5', border: 'none' }}>
                                    📊 {lang === 'ar' ? 'النشاط' : 'Activity'}
                                  </button>
                                  <button
                                    onClick={() => toggleAdminPermsPanel(a.id)}
                                    className="btn btn-sm"
                                    style={{ background: permsOpen ? '#7c3aed' : '#f3e8ff', color: permsOpen ? '#fff' : '#7c3aed', border: 'none', fontWeight: 700 }}
                                  >
                                    🔐 {lang === 'ar' ? 'الصلاحيات' : 'Permissions'}
                                  </button>
                                  <button
                                    onClick={() => handleSuspendAdmin(a.id, a.status ?? 'active')}
                                    disabled={suspendingId === a.id}
                                    className="btn btn-sm"
                                    style={{ background: a.status === 'suspended' ? '#1a7c40' : '#f59e0b', color: '#fff', border: 'none' }}
                                  >
                                    {suspendingId === a.id
                                      ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                                      : a.status === 'suspended'
                                        ? (lang === 'ar' ? '✅ تفعيل' : '✅ Activate')
                                        : (lang === 'ar' ? '⏸ إيقاف' : '⏸ Suspend')}
                                  </button>
                                  <button onClick={() => handleDeleteAdmin(a.id, a.name)} disabled={deletingId === a.id} className="btn btn-sm btn-danger">
                                    {deletingId === a.id ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : (lang === 'ar' ? '🗑️ حذف' : '🗑️ Delete')}
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {permsOpen && (
                              <tr>
                                <td colSpan={6} style={{ background: '#faf5ff', padding: '16px 20px', borderBottom: '2px solid #e9d5ff' }}>
                                  {permsLoading ? (
                                    <div style={{ textAlign: 'center', padding: 12 }}><span className="spinner" style={{ borderTopColor: '#7c3aed', borderColor: '#e9d5ff' }} /></div>
                                  ) : (
                                    <div>
                                      <p style={{ fontWeight: 700, color: '#7c3aed', marginBottom: 12, fontSize: '.9rem' }}>
                                        🔐 {lang === 'ar' ? `صلاحيات ${a.name}` : `${a.name}'s Permissions`}
                                      </p>
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                        {CONTROLLABLE.map(tabKey => {
                                          const isAllowed = allPerms[a.id]?.[tabKey] === true;
                                          return (
                                            <button
                                              key={tabKey}
                                              onClick={() => togglePerm(a.id, tabKey)}
                                              style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                                padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                                                fontFamily: 'inherit', fontWeight: 700, fontSize: '.82rem',
                                                background: isAllowed ? '#7c3aed' : '#e9d5ff',
                                                color: isAllowed ? '#fff' : '#7c3aed',
                                                transition: 'background .18s, color .18s',
                                              }}
                                            >
                                              <span style={{
                                                width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
                                                background: isAllowed ? '#a78bfa' : '#c4b5fd',
                                                border: isAllowed ? '2px solid #fff' : '2px solid #a78bfa',
                                                display: 'inline-block',
                                              }} />
                                              {lang === 'ar' ? TAB_NAMES[tabKey] : TAB_NAMES_EN[tabKey]}
                                              <span style={{ fontSize: '.75rem', opacity: .85 }}>{isAllowed ? '✓' : '✗'}</span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                      <p style={{ marginTop: 10, fontSize: '.78rem', color: '#9f67e4' }}>
                                        {lang === 'ar' ? '* اضغط على أي صلاحية لتفعيلها أو إيقافها' : '* Click any permission to toggle it'}
                                      </p>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── Supervisors sub-section ── */}
              <div style={{ marginTop: 36, borderTop: '2px solid var(--border)', paddingTop: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h2 style={{ fontWeight: 800, color: '#7c3aed', marginBottom: 4 }}>🧑‍💼 {lang === 'ar' ? 'المرشدون التربويون' : 'Educational Supervisors'}</h2>
                    <p style={{ color: 'var(--muted)', fontSize: '.88rem' }}>{lang === 'ar' ? 'لوحة متابعة — للقراءة فقط' : 'Monitoring dashboard — read-only access'}</p>
                  </div>
                  <button onClick={() => { setShowAddSupervisor(true); setSupervisorMsg(null); }} className="btn btn-primary" style={{ background: '#7c3aed' }}>
                    + {lang === 'ar' ? 'إضافة مرشد تربوي' : 'Add Supervisor'}
                  </button>
                </div>

                {supervisorMsg && (
                  <div className={`alert alert-${supervisorMsg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: 18 }}>
                    {supervisorMsg.text}
                    {supervisorMsg.tempPassword && (
                      <div style={{ marginTop: 10, background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 8, padding: '10px 14px' }}>
                        <strong>{lang === 'ar' ? 'كلمة المرور المؤقتة:' : 'Temporary Password:'}</strong>
                        <span dir="ltr" style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.05rem', marginRight: 8, letterSpacing: '.08em', userSelect: revealedPwds.has('supervisorTempPwd') ? 'all' : 'none', color: '#b56a00' }}>
                          {revealedPwds.has('supervisorTempPwd') ? supervisorMsg.tempPassword : '••••••••••••'}
                        </span>
                        <button onClick={() => togglePwd('supervisorTempPwd')} title={revealedPwds.has('supervisorTempPwd') ? (lang === 'ar' ? 'إخفاء' : 'Hide') : (lang === 'ar' ? 'إظهار' : 'Show')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem', marginRight: 6, padding: 2 }}>{revealedPwds.has('supervisorTempPwd') ? '🙈' : '👁️'}</button>
                        <button onClick={() => navigator.clipboard.writeText(supervisorMsg.tempPassword)} title={lang === 'ar' ? 'نسخ' : 'Copy'} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: 2 }}>📋</button>
                      </div>
                    )}
                  </div>
                )}

                {supervisorsLoading ? (
                  <div style={{ textAlign: 'center', padding: 32 }}><span className="spinner" style={{ borderTopColor: '#7c3aed', borderColor: 'var(--border)' }} /></div>
                ) : supervisors.length === 0 ? (
                  <div className="empty-state card"><span className="empty-icon">🧑‍💼</span><p>{lang === 'ar' ? 'لا يوجد مرشدون تربويون بعد' : 'No supervisors yet'}</p></div>
                ) : (
                  <div className="card table-scroll" style={{ padding: 0, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>{lang === 'ar' ? 'الاسم' : 'Name'}</th>
                          <th>{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</th>
                          <th>{lang === 'ar' ? 'حالة الحساب' : 'Status'}</th>
                          <th>{lang === 'ar' ? 'تاريخ الإنشاء' : 'Created'}</th>
                          <th>{lang === 'ar' ? 'إجراءات' : 'Actions'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {supervisors.map(s => (
                          <tr key={s.id}>
                            <td style={{ fontWeight: 700 }}>{s.name}</td>
                            <td style={{ direction: 'ltr', textAlign: 'right' }}>{s.email}</td>
                            <td>
                              <span style={{
                                padding: '3px 10px', borderRadius: 20, fontSize: '.75rem', fontWeight: 700,
                                background: s.status === 'suspended' ? '#fee2e2' : '#ede9fe',
                                color:      s.status === 'suspended' ? '#b91c1c' : '#6d28d9',
                              }}>
                                {s.status === 'suspended' ? (lang === 'ar' ? '🚫 موقوف' : '🚫 Suspended') : (lang === 'ar' ? '✅ مفعَّل' : '✅ Active')}
                              </span>
                            </td>
                            <td style={{ color: 'var(--muted)', fontSize: '.83rem' }}>{new Date(s.created_at).toLocaleDateString(lang === 'ar' ? 'en-GB' : 'en-GB')}</td>
                            <td>
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <button
                                  onClick={() => handleSuspendSupervisor(s.id, s.status ?? 'active')}
                                  disabled={suspendingSupervisorId === s.id}
                                  className="btn btn-sm"
                                  style={{ background: s.status === 'suspended' ? '#1a7c40' : '#f59e0b', color: '#fff', border: 'none' }}
                                >
                                  {suspendingSupervisorId === s.id
                                    ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                                    : s.status === 'suspended'
                                      ? (lang === 'ar' ? '✅ تفعيل' : '✅ Activate')
                                      : (lang === 'ar' ? '⏸ إيقاف' : '⏸ Suspend')}
                                </button>
                                <button onClick={() => handleDeleteSupervisor(s.id, s.name)} disabled={deletingSupervisorId === s.id} className="btn btn-sm btn-danger">
                                  {deletingSupervisorId === s.id ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : (lang === 'ar' ? '🗑️ حذف' : '🗑️ Delete')}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
  );
}
