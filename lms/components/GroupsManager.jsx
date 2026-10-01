'use client';

import { useState, useEffect, useCallback } from 'react';

export default function GroupsManager() {
  const [groups,        setGroups]        = useState([]);
  const [students,      setStudents]      = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [newName,       setNewName]       = useState('');
  const [creating,      setCreating]      = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [err,           setErr]           = useState('');

  const [dbReady, setDbReady] = useState(true);

  // Group edit state
  const [editingId,   setEditingId]   = useState(null);
  const [editingName, setEditingName] = useState('');
  const [savingEdit,  setSavingEdit]  = useState(false);

  // Delete loading states
  const [deletingGroupId,   setDeletingGroupId]   = useState(null);
  const [deletingStudentId, setDeletingStudentId] = useState(null);

  // Student edit modal state
  const [modal,        setModal]        = useState(null); // { user_id, name }
  const [modalName,    setModalName]    = useState('');
  const [modalEmail,   setModalEmail]   = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalErr,     setModalErr]     = useState('');
  const [savingStudent, setSavingStudent] = useState(false);

  const loadAll = useCallback(async () => {
    const [gRes, sRes] = await Promise.all([
      fetch('/api/admin/groups/list',     { method: 'POST', cache: 'no-store' }),
      fetch('/api/admin/groups/students', { method: 'POST', cache: 'no-store' }),
    ]);
    const [gData, sData] = await Promise.all([gRes.json(), sRes.json()]);
    if (gData.error?.includes('exist') || gData.error?.includes('relation') || gData.error?.includes('42P01')) {
      setDbReady(false);
      setLoading(false);
      return;
    }
    setGroups(gData.groups   ?? []);
    setStudents(sData.students ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setErr('');
    const res  = await fetch('/api/admin/groups/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    });
    const data = await res.json();
    if (data.error) setErr(data.error);
    else { setNewName(''); await loadAll(); }
    setCreating(false);
  }

  async function handleAssign(userId, groupId) {
    setStudents(prev =>
      prev.map(s => s.user_id === userId ? { ...s, group_id: groupId || null } : s)
    );
    await fetch('/api/admin/groups/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, groupId: groupId || null }),
    });
  }

  async function handleSaveRename(id) {
    if (!editingName.trim()) return;
    setSavingEdit(true);
    const res  = await fetch('/api/admin/groups/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name: editingName.trim() }),
    });
    const data = await res.json();
    if (data.error) { setErr(data.error); }
    else {
      setGroups(prev => prev.map(g => g.id === id ? { ...g, name: editingName.trim() } : g));
      setEditingId(null);
    }
    setSavingEdit(false);
  }

  async function handleDeleteGroup(id, name) {
    if (!window.confirm(`هل أنت متأكد من حذف مجموعة "${name}"؟\nسيتم إرجاع جميع الطلاب لحالة "غير معين".`)) return;
    setDeletingGroupId(id);
    const res  = await fetch('/api/admin/groups/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (data.error) setErr(data.error);
    else {
      if (selectedGroup === id) setSelectedGroup(null);
      await loadAll();
    }
    setDeletingGroupId(null);
  }

  async function handleDeleteStudent(userId, name) {
    if (!window.confirm(`هل أنت متأكد من حذف حساب الطالب "${name}" نهائياً؟\nسيتم حذف جميع بياناته وتقييماته ولا يمكن التراجع.`)) return;
    setDeletingStudentId(userId);
    const res  = await fetch('/api/admin/delete-student', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const data = await res.json();
    if (data.error) setErr(data.error);
    else setStudents(prev => prev.filter(s => s.user_id !== userId));
    setDeletingStudentId(null);
  }

  async function openEditModal(student) {
    setModal(student);
    setModalName(student.name);
    setModalEmail('');
    setModalErr('');
    setModalLoading(true);
    const res  = await fetch('/api/admin/get-student-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: student.user_id }),
    });
    const data = await res.json();
    setModalEmail(data.email ?? '');
    setModalLoading(false);
  }

  async function handleSaveStudent() {
    if (!modal) return;
    setSavingStudent(true);
    setModalErr('');
    const res  = await fetch('/api/admin/update-student', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: modal.user_id, name: modalName, email: modalEmail }),
    });
    const data = await res.json();
    if (data.error) {
      setModalErr(data.error);
    } else {
      setStudents(prev => prev.map(s =>
        s.user_id === modal.user_id ? { ...s, name: modalName.trim() || s.name } : s
      ));
      setModal(null);
    }
    setSavingStudent(false);
  }

  const groupName   = id => groups.find(g => g.id === id)?.name ?? '—';
  const memberCount = id => students.filter(s => s.group_id === id).length;
  const visible     = selectedGroup
    ? students.filter(s => s.group_id === selectedGroup)
    : students;

  if (!dbReady) return (
    <div className="dash-section">
      <div className="dash-section-title">📁 إدارة المجموعات</div>
      <div className="card" style={{ padding: 24 }}>
        <p style={{ marginBottom: 16, fontWeight: 600, color: 'var(--danger, #e74c3c)' }}>
          ⚠️ جداول المجموعات غير موجودة في قاعدة البيانات.
        </p>
        <p style={{ marginBottom: 16, color: 'var(--muted)' }}>
          شغّل الكود التالي مرة واحدة في Supabase SQL Editor:
        </p>
        <pre style={{
          background: '#1e1e2e', color: '#cdd6f4', padding: '16px 20px',
          borderRadius: 8, fontSize: '.82rem', overflowX: 'auto', lineHeight: 1.7,
          marginBottom: 20, direction: 'ltr', textAlign: 'left',
        }}>{`CREATE TABLE IF NOT EXISTS student_groups (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text        NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE student_groups DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS student_group_assignments (
  user_id    uuid        REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  group_id   uuid        REFERENCES student_groups(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE student_group_assignments DISABLE ROW LEVEL SECURITY;`}</pre>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a
            href="https://supabase.com/dashboard/project/uqspozzkzyytwwidojxv/sql/new"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            🔗 افتح Supabase SQL Editor
          </a>
          <button className="btn" onClick={() => { setDbReady(true); setLoading(true); loadAll(); }}>
            🔄 تحقق مجدداً
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="dash-section">
      <div className="dash-section-title">📁 إدارة المجموعات</div>

      {/* ── إنشاء مجموعة ── */}
      <form onSubmit={handleCreate} style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          className="form-input"
          style={{ flex: 1, minWidth: 200 }}
          placeholder="اسم المجموعة الجديدة..."
          value={newName}
          onChange={e => setNewName(e.target.value)}
          required
        />
        <button className="btn btn-primary" type="submit" disabled={creating}>
          {creating ? <span className="spinner" /> : '➕'} إنشاء مجموعة
        </button>
      </form>

      {err && <div className="alert alert-error" style={{ marginBottom: 12 }}>{err}</div>}

      {/* ── فلتر المجموعات مع أزرار التعديل والحذف ── */}
      {groups.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
          <span style={{ fontSize: '.8rem', color: 'var(--muted)', marginLeft: 4 }}>عرض:</span>
          <button
            onClick={() => setSelectedGroup(null)}
            style={{
              padding: '4px 14px', borderRadius: 20, fontSize: '.82rem', fontWeight: 600,
              cursor: 'pointer', border: 'none',
              background: !selectedGroup ? 'var(--primary)' : '#eee',
              color: !selectedGroup ? '#fff' : '#555',
            }}
          >
            كل الطلاب ({students.length})
          </button>

          {groups.map(g => (
            <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {editingId === g.id ? (
                <>
                  <input
                    className="form-input"
                    style={{ padding: '3px 10px', fontSize: '.82rem', minWidth: 120, height: 30 }}
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveRename(g.id); if (e.key === 'Escape') setEditingId(null); }}
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveRename(g.id)}
                    disabled={savingEdit}
                    title="حفظ"
                    style={{ background: '#27ae60', color: '#fff', border: 'none', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: '.8rem' }}
                  >
                    {savingEdit ? <span className="spinner" style={{ width: 12, height: 12 }} /> : '✓'}
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    title="إلغاء"
                    style={{ background: '#eee', border: 'none', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: '.8rem' }}
                  >
                    ✕
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setSelectedGroup(selectedGroup === g.id ? null : g.id)}
                    style={{
                      padding: '4px 14px', borderRadius: 20, fontSize: '.82rem', fontWeight: 600,
                      cursor: 'pointer', border: 'none',
                      background: selectedGroup === g.id ? '#27ae60' : '#eee',
                      color:      selectedGroup === g.id ? '#fff'    : '#555',
                    }}
                  >
                    📁 {g.name} ({memberCount(g.id)})
                  </button>
                  <button
                    onClick={() => { setEditingId(g.id); setEditingName(g.name); setErr(''); }}
                    title="تعديل الاسم"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.9rem', padding: '2px 4px', lineHeight: 1 }}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDeleteGroup(g.id, g.name)}
                    disabled={deletingGroupId === g.id}
                    title="حذف المجموعة"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.9rem', padding: '2px 4px', lineHeight: 1, opacity: deletingGroupId === g.id ? 0.4 : 1 }}
                  >
                    {deletingGroupId === g.id ? <span className="spinner" style={{ width: 12, height: 12 }} /> : '🗑️'}
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── جدول الطلاب ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>
          <span className="spinner" style={{ display: 'inline-block' }} />
        </div>
      ) : visible.length === 0 ? (
        <div className="empty-state card">
          <span className="empty-icon">👥</span>
          <p>{selectedGroup ? 'لا يوجد طلاب في هذه المجموعة' : 'لا يوجد طلاب مسجلون أجروا تقييماً بعد'}</p>
        </div>
      ) : (
        <div className="card table-scroll-wrapper" style={{ padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>اسم الطالب</th>
                <th>المجموعة الحالية</th>
                <th>تعيين / تغيير المجموعة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(s => (
                <tr key={s.user_id}>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td>
                    {s.group_id
                      ? <span className="badge badge-green">📁 {groupName(s.group_id)}</span>
                      : <span className="badge" style={{ background: '#f0f0f0', color: '#999' }}>غير مُعيَّن</span>
                    }
                  </td>
                  <td>
                    <select
                      className="form-input"
                      style={{ fontSize: '.85rem', padding: '5px 10px', minWidth: 150 }}
                      value={s.group_id ?? ''}
                      onChange={e => handleAssign(s.user_id, e.target.value)}
                    >
                      <option value="">— بدون مجموعة —</option>
                      {groups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <button
                      onClick={() => openEditModal(s)}
                      title="تعديل بيانات الطالب"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '1.1rem', padding: '2px 6px', borderRadius: 6,
                      }}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteStudent(s.user_id, s.name)}
                      disabled={deletingStudentId === s.user_id}
                      title="حذف حساب الطالب نهائياً"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '1.1rem', padding: '2px 6px', borderRadius: 6,
                        opacity: deletingStudentId === s.user_id ? 0.4 : 1,
                        transition: 'opacity .2s',
                      }}
                    >
                      {deletingStudentId === s.user_id ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '🗑️'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── مودال تعديل بيانات الطالب ── */}
      {modal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: 16,
          }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null); }}
        >
          <div className="card" style={{ padding: 28, minWidth: 340, maxWidth: 460, width: '100%' }}>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: 20 }}>
              ✏️ تعديل بيانات الطالب
            </div>

            {modalLoading ? (
              <div style={{ textAlign: 'center', padding: 24 }}>
                <span className="spinner" style={{ display: 'inline-block' }} />
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: '.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--muted)' }}>
                    الاسم الكامل
                  </label>
                  <input
                    className="form-input"
                    style={{ width: '100%' }}
                    value={modalName}
                    onChange={e => setModalName(e.target.value)}
                    placeholder="الاسم الكامل للطالب"
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: '.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--muted)' }}>
                    البريد الإلكتروني
                  </label>
                  <input
                    className="form-input"
                    style={{ width: '100%', direction: 'ltr', textAlign: 'left' }}
                    type="email"
                    value={modalEmail}
                    onChange={e => setModalEmail(e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>

                {modalErr && (
                  <div className="alert alert-error" style={{ marginBottom: 14 }}>{modalErr}</div>
                )}

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button
                    className="btn"
                    onClick={() => setModal(null)}
                    disabled={savingStudent}
                  >
                    إلغاء
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleSaveStudent}
                    disabled={savingStudent}
                  >
                    {savingStudent ? <span className="spinner" /> : '💾'} حفظ التغييرات
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
