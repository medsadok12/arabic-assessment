'use client';

/* هذا المكوّن استُخرج حرفياً من lms/app/bogga/page.jsx (تفكيك الملف الأحادي).
   الحالة والمعالجات بقيت في الصفحة الأم وتصل هنا كـprops — سلوك مطابق 100%. */
export default function TeachersMgmtTab({
  lang, tr,
  usersList, usersLoading,
  usersSearch, setUsersSearch,
  usersRoleFilter, setUsersRoleFilter,
  loadUsers, handleBulkReset, bulkResetting,
  editingUser, setEditingUser,
  handleUpdateName, savingUserId,
  handleResetPassword, resettingPwdId,
  handleDeleteUser, deletingUserId,
}) {
            const ROLE_BADGES = {
              teacher:    { label: tr('admin.users.teacher'),    bg: '#dcfce7', color: '#166534' },
              supervisor: { label: tr('admin.users.supervisor'), bg: '#ede9fe', color: '#6d28d9' },
              admin:      { label: tr('admin.users.admin'),      bg: '#fef3c7', color: '#92400e' },
            };
            const STAFF_ROLES = ['teacher', 'supervisor', 'admin'];
            const filtered = usersList
              .filter(u => STAFF_ROLES.includes(u.role))
              .filter(u => usersRoleFilter === 'all' || u.role === usersRoleFilter)
              .filter(u => {
                const q = usersSearch.trim().toLowerCase();
                return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
              });
            const staffCount = usersList.filter(u => STAFF_ROLES.includes(u.role)).length;

            return (
              <div>
                <div style={{ marginBottom: 20 }}>
                  <h2 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 4 }}>
                    👨‍🏫 {lang === 'ar' ? 'إدارة المعلمين والمشرفين' : 'Teachers & Supervisors'}
                  </h2>
                  <p style={{ color: 'var(--muted)', fontSize: '.88rem' }}>
                    {lang === 'ar' ? `${staffCount} عضو في الفريق التعليمي` : `${staffCount} staff members`}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input className="form-input" style={{ flex: '1 1 220px', margin: 0 }}
                    placeholder={lang === 'ar' ? 'بحث بالاسم أو البريد…' : 'Search by name or email…'}
                    value={usersSearch} onChange={e => setUsersSearch(e.target.value)} />
                  {['all', 'teacher', 'supervisor', 'admin'].map(r => (
                    <button key={r} onClick={() => setUsersRoleFilter(r)}
                      style={{
                        padding: '7px 16px', borderRadius: 20, border: '1.5px solid var(--border)',
                        fontWeight: 600, fontSize: '.82rem', cursor: 'pointer',
                        background: usersRoleFilter === r ? 'var(--primary)' : '#fff',
                        color:      usersRoleFilter === r ? '#fff' : '#334155',
                        transition: 'all .15s',
                      }}>
                      {r === 'all'          ? (lang === 'ar' ? 'الكل' : 'All')
                       : r === 'teacher'    ? (lang === 'ar' ? 'المعلمون' : 'Teachers')
                       : r === 'supervisor' ? (lang === 'ar' ? 'المرشدون' : 'Supervisors')
                       :                     (lang === 'ar' ? 'المساعدون' : 'Asst. Admins')}
                      {r !== 'all' && (
                        <span style={{ marginRight: 5, opacity: .65 }}>
                          ({usersList.filter(u => u.role === r).length})
                        </span>
                      )}
                    </button>
                  ))}
                  <button onClick={loadUsers} style={{ background: '#eef5ff', color: 'var(--primary)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '7px 14px', fontWeight: 600, fontSize: '.82rem', cursor: 'pointer' }}>
                    🔄 {lang === 'ar' ? 'تحديث' : 'Refresh'}
                  </button>
                  {usersList.filter(u => STAFF_ROLES.includes(u.role) && !u.password).length > 0 && (
                    <button onClick={handleBulkReset} disabled={bulkResetting}
                      title={lang === 'ar' ? 'يعيد ضبط كلمات سر الحسابات التي لم تُعرض كلمة سرها بعد' : 'Resets passwords for accounts without a stored password'}
                      style={{
                        background: bulkResetting ? '#f1f5f9' : '#fffbeb', color: bulkResetting ? '#94a3b8' : '#92400e',
                        border: '1.5px solid #fde68a', borderRadius: 10, padding: '7px 14px',
                        fontWeight: 700, fontSize: '.82rem', cursor: bulkResetting ? 'default' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}>
                      {bulkResetting
                        ? (lang === 'ar' ? '⏳ جارٍ الكشف…' : '⏳ Processing…')
                        : (lang === 'ar'
                            ? `🔑 كشف كلمات السر (${usersList.filter(u => STAFF_ROLES.includes(u.role) && !u.password).length})`
                            : `🔑 Reveal Passwords (${usersList.filter(u => STAFF_ROLES.includes(u.role) && !u.password).length})`)}
                    </button>
                  )}
                </div>

                {usersLoading ? (
                  <div style={{ textAlign: 'center', padding: 48 }}><span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} /></div>
                ) : filtered.length === 0 ? (
                  <div className="empty-state card"><span className="empty-icon">👨‍🏫</span><p>{lang === 'ar' ? 'لا يوجد معلمون أو مشرفون' : 'No teachers or supervisors found'}</p></div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {filtered.map(u => {
                      const badge     = ROLE_BADGES[u.role] ?? ROLE_BADGES.teacher;
                      const isEditing = editingUser?.id === u.id;
                      const fmtDT = iso => iso ? new Date(iso).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'medium' }) : '—';
                      const dateJoined = fmtDT(u.created_at);
                      return (
                        <div key={u.id} style={{ background: '#fff', borderRadius: 16, border: '1.5px solid var(--border)', padding: '14px 18px', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', boxShadow: '0 1px 6px rgba(24,95,165,.05)' }}>
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt={u.name} style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0, objectFit: 'cover', border: '2px solid var(--border)' }} />
                          ) : (
                            <div style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0, background: badge.bg, color: badge.color, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                              {(u.name ?? '?')[0].toUpperCase()}
                            </div>
                          )}
                          <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                            {isEditing ? (
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                                <input className="form-input" style={{ margin: 0, padding: '5px 10px', fontSize: '.9rem', width: 160 }}
                                  value={editingUser.name} onChange={e => setEditingUser(p => ({ ...p, name: e.target.value }))} autoFocus />
                                <button onClick={() => handleUpdateName(u.id)} disabled={savingUserId === u.id} className="btn btn-sm btn-primary" style={{ padding: '5px 12px' }}>
                                  {savingUserId === u.id ? <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> : (lang === 'ar' ? 'حفظ' : 'Save')}
                                </button>
                                <button onClick={() => setEditingUser(null)} className="btn btn-sm btn-ghost" style={{ padding: '5px 8px' }}>✕</button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 700, fontSize: '.97rem', color: '#1e293b' }}>{u.name}</span>
                                <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: '.72rem', fontWeight: 700, background: badge.bg, color: badge.color, flexShrink: 0 }}>{badge.label}</span>
                                {(() => {
                                  const online = u.last_seen && (Date.now() - new Date(u.last_seen).getTime()) < 120_000;
                                  return (
                                    <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: '.72rem', fontWeight: 700, flexShrink: 0, background: online ? '#dcfce7' : '#f1f5f9', color: online ? '#166534' : '#64748b' }}>
                                      {online ? (lang === 'ar' ? '🟢 متصل' : '🟢 Online') : (lang === 'ar' ? '⚫ غير متصل' : '⚫ Offline')}
                                    </span>
                                  );
                                })()}
                              </div>
                            )}
                            <div dir="ltr" style={{ textAlign: lang === 'ar' ? 'right' : 'left', color: '#475569', fontSize: '.85rem', marginBottom: 3 }}>{u.email}</div>
                            <div style={{ color: '#94a3b8', fontSize: '.78rem', lineHeight: 1.7 }}>
                              📅 {lang === 'ar' ? 'انضمام:' : 'Joined:'} {dateJoined}
                              {u.last_sign_in && <><br />🔑 {lang === 'ar' ? 'آخر دخول:' : 'Last in:'} {fmtDT(u.last_sign_in)}</>}
                              {u.last_logout  && <><br />🚪 {lang === 'ar' ? 'آخر خروج:' : 'Last out:'} {fmtDT(u.last_logout)}</>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flexShrink: 0 }}>
                            {u.password && (
                              <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 9, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontFamily: 'monospace', fontSize: '.82rem', fontWeight: 700, color: '#166534', letterSpacing: 1 }}>{u.password}</span>
                                <button onClick={() => navigator.clipboard.writeText(u.password)}
                                  title={lang === 'ar' ? 'نسخ' : 'Copy'}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.85rem', padding: 0, lineHeight: 1 }}>📋</button>
                              </div>
                            )}
                            <button onClick={() => handleResetPassword(u.id)} disabled={resettingPwdId === u.id}
                              style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#fffbeb', color: '#92400e', border: '1.5px solid #fde68a', borderRadius: 9, padding: '6px 12px', fontWeight: 600, fontSize: '.8rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                              {resettingPwdId === u.id ? <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> : '🔑'} {lang === 'ar' ? 'إعادة كلمة السر' : 'Reset Password'}
                            </button>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {!isEditing && (
                                <button onClick={() => setEditingUser({ id: u.id, name: u.name })}
                                  style={{ flex: 1, background: '#eef5ff', color: '#185FA5', border: '1.5px solid #bfdbfe', borderRadius: 9, padding: '5px 10px', fontWeight: 600, fontSize: '.8rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                  ✏️ {lang === 'ar' ? 'تعديل' : 'Edit'}
                                </button>
                              )}
                              <button onClick={() => handleDeleteUser(u.id, u.name)} disabled={deletingUserId === u.id}
                                style={{ flex: 1, background: '#fee2e2', color: '#b91c1c', border: '1.5px solid #fca5a5', borderRadius: 9, padding: '5px 10px', fontWeight: 600, fontSize: '.8rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                {deletingUserId === u.id ? <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> : `🗑️ ${lang === 'ar' ? 'حذف' : 'Delete'}`}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
}
